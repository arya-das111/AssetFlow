const express = require('express');
const { z } = require('zod');
const prisma = require('../utils/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const bookingSchema = z.object({
  resourceId: z.number(),
  startTime: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Invalid start time date string" }),
  endTime: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Invalid end time date string" })
}).refine(data => new Date(data.startTime) < new Date(data.endTime), {
  message: "Start time must be before end time",
  path: ["endTime"]
});

// @route   GET /api/bookings
// @desc    Get bookings with optional resourceId and date filters
router.get('/', authenticateToken, async (req, res) => {
  const { resourceId, date } = req.query; // date as "YYYY-MM-DD"

  let where = { status: 'confirmed' };

  if (resourceId) {
    where.resourceId = parseInt(resourceId, 10);
  }

  if (date) {
    const baseDate = new Date(`${date}T00:00:00.000Z`);
    const startRange = new Date(baseDate);
    startRange.setDate(startRange.getDate() - 1);
    const endRange = new Date(baseDate);
    endRange.setDate(endRange.getDate() + 2);

    where.startTime = { gte: startRange };
    where.endTime = { lte: endRange };
  }

  try {
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        resource: true,
        bookedBy: { select: { id: true, name: true, email: true } }
      },
      orderBy: { startTime: 'asc' }
    });

    return res.json(bookings);
  } catch (error) {
    console.error('Fetch bookings error:', error);
    return res.status(500).json({ error: 'Failed to fetch bookings.' });
  }
});

// @route   POST /api/bookings
// @desc    Create a resource booking (Time Slot Overlap validation)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const data = bookingSchema.parse(req.body);
    const newStart = new Date(data.startTime);
    const newEnd = new Date(data.endTime);

    // Dynamic constraint verification (extra check)
    if (newStart >= newEnd) {
      return res.status(400).json({ error: 'Start time must be strictly before end time.' });
    }

    const booking = await prisma.$transaction(async (tx) => {
      // 1. Verify resource is bookable and exists
      const resource = await tx.asset.findUnique({
        where: { id: data.resourceId }
      });

      if (!resource) {
        throw new Error('NOT_FOUND: Resource not found.');
      }

      if (!resource.bookable) {
        throw new Error('BAD_REQUEST: Asset is not configured as a bookable resource.');
      }

      if (resource.status === 'UnderMaintenance') {
        throw new Error('CONFLICT: Resource is under maintenance and cannot be booked.');
      }

      // 2. Lock check overlapping active bookings
      const overlap = await tx.booking.findFirst({
        where: {
          resourceId: data.resourceId,
          status: 'confirmed',
          startTime: { lt: newEnd },
          endTime: { gt: newStart }
        },
        include: {
          bookedBy: { select: { name: true } }
        }
      });

      if (overlap) {
        // Format conflict window for presentation
        const formatTime = (dateObj) => {
          return new Date(dateObj).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        };
        throw new Error(`CONFLICT: Time slot overlaps with an existing booking by ${overlap.bookedBy.name} (${formatTime(overlap.startTime)} - ${formatTime(overlap.endTime)}).`);
      }

      // 3. Create booking
      const newBooking = await tx.booking.create({
        data: {
          resourceId: data.resourceId,
          bookedById: req.user.id,
          startTime: newStart,
          endTime: newEnd,
          status: 'confirmed'
        }
      });

      // 4. Notify booker
      await tx.notification.create({
        data: {
          userId: req.user.id,
          type: 'booking',
          message: `Your booking for "${resource.name}" has been confirmed for ${newStart.toLocaleDateString()} at ${newStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.`
        }
      });

      // 5. Log activity
      await tx.activityLog.create({
        data: {
          actorId: req.user.id,
          action: 'BOOK_RESOURCE',
          entityType: 'Asset',
          entityId: resource.id
        }
      });

      return newBooking;
    });

    return res.status(201).json(booking);
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
    if (error.message.startsWith('BAD_REQUEST:')) {
      return res.status(400).json({ error: error.message.replace('BAD_REQUEST: ', '') });
    }
    console.error('Create booking error:', error);
    return res.status(500).json({ error: 'Failed to complete booking.' });
  }
});

// @route   POST /api/bookings/:id/cancel
// @desc    Cancel a booking
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid booking ID' });

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { resource: true }
    });

    if (!booking || booking.status !== 'confirmed') {
      return res.status(404).json({ error: 'Active booking not found.' });
    }

    // Role check: Only owner, Admin, or AssetManager can cancel
    if (booking.bookedById !== req.user.id && !['Admin', 'AssetManager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'You are not authorized to cancel this booking.' });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: 'cancelled' }
    });

    await prisma.notification.create({
      data: {
        userId: booking.bookedById,
        type: 'booking',
        message: `Booking for resource "${booking.resource.name}" on ${booking.startTime.toLocaleDateString()} was cancelled.`
      }
    });

    return res.json(updated);
  } catch (error) {
    console.error('Cancel booking error:', error);
    return res.status(500).json({ error: 'Failed to cancel booking.' });
  }
});

module.exports = router;
