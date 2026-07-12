const express = require('express');
const { z } = require('zod');
const prisma = require('../utils/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const allocateSchema = z.object({
  assetId: z.number(),
  employeeId: z.number(),
  departmentId: z.number(),
  allocatedDate: z.string(),
  expectedReturnDate: z.string()
});

const returnSchema = z.object({
  condition: z.string().min(2, 'Return condition is required')
});

const transferRequestSchema = z.object({
  assetId: z.number(),
  toEmployeeId: z.number(),
  reason: z.string().optional()
});

// @route   GET /api/allocations
// @desc    Get all active or historical allocations
router.get('/', authenticateToken, async (req, res) => {
  const { status, employeeId, departmentId } = req.query;

  let where = {};
  if (status) where.status = status;
  if (employeeId) where.employeeId = parseInt(employeeId, 10);
  if (departmentId) where.departmentId = parseInt(departmentId, 10);

  // Role restriction for Dept Head (view only own department)
  if (req.user.role === 'DepartmentHead') {
    where.departmentId = req.user.departmentId;
  }
  // Role restriction for Employee (view only own allocations)
  if (req.user.role === 'Employee') {
    where.employeeId = req.user.id;
  }

  try {
    const allocations = await prisma.allocation.findMany({
      where,
      include: {
        asset: { include: { category: true } },
        employee: { select: { id: true, name: true, email: true } },
        department: true
      },
      orderBy: { id: 'desc' }
    });

    return res.json(allocations);
  } catch (error) {
    console.error('Fetch allocations error:', error);
    return res.status(500).json({ error: 'Failed to fetch allocations' });
  }
});

// @route   POST /api/allocations
// @desc    Create a new asset allocation (Admin & Asset Manager only)
router.post('/', authenticateToken, requireRole(['Admin', 'AssetManager']), async (req, res) => {
  try {
    const data = allocateSchema.parse(req.body);

    const allocation = await prisma.$transaction(async (tx) => {
      // 1. Lock check for active allocations on this asset
      const activeAlloc = await tx.allocation.findFirst({
        where: {
          assetId: data.assetId,
          status: 'active'
        },
        include: {
          employee: { select: { name: true } },
          department: { select: { name: true } }
        }
      });

      if (activeAlloc) {
        throw new Error(`CONFLICT: Asset is currently allocated to ${activeAlloc.employee.name} (${activeAlloc.department.name}). Expected return: ${activeAlloc.expectedReturnDate.toISOString().split('T')[0]}.`);
      }

      // 2. Verify asset exists and is allocatable
      const asset = await tx.asset.findUnique({
        where: { id: data.assetId }
      });

      if (!asset) {
        throw new Error('NOT_FOUND: Asset not found.');
      }

      if (asset.status === 'UnderMaintenance') {
        throw new Error('CONFLICT: Asset is currently undergoing maintenance.');
      }

      if (asset.status === 'Retired') {
        throw new Error('CONFLICT: Asset has been retired and is no longer allocatable.');
      }

      // 3. Create allocation
      const newAlloc = await tx.allocation.create({
        data: {
          assetId: data.assetId,
          employeeId: data.employeeId,
          departmentId: data.departmentId,
          allocatedDate: new Date(data.allocatedDate),
          expectedReturnDate: new Date(data.expectedReturnDate),
          status: 'active'
        }
      });

      // 4. Update asset status
      await tx.asset.update({
        where: { id: data.assetId },
        data: { status: 'Allocated' }
      });

      // 5. Notify employee
      await tx.notification.create({
        data: {
          userId: data.employeeId,
          type: 'info',
          message: `Asset "${asset.name}" (${asset.assetCode}) has been allocated to you. Expected return: ${data.expectedReturnDate}.`
        }
      });

      return newAlloc;
    });

    return res.status(201).json(allocation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    if (error.message.startsWith('CONFLICT:')) {
      return res.status(409).json({ error: error.message.replace('CONFLICT: ', '') });
    }
    if (error.message.startsWith('NOT_FOUND:')) {
      return res.status(404).json({ error: error.message.replace('NOT_FOUND: ', '') });
    }
    console.error('Allocate asset error:', error);
    return res.status(500).json({ error: 'Failed to allocate asset.' });
  }
});

// @route   POST /api/allocations/:id/return
// @desc    Mark an active allocation as returned (Admin & Asset Manager only)
router.post('/:id/return', authenticateToken, requireRole(['Admin', 'AssetManager']), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid allocation ID' });

  try {
    const { condition } = returnSchema.parse(req.body);

    const returnedAlloc = await prisma.$transaction(async (tx) => {
      const allocation = await tx.allocation.findUnique({
        where: { id },
        include: { asset: true }
      });

      if (!allocation || allocation.status !== 'active') {
        throw new Error('NOT_FOUND: Active allocation not found.');
      }

      // Close allocation
      const updated = await tx.allocation.update({
        where: { id },
        data: {
          status: 'returned',
          actualReturnDate: new Date(),
          returnCondition: condition
        }
      });

      // Sync Asset back to Available
      await tx.asset.update({
        where: { id: allocation.assetId },
        data: { status: 'Available' }
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          actorId: req.user.id,
          action: 'RETURN_ASSET',
          entityType: 'Asset',
          entityId: allocation.assetId
        }
      });

      return updated;
    });

    return res.json(returnedAlloc);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    if (error.message.startsWith('NOT_FOUND:')) {
      return res.status(404).json({ error: error.message.replace('NOT_FOUND: ', '') });
    }
    console.error('Return asset error:', error);
    return res.status(500).json({ error: 'Failed to return asset.' });
  }
});

