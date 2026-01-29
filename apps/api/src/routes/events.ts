import { Router } from 'express';
import { z } from 'zod';
import { config } from '@getiickets/config';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

const querySchema = z.object({
  category: z.string().optional(),
  city: z.string().optional(),
  date: z.string().optional(),
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : config.pagination.defaultLimit)),
});

// GET /api/v1/events - List events with filters
router.get('/', asyncHandler(async (req, res) => {
  const query = querySchema.parse(req.query);
  const { category, city, date, page, limit } = query;
  const skip = (page - 1) * limit;

  // Build cache key
  const cacheKey = `events:${category || 'all'}:${city || 'all'}:${date || 'all'}:${page}:${limit}`;

  // Try to get from cache (with timeout)
  try {
    const cached = await Promise.race([
      req.redis.client.get(cacheKey),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 1000))
    ]) as string | null;
    if (cached) {
      return res.json(JSON.parse(cached));
    }
  } catch (error) {
    // Redis unavailable or timeout, continue without cache
    console.warn('Redis cache unavailable, continuing without cache');
  }

  // Build where clause: show all published/live upcoming events (event start in the future).
  // No sale-window filter so published events always appear on Browse until the event has passed.
  const now = new Date();
  const where: any = {
    status: {
      in: ['PUBLISHED', 'LIVE'],
    },
    startDateTime: {
      gte: now,
    },
  };

  if (category) {
    where.category = category;
  }

  if (city) {
    where.city = city;
  }

  if (date) {
    const dateObj = new Date(date);
    where.startDateTime = {
      gte: new Date(dateObj.setHours(0, 0, 0, 0)),
      lte: new Date(dateObj.setHours(23, 59, 59, 999)),
    };
  }

  // Import performance monitor
  const { measureParallelQueries } = await import('../utils/performance');

  // Fetch events
  const { events, total } = await measureParallelQueries(
    {
      events: req.prisma.event.findMany({
        where,
        include: {
          ticketTypes: {
            select: {
              id: true,
              name: true,
              price: true,
              currency: true,
              totalQuantity: true,
              soldQuantity: true,
            },
          },
          organizer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          startDateTime: 'asc',
        },
        skip,
        take: limit,
      }),
      total: req.prisma.event.count({ where }),
    },
    { category, city, date, page, limit }
  );

  const response = {
    success: true,
    data: events,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };

  // Cache for 5 minutes
  try {
    await req.redis.client.set(cacheKey, JSON.stringify(response), 'EX', config.cache.eventListTTL);
  } catch (error) {
    // Redis unavailable, continue without cache
    console.warn('Redis cache unavailable, skipping cache write');
  }

  res.json(response);
}));

// GET /api/v1/events/search - Search events
router.get('/search', asyncHandler(async (req, res) => {
  const { q } = req.query as { q?: string };
  
  if (!q || q.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Search query is required' });
  }

  const searchTerm = q.trim();

  const events = await req.prisma.event.findMany({
    where: {
      status: {
        in: ['PUBLISHED', 'LIVE'],
      },
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { venueName: { contains: searchTerm, mode: 'insensitive' } },
        { city: { contains: searchTerm, mode: 'insensitive' } },
      ],
    },
    include: {
      ticketTypes: {
        select: {
          id: true,
          name: true,
          price: true,
          currency: true,
        },
      },
    },
    take: 20,
  });

  res.json({
    success: true,
    data: events,
  });
}));

// GET /api/v1/events/slug/:slug - Get event by slug
router.get('/slug/:slug', asyncHandler(async (req, res) => {
  const { slug } = req.params;

  // Try cache first (with timeout)
  const cacheKey = `event:slug:${slug}`;
  try {
    const cached = await Promise.race([
      req.redis.client.get(cacheKey),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 1000))
    ]) as string | null;
    if (cached) {
      return res.json(JSON.parse(cached));
    }
  } catch (error) {
    // Redis unavailable or timeout, continue without cache
    console.warn('Redis cache unavailable, continuing without cache');
  }

  // Fetch event - conditionally include seats only if event is seated
  // Use a single query with conditional includes
  const event = await req.prisma.event.findUnique({
    where: { slug },
    include: {
      ticketTypes: {
        orderBy: {
          price: 'asc',
        },
      },
      organizer: {
        include: {
          organizerProfile: {
            select: {
              businessName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }

  // Only fetch seats if event is seated (seats can be thousands of records)
  // Fetch seats separately to avoid loading unnecessary data
  let seats = [];
  if (event.isSeated) {
    seats = await req.prisma.seat.findMany({
      where: {
        eventId: event.id,
        status: {
          in: ['AVAILABLE', 'RESERVED'],
        },
      },
      orderBy: [
        { section: 'asc' },
        { row: 'asc' },
        { number: 'asc' },
      ],
      take: 2000, // Reasonable limit for seat selection UI
    });
  }

  const response = {
    success: true,
    data: {
      ...event,
      seats,
    },
  };

  // Cache for 1 minute
  try {
    await req.redis.client.set(cacheKey, JSON.stringify(response), 'EX', config.cache.eventDetailTTL);
  } catch (error) {
    // Redis unavailable, continue without cache
    console.warn('Redis cache unavailable, skipping cache write');
  }

  res.json(response);
}));

// GET /api/v1/events/:id - Get event details
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Try cache first (with timeout)
  const cacheKey = `event:${id}`;
  try {
    const cached = await Promise.race([
      req.redis.client.get(cacheKey),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 1000))
    ]) as string | null;
    if (cached) {
      return res.json(JSON.parse(cached));
    }
  } catch (error) {
    // Redis unavailable or timeout, continue without cache
    console.warn('Redis cache unavailable, continuing without cache');
  }

  // Fetch event - conditionally include seats only if event is seated
  const event = await req.prisma.event.findUnique({
    where: { id },
    include: {
      ticketTypes: {
        orderBy: {
          price: 'asc',
        },
      },
      organizer: {
        select: {
          id: true,
          name: true,
          email: true,
          organizerProfile: {
            select: {
              businessName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }

  // Only fetch seats if event is seated (seats can be thousands of records)
  let seats = [];
  if (event.isSeated) {
    seats = await req.prisma.seat.findMany({
      where: {
        eventId: event.id,
        status: {
          in: ['AVAILABLE', 'RESERVED'],
        },
      },
      orderBy: [
        { section: 'asc' },
        { row: 'asc' },
        { number: 'asc' },
      ],
      take: 2000, // Reasonable limit for seat selection UI
    });
  }

  const response = {
    success: true,
    data: {
      ...event,
      seats,
    },
  };

  // Cache for 1 minute
  try {
    await req.redis.client.set(cacheKey, JSON.stringify(response), 'EX', config.cache.eventDetailTTL);
  } catch (error) {
    // Redis unavailable, continue without cache
    console.warn('Redis cache unavailable, skipping cache write');
  }

  res.json(response);
}));

export default router;
