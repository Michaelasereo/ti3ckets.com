import express, { Express, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Middleware
import { logger } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';
import { prismaMiddleware } from './middleware/prisma';
import { prismaService } from './services/prisma';

// Services
import { RedisService } from './services/redis';

// Routes
import eventRoutes from './routes/events';
import ticketRoutes from './routes/tickets';
import orderRoutes from './routes/orders';
import paymentRoutes from './routes/payments';
import webhookRoutes from './routes/webhooks';
import authRoutes from './routes/auth';
import organizerRoutes from './routes/organizer';
import promoCodeRoutes from './routes/promo-codes';
import waitlistRoutes from './routes/waitlist';
import ticketTransferRoutes from './routes/tickets/transfer';
import usersRoutes from './routes/users';
import organizerPromoCodeRoutes from './routes/organizer/promo-codes';
import organizerPayoutRoutes from './routes/organizer/payouts';
import organizerRevenueRoutes from './routes/organizer/revenue';
import organizerEventImageRoutes from './routes/organizer/events';
import organizerProfileRoutes from './routes/organizer/profile';
import adminRoutes from './routes/admin';
import testRoutes from './routes/test';

const redisService = new RedisService();

const app: Express = express();

// Trust proxy (for AWS load balancer)
app.set('trust proxy', true);

// Body parsing middleware (1MB limit)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Cookie parser
app.use(cookieParser(
  process.env.COOKIE_SECRET || 'your-cookie-secret-change-this-in-production-min-32-chars'
));

// CORS middleware
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://yourdomain.netlify.app',
  'http://localhost:3001',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Helmet security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));

// Rate limiting (in-memory store - for Redis-backed rate limiting, use rate-limit-redis package)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});
app.use('/api/', limiter);

// Logger middleware
app.use(logger);

// Prisma middleware (attach Prisma to requests)
app.use(prismaMiddleware);

// Redis middleware (attach Redis to requests)
app.use((req: Request, res: Response, next: NextFunction) => {
  req.redis = redisService;
  next();
});

// Health check
app.get('/health', async (req: Request, res: Response) => {
  const services: Record<string, string> = {};
  let allHealthy = true;

  // Check database connection
  try {
    await req.prisma.$queryRaw`SELECT 1`;
    services.database = 'connected';
  } catch (error) {
    services.database = 'disconnected';
    allHealthy = false;
    console.error('Database health check failed:', error);
  }
  
  // Check Redis connection
  try {
    await redisService.ping();
    services.redis = 'connected';
  } catch (error) {
    services.redis = 'disconnected';
    allHealthy = false;
    console.error('Redis health check failed:', error);
    // Include Redis status for diagnostics
    services.redisStatus = redisService.getConnectionStatus();
  }
  
  const statusCode = allHealthy ? 200 : 503;
  res.status(statusCode).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services,
  });
});

// Register routes
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/tickets', ticketTransferRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
// Webhooks need raw body for signature verification
app.use('/api/v1/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/organizer', organizerRoutes);
app.use('/api/v1/organizer/profile', organizerProfileRoutes);
app.use('/api/v1/organizer/events', organizerEventImageRoutes);
app.use('/api/v1/organizer/promo-codes', organizerPromoCodeRoutes);
app.use('/api/v1/organizer/payouts', organizerPayoutRoutes);
app.use('/api/v1/organizer/revenue', organizerRevenueRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/promo-codes', promoCodeRoutes);
app.use('/api/v1/waitlist', waitlistRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/test', testRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  try {
    await prismaService.disconnect();
    await redisService.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default app;
