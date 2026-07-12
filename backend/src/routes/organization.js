const express = require('express');
const { z } = require('zod');
const prisma = require('../utils/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const departmentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(2, 'Code must be at least 2 characters').max(10),
  parentDepartmentId: z.number().nullable().optional()
});

const promoteSchema = z.object({
  role: z.enum(['Admin', 'AssetManager', 'DepartmentHead', 'Employee'])
});

// @route   GET /api/organization/departments
// @desc    Get all departments with heads and counts
router.get('/departments', authenticateToken, async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        head: { select: { id: true, name: true, email: true } },
        parent: { select: { id: true, name: true, code: true } },
        _count: {
          select: { users: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Map counts properly
    const mapped = departments.map(d => ({
      id: d.id,
      name: d.name,
      code: d.code,
      headUserId: d.headUserId,
      head: d.head,
      parentDepartmentId: d.parentDepartmentId,
      parent: d.parent,
      status: d.status,
      employeeCount: d._count.users
    }));

    return res.json(mapped);
  } catch (error) {
    console.error('Fetch departments error:', error);
    return res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// @route   POST /api/organization/departments
// @desc    Create department (Admin only)
router.post('/departments', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const data = departmentSchema.parse(req.body);

    // Check code unique
    const existing = await prisma.department.findUnique({
      where: { code: data.code }
    });

    if (existing) {
      return res.status(400).json({ error: 'Department code must be unique' });
    }

    const dept = await prisma.department.create({
      data: {
        name: data.name,
        code: data.code.toUpperCase(),
        parentDepartmentId: data.parentDepartmentId || null
      }
    });

    await prisma.activityLog.create({
      data: {
        actorId: req.user.id,
        action: 'CREATE_DEPARTMENT',
        entityType: 'Department',
        entityId: dept.id
      }
    });

    return res.status(201).json(dept);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Create department error:', error);
    return res.status(500).json({ error: 'Failed to create department' });
  }
});

// @route   GET /api/organization/employees
// @desc    Get all employees directory (Admin/Manager/Head only)
router.get('/employees', authenticateToken, requireRole(['Admin', 'AssetManager', 'DepartmentHead']), async (req, res) => {
  try {
    const employees = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        department: true,
        allocations: {
          where: { status: 'active' },
          include: {
            asset: { select: { id: true, name: true, assetCode: true } }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return res.json(employees);
  } catch (error) {
    console.error('Fetch employees directory error:', error);
    return res.status(500).json({ error: 'Failed to load employee directory' });
  }
});

// @route   PUT /api/organization/employees/:id/promote
// @desc    Promote an employee role (Admin only)
router.put('/employees/:id/promote', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid employee ID' });

  try {
    const data = promoteSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role: data.role },
      select: { id: true, name: true, email: true, role: true }
    });

    // Notify the user about the promotion
    await prisma.notification.create({
      data: {
        userId: id,
        type: 'info',
        message: `Your account role has been updated to "${data.role}" by Admin.`
      }
    });

    // Log action
    await prisma.activityLog.create({
      data: {
        actorId: req.user.id,
        action: `PROMOTE_USER_ROLE_TO_${data.role.toUpperCase()}`,
        entityType: 'User',
        entityId: id
      }
    });

    // If role promoted to DepartmentHead and department exists, make them head
    if (data.role === 'DepartmentHead' && user.departmentId) {
      // Find current head and remove, or just overwrite
      await prisma.department.updateMany({
        where: { headUserId: id },
        data: { headUserId: null }
      });
      
      await prisma.department.update({
        where: { id: user.departmentId },
        data: { headUserId: id }
      });
    }

    return res.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Promotion error:', error);
    return res.status(500).json({ error: 'Failed to promote employee' });
  }
});

module.exports = router;