// @route   GET /api/allocations/transfers
// @desc    Get all transfer requests
router.get('/transfers', authenticateToken, async (req, res) => {
  let where = {};
  if (req.user.role === 'DepartmentHead') {
    // Dept heads see department-related transfers (implied or filter by requesting user's department)
  } else if (req.user.role === 'Employee') {
    where.OR = [
      { fromEmployeeId: req.user.id },
      { toEmployeeId: req.user.id },
      { requestedById: req.user.id }
    ];
  }

  try {
    const transfers = await prisma.transfer.findMany({
      where,
      include: {
        asset: true,
        fromEmployee: { select: { id: true, name: true } },
        toEmployee: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, name: true } }
      },
      orderBy: { id: 'desc' }
    });
    return res.json(transfers);
  } catch (error) {
    console.error('Fetch transfers error:', error);
    return res.status(500).json({ error: 'Failed to fetch transfers.' });
  }
});

// @route   POST /api/allocations/transfers
// @desc    Create a transfer request for an allocated asset
router.post('/transfers', authenticateToken, async (req, res) => {
  try {
    const data = transferRequestSchema.parse(req.body);

    const activeAlloc = await prisma.allocation.findFirst({
      where: {
        assetId: data.assetId,
        status: 'active'
      }
    });

    if (!activeAlloc) {
      return res.status(400).json({ error: 'Asset must have an active allocation to request a transfer.' });
    }

    const transfer = await prisma.transfer.create({
      data: {
        assetId: data.assetId,
        fromEmployeeId: activeAlloc.employeeId,
        toEmployeeId: data.toEmployeeId,
        requestedById: req.user.id,
        reason: data.reason || null,
        status: 'pending'
      }
    });

    // Notify admins / managers
    const managers = await prisma.user.findMany({
      where: { role: { in: ['Admin', 'AssetManager'] } }
    });

    for (const m of managers) {
      await prisma.notification.create({
        data: {
          userId: m.id,
          type: 'transfer',
          message: `New transfer request pending: Asset tag is requested by user ${req.user.name}.`
        }
      });
    }

    return res.status(201).json(transfer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Request transfer error:', error);
    return res.status(500).json({ error: 'Failed to create transfer request.' });
  }
});

// @route   POST /api/allocations/transfers/:id/approve
// @desc    Approve a transfer request (Admin & Asset Manager only)
router.post('/transfers/:id/approve', authenticateToken, requireRole(['Admin', 'AssetManager']), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid transfer ID' });

  try {
    const approvedAlloc = await prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findUnique({
        where: { id },
        include: { asset: true }
      });

      if (!transfer || transfer.status !== 'pending') {
        throw new Error('NOT_FOUND: Active transfer request not found.');
      }

      // 1. Close current active allocation
      const activeAlloc = await tx.allocation.findFirst({
        where: {
          assetId: transfer.assetId,
          status: 'active'
        }
      });

      if (activeAlloc) {
        await tx.allocation.update({
          where: { id: activeAlloc.id },
          data: {
            status: 'returned',
            actualReturnDate: new Date(),
            returnCondition: `Transferred under Request #${transfer.id}`
          }
        });
      }

      // 2. Fetch target user to get department
      const toUser = await tx.user.findUnique({
        where: { id: transfer.toEmployeeId }
      });

      if (!toUser) {
        throw new Error('NOT_FOUND: Target employee not found.');
      }

      // 3. Create new allocation
      const newAlloc = await tx.allocation.create({
        data: {
          assetId: transfer.assetId,
          employeeId: transfer.toEmployeeId,
          departmentId: toUser.departmentId || activeAlloc.departmentId,
          allocatedDate: new Date(),
          expectedReturnDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // Default 180 days
          status: 'active'
        }
      });

      // 4. Update transfer request status
      await tx.transfer.update({
        where: { id },
        data: { status: 'approved' }
      });

      // 5. Keep asset status as Allocated
      await tx.asset.update({
        where: { id: transfer.assetId },
        data: { status: 'Allocated' }
      });

      // 6. Notify both parties
      await tx.notification.create({
        data: {
          userId: transfer.toEmployeeId,
          type: 'info',
          message: `Asset "${transfer.asset.name}" has been transferred and allocated to you.`
        }
      });

      await tx.notification.create({
        data: {
          userId: transfer.fromEmployeeId,
          type: 'info',
          message: `Asset "${transfer.asset.name}" previously allocated to you has been transferred to another user.`
        }
      });

      return newAlloc;
    });

    return res.json(approvedAlloc);
  } catch (error) {
    if (error.message.startsWith('NOT_FOUND:')) {
      return res.status(404).json({ error: error.message.replace('NOT_FOUND: ', '') });
    }
    console.error('Approve transfer error:', error);
    return res.status(500).json({ error: 'Failed to approve transfer request.' });
  }
});

// @route   POST /api/allocations/transfers/:id/reject
// @desc    Reject a transfer request (Admin & Asset Manager only)
router.post('/transfers/:id/reject', authenticateToken, requireRole(['Admin', 'AssetManager']), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid transfer ID' });

  try {
    const transfer = await prisma.transfer.findUnique({
      where: { id }
    });

    if (!transfer || transfer.status !== 'pending') {
      return res.status(404).json({ error: 'Active transfer request not found.' });
    }

    const updated = await prisma.transfer.update({
      where: { id },
      data: { status: 'rejected' }
    });

    await prisma.notification.create({
      data: {
        userId: transfer.requestedById,
        type: 'info',
        message: `Your transfer request for asset ID ${transfer.assetId} was rejected.`
      }
    });

    return res.json(updated);
  } catch (error) {
    console.error('Reject transfer error:', error);
    return res.status(500).json({ error: 'Failed to reject transfer request.' });
  }
});

module.exports = router;
