const express = require('express');
const { z } = require('zod');
const prisma = require('../utils/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const raiseMaintenanceSchema = z.object({
  assetId: z.number(),
  issueDescription: z.string().min(5, 'Issue description must be at least 5 characters')
});

const assignTechSchema = z.object({
  technician: z.string().min(2, 'Technician name is required')
});

// @route   GET /api/maintenance
// @desc    Get all maintenance tickets
router.get('/', authenticateToken, async (req, res) => {
  let where = {};
  if (req.user.role === 'Employee') {
    where.raisedById = req.user.id;
  }

  try {
    const tickets = await prisma.maintenance.findMany({
      where,
      include: {
        asset: true,
        raisedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true } }
      },
      orderBy: { id: 'desc' }
    });

    return res.json(tickets);
  } catch (error) {
    console.error('Fetch maintenance tickets error:', error);
    return res.status(500).json({ error: 'Failed to fetch maintenance tickets' });
  }
});

// @route   POST /api/maintenance
// @desc    Raise a new maintenance request (Any role)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const data = raiseMaintenanceSchema.parse(req.body);

    const ticket = await prisma.maintenance.create({
      data: {
        assetId: data.assetId,
        raisedById: req.user.id,
        issueDescription: data.issueDescription,
        status: 'Pending'
      },
      include: { asset: true }
    });

    // Notify admins / managers
    const managers = await prisma.user.findMany({
      where: { role: { in: ['Admin', 'AssetManager'] } }
    });

    for (const m of managers) {
      await prisma.notification.create({
        data: {
          userId: m.id,
          type: 'maintenance',
          message: `New maintenance ticket raised by ${req.user.name} for asset "${ticket.asset.name}" (${ticket.asset.assetCode}).`
        }
      });
    }

    return res.status(201).json(ticket);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Raise maintenance request error:', error);
    return res.status(500).json({ error: 'Failed to raise maintenance ticket' });
  }
});

// @route   POST /api/maintenance/:id/approve
// @desc    Approve maintenance request -> Set asset status to UnderMaintenance (Admin & Asset Manager only)
router.post('/:id/approve', authenticateToken, requireRole(['Admin', 'AssetManager']), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ticket ID' });

  try {
    const ticket = await prisma.$transaction(async (tx) => {
      const dbTicket = await tx.maintenance.findUnique({
        where: { id },
        include: { asset: true }
      });

      if (!dbTicket || dbTicket.status !== 'Pending') {
        throw new Error('NOT_FOUND: Pending ticket not found.');
      }

      // 1. Update ticket status
      const updatedTicket = await tx.maintenance.update({
        where: { id },
        data: {
          status: 'Approved',
          approvedById: req.user.id
        }
      });

      // 2. Set Asset status to UnderMaintenance
      await tx.asset.update({
        where: { id: dbTicket.assetId },
        data: { status: 'UnderMaintenance' }
      });

      // 3. Notify requester
      await tx.notification.create({
        data: {
          userId: dbTicket.raisedById,
          type: 'maintenance',
          message: `Your maintenance ticket for asset "${dbTicket.asset.name}" has been approved.`
        }
      });

      return updatedTicket;
    });

    return res.json(ticket);
  } catch (error) {
    if (error.message.startsWith('NOT_FOUND:')) {
      return res.status(404).json({ error: error.message.replace('NOT_FOUND: ', '') });
    }
    console.error('Approve ticket error:', error);
    return res.status(500).json({ error: 'Failed to approve maintenance request.' });
  }
});

// @route   POST /api/maintenance/:id/assign
// @desc    Assign a technician to ticket -> Set status to TechnicianAssigned (Admin & Asset Manager only)
router.post('/:id/assign', authenticateToken, requireRole(['Admin', 'AssetManager']), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ticket ID' });

  try {
    const { technician } = assignTechSchema.parse(req.body);

    const ticket = await prisma.maintenance.findUnique({
      where: { id }
    });

    if (!ticket || (ticket.status !== 'Approved' && ticket.status !== 'Pending')) {
      return res.status(400).json({ error: 'Ticket must be in Approved or Pending status to assign technician.' });
    }

    const updated = await prisma.maintenance.update({
      where: { id },
      data: {
        status: 'TechnicianAssigned',
        technicianAssigned: technician
      }
    });

    return res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Assign technician error:', error);
    return res.status(500).json({ error: 'Failed to assign technician.' });
  }
});

// @route   POST /api/maintenance/:id/progress
// @desc    Move ticket status from TechnicianAssigned to InProgress (Admin & Asset Manager only)
router.post('/:id/progress', authenticateToken, requireRole(['Admin', 'AssetManager']), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ticket ID' });

  try {
    const ticket = await prisma.maintenance.findUnique({ where: { id } });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const updated = await prisma.maintenance.update({
      where: { id },
      data: { status: 'InProgress' }
    });

    return res.json(updated);
  } catch (error) {
    console.error('Progress ticket error:', error);
    return res.status(500).json({ error: 'Failed to update ticket status.' });
  }
});

// @route   POST /api/maintenance/:id/resolve
// @desc    Resolve maintenance ticket -> Restore asset status to Available (Admin & Asset Manager only)
router.post('/:id/resolve', authenticateToken, requireRole(['Admin', 'AssetManager']), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ticket ID' });

  try {
    const ticket = await prisma.$transaction(async (tx) => {
      const dbTicket = await tx.maintenance.findUnique({
        where: { id },
        include: { asset: true }
      });

      if (!dbTicket) {
        throw new Error('NOT_FOUND: Ticket not found.');
      }

      // 1. Update ticket
      const updatedTicket = await tx.maintenance.update({
        where: { id },
        data: {
          status: 'Resolved',
          resolvedAt: new Date()
        }
      });

      // 2. Revert Asset back to Available status
      await tx.asset.update({
        where: { id: dbTicket.assetId },
        data: { status: 'Available' }
      });

      // 3. Notify requester
      await tx.notification.create({
        data: {
          userId: dbTicket.raisedById,
          type: 'maintenance',
          message: `Maintenance for asset "${dbTicket.asset.name}" has been completed and is now Available.`
        }
      });

      return updatedTicket;
    });

    return res.json(ticket);
  } catch (error) {
    if (error.message.startsWith('NOT_FOUND:')) {
      return res.status(404).json({ error: error.message.replace('NOT_FOUND: ', '') });
    }
    console.error('Resolve ticket error:', error);
    return res.status(500).json({ error: 'Failed to resolve maintenance request.' });
  }
});

// @route   POST /api/maintenance/:id/reject
// @desc    Reject maintenance request (Admin & Asset Manager only)
router.post('/:id/reject', authenticateToken, requireRole(['Admin', 'AssetManager']), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ticket ID' });

  try {
    const ticket = await prisma.maintenance.findUnique({ where: { id } });
    if (!ticket || ticket.status !== 'Pending') {
      return res.status(404).json({ error: 'Pending ticket not found.' });
    }

    const updated = await prisma.maintenance.update({
      where: { id },
      data: { status: 'Rejected' }
    });

    await prisma.notification.create({
      data: {
        userId: ticket.raisedById,
        type: 'maintenance',
        message: `Your maintenance ticket request for asset ID ${ticket.assetId} has been rejected.`
      }
    });

    return res.json(updated);
  } catch (error) {
    console.error('Reject ticket error:', error);
    return res.status(500).json({ error: 'Failed to reject maintenance request.' });
  }
});

module.exports = router;
