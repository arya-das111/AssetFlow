const express = require('express');
const prisma = require('../utils/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/reports/dashboard
// @desc    Get dashboard metrics, charts data, and activity feed (role-scoped)
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;
    const departmentId = req.user.departmentId;

    // Build filter objects depending on role
    let assetWhere = {};
    let allocWhere = { status: 'active' };
    let bookingWhere = { status: 'confirmed' };
    let maintWhere = {};

    if (role === 'DepartmentHead') {
      // Own department scope
      allocWhere.departmentId = departmentId;
      // For bookings and maintenance, we can show department logs if needed, 
      // but let's stick to PRD scoping (own dept dashboard)
    } else if (role === 'Employee') {
      // Own data scope
      allocWhere.employeeId = userId;
      bookingWhere.bookedById = userId;
      maintWhere.raisedById = userId;
    }

    // 1. Fetch counts
    const totalAssets = await prisma.asset.count({ where: assetWhere });
    
    const availableAssets = await prisma.asset.count({
      where: { ...assetWhere, status: 'Available' }
    });

    const allocatedAssets = await prisma.asset.count({
      where: { ...assetWhere, status: 'Allocated' }
    });

    const maintenanceTickets = await prisma.maintenance.count({
      where: { ...maintWhere, status: { in: ['Pending', 'Approved', 'TechnicianAssigned', 'InProgress'] } }
    });

    const pendingTransfers = await prisma.transfer.count({
      where: { status: 'pending' }
    });

    // Active Bookings (Today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const activeBookings = await prisma.booking.count({
      where: {
        ...bookingWhere,
        startTime: { gte: todayStart },
        endTime: { lte: todayEnd }
      }
    });

    // 2. Fetch Chart Data (Asset Status Breakdown)
    const statusCounts = await prisma.asset.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    const chartData = [
      { name: 'Available', value: 0, color: '#10B981' },
      { name: 'Allocated', value: 0, color: '#3B82F6' },
      { name: 'Under Maintenance', value: 0, color: '#F59E0B' },
      { name: 'Retired', value: 0, color: '#EF4444' }
    ];

    statusCounts.forEach(item => {
      if (item.status === 'Available') chartData[0].value = item._count.id;
      if (item.status === 'Allocated') chartData[1].value = item._count.id;
      if (item.status === 'UnderMaintenance') chartData[2].value = item._count.id;
      if (item.status === 'Retired') chartData[3].value = item._count.id;
    });

    // 3. Activity Feed (Last 10 events)
    let activityLogWhere = {};
    if (role === 'Employee') {
      activityLogWhere.actorId = userId;
    }

    const activityLogs = await prisma.activityLog.findMany({
      where: activityLogWhere,
      take: 10,
      orderBy: { timestamp: 'desc' },
      include: {
        actor: { select: { name: true } }
      }
    });

    const activityFeed = activityLogs.map(log => {
      let detail = `performed action ${log.action}`;
      if (log.action === 'USER_SIGNUP') detail = `${log.actor.name} registered a new account.`;
      if (log.action === 'USER_LOGIN') detail = `${log.actor.name} logged into the system.`;
      if (log.action === 'REGISTER_ASSET') detail = `${log.actor.name} registered a new physical asset (ID: ${log.entityId}).`;
      if (log.action === 'BOOK_RESOURCE') detail = `${log.actor.name} booked a resource (ID: ${log.entityId}).`;
      if (log.action === 'RETURN_ASSET') detail = `${log.actor.name} completed return of asset (ID: ${log.entityId}).`;

      return {
        id: log.id,
        actor: log.actor.name,
        action: log.action,
        detail,
        timestamp: log.timestamp
      };
    });

    // 4. Overdue return count (allocations where expectedReturnDate < today and status = active)
    const overdueCount = await prisma.allocation.count({
      where: {
        status: 'active',
        expectedReturnDate: { lt: new Date() }
      }
    });

    return res.json({
      metrics: {
        totalAssets,
        availableAssets,
        allocatedAssets,
        maintenanceTickets,
        pendingTransfers,
        activeBookings,
        overdueCount
      },
      chartData,
      activityFeed
    });
  } catch (error) {
    console.error('Fetch dashboard metrics error:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard data.' });
  }
});

// @route   GET /api/reports/analytics
// @desc    Get aggregate reporting metrics (Admin & Asset Manager only)
router.get('/analytics', authenticateToken, requireRole(['Admin', 'AssetManager', 'DepartmentHead']), async (req, res) => {
  try {
    // 1. Department-wise Assets
    const departments = await prisma.department.findMany({
      include: {
        allocations: {
          where: { status: 'active' }
        }
      }
    });
    
    const deptWiseAssets = departments.map(d => ({
      department: d.name,
      code: d.code,
      count: d.allocations.length
    }));

    // 2. Most Used Assets (ranked by count of confirmed bookings + allocations)
    const assets = await prisma.asset.findMany({
      include: {
        allocations: true,
        bookings: { where: { status: 'confirmed' } }
      }
    });

    const mostUsedAssets = assets
      .map(a => ({
        id: a.id,
        tag: a.assetCode,
        name: a.name,
        count: a.allocations.length + a.bookings.length
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5

    // 3. Maintenance Count per asset category
    const categories = await prisma.category.findMany({
      include: {
        assets: {
          include: {
            maintenance: true
          }
        }
      }
    });

    const maintenanceCounts = categories.map(c => {
      let count = 0;
      c.assets.forEach(a => {
        count += a.maintenance.length;
      });
      return {
        category: c.name,
        count
      };
    });

    // 4. Idle Assets (Assets with Available status, ordered by createdAt or having no allocations)
    const idleAssets = await prisma.asset.findMany({
      where: {
        status: 'Available',
        bookable: false
      },
      include: {
        allocations: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      take: 5
    });

    const mappedIdle = idleAssets.map(a => {
      const lastAlloc = a.allocations[0];
      const daysIdle = lastAlloc 
        ? Math.floor((Date.now() - new Date(lastAlloc.actualReturnDate || lastAlloc.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      return {
        tag: a.assetCode,
        name: a.name,
        location: a.location || 'N/A',
        daysIdle: Math.max(0, daysIdle)
      };
    });

    return res.json({
      deptWiseAssets,
      mostUsedAssets,
      maintenanceCounts,
      idleAssets: mappedIdle
    });
  } catch (error) {
    console.error('Fetch analytics report error:', error);
    return res.status(500).json({ error: 'Failed to generate reports data.' });
  }
});

module.exports = router;
