const express = require('express');
const { z } = require('zod');
const prisma = require('../utils/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const assetSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  categoryId: z.number({ required_error: 'Category is required' }),
  location: z.string().optional().nullable(),
  bookable: z.boolean().default(false)
});

// Helper to generate next unique Asset Code (AF-XXXX)
async function generateAssetCode() {
  const lastAsset = await prisma.asset.findFirst({
    where: {
      assetCode: {
        startsWith: 'AF-'
      }
    },
    orderBy: {
      id: 'desc'
    }
  });

  let nextNum = 1;
  if (lastAsset && lastAsset.assetCode) {
    const parts = lastAsset.assetCode.split('-');
    if (parts.length === 2) {
      const num = parseInt(parts[1], 10);
      if (!isNaN(num)) {
        nextNum = num + 1;
      }
    }
  }

  return `AF-${String(nextNum).padStart(4, '0')}`;
}

// @route   GET /api/assets
// @desc    Get all assets with search and filter
router.get('/', authenticateToken, async (req, res) => {
  const { search, categoryId, status, location, bookable } = req.query;

  let where = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { assetCode: { contains: search } },
      { location: { contains: search } }
    ];
  }

  if (categoryId) {
    where.categoryId = parseInt(categoryId, 10);
  }

  if (status) {
    where.status = status;
  }

  if (location) {
    where.location = { contains: location };
  }

  if (bookable !== undefined) {
    where.bookable = bookable === 'true';
  }

  try {
    const assets = await prisma.asset.findMany({
      where,
      include: {
        category: true,
        allocations: {
          where: { status: 'active' },
          include: {
            employee: { select: { id: true, name: true, email: true } },
            department: true
          }
        }
      },
      orderBy: { id: 'desc' }
    });

    return res.json(assets);
  } catch (error) {
    console.error('Fetch assets error:', error);
    return res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// @route   GET /api/assets/categories
// @desc    Get asset categories
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
    return res.json(categories);
  } catch (error) {
    console.error('Fetch categories error:', error);
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// @route   POST /api/assets/categories
// @desc    Create new asset category (Admin only)
router.post('/categories', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  try {
    const category = await prisma.category.create({
      data: { name, description }
    });

    await prisma.activityLog.create({
      data: {
        actorId: req.user.id,
        action: 'CREATE_CATEGORY',
        entityType: 'Category',
        entityId: category.id
      }
    });

    return res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    return res.status(500).json({ error: 'Failed to create category' });
  }
});

// @route   GET /api/assets/:id
// @desc    Get a single asset by ID
router.get('/:id', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid asset ID' });

  try {
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        allocations: {
          include: {
            employee: { select: { id: true, name: true } },
            department: true
          }
        },
        bookings: {
          include: {
            bookedBy: { select: { id: true, name: true } }
          }
        },
        maintenance: {
          include: {
            raisedBy: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    return res.json(asset);
  } catch (error) {
    console.error('Fetch asset details error:', error);
    return res.status(500).json({ error: 'Failed to fetch asset details' });
  }
});

// @route   GET /api/assets/:id/history
// @desc    Get complete audit timeline of allocations, transfers, and maintenance
router.get('/:id/history', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid asset ID' });

  try {
    const allocations = await prisma.allocation.findMany({
      where: { assetId: id },
      include: {
        employee: { select: { name: true } },
        department: true
      }
    });

    const maintenance = await prisma.maintenance.findMany({
      where: { assetId: id },
      include: {
        raisedBy: { select: { name: true } }
      }
    });

    const transfers = await prisma.transfer.findMany({
      where: { assetId: id },
      include: {
        fromEmployee: { select: { name: true } },
        toEmployee: { select: { name: true } },
        requestedBy: { select: { name: true } }
      }
    });

    // Merge and structure history logs
    const history = [];

    allocations.forEach(alloc => {
      history.push({
        date: alloc.createdAt,
        type: 'Allocation',
        title: alloc.status === 'active' ? 'Allocated' : 'Returned',
        description: alloc.status === 'active'
          ? `Allocated to ${alloc.employee.name} (${alloc.department.name})`
          : `Returned by ${alloc.employee.name}. Condition: ${alloc.returnCondition || 'N/A'}`,
        rawDate: alloc.allocatedDate
      });
    });

    maintenance.forEach(m => {
      history.push({
        date: m.createdAt,
        type: 'Maintenance',
        title: `Maintenance: ${m.status}`,
        description: `Raised by ${m.raisedBy.name}. Issue: "${m.issueDescription}"${
          m.technicianAssigned ? `. Tech: ${m.technicianAssigned}` : ''
        }`,
        rawDate: m.createdAt
      });
    });

    transfers.forEach(t => {
      history.push({
        date: t.createdAt,
        type: 'Transfer',
        title: `Transfer: ${t.status}`,
        description: `Requested by ${t.requestedBy.name}: ${t.fromEmployee.name} → ${t.toEmployee.name}. Reason: "${t.reason || 'None'}"`,
        rawDate: t.createdAt
      });
    });

    // Sort descending by date
    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    return res.json(history);
  } catch (error) {
    console.error('Fetch asset history error:', error);
    return res.status(500).json({ error: 'Failed to fetch asset history logs' });
  }
});

// @route   POST /api/assets
// @desc    Register a new asset (Admin & Asset Manager only)
router.post('/', authenticateToken, requireRole(['Admin', 'AssetManager']), async (req, res) => {
  try {
    const data = assetSchema.parse(req.body);

    const assetCode = await generateAssetCode();

    const asset = await prisma.asset.create({
      data: {
        assetCode,
        name: data.name,
        categoryId: data.categoryId,
        location: data.location || null,
        status: 'Available',
        bookable: data.bookable,
        qrCodeUrl: assetCode // We store the code itself as the QR content payload
      }
    });

    await prisma.activityLog.create({
      data: {
        actorId: req.user.id,
        action: 'REGISTER_ASSET',
        entityType: 'Asset',
        entityId: asset.id
      }
    });

    return res.status(201).json(asset);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Register asset error:', error);
    return res.status(500).json({ error: 'Failed to register new asset' });
  }
});

module.exports = router;
