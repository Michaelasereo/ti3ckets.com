import { PrismaClient } from '@prisma/client';
import { RedisService } from '../services/redis';
import { SessionData } from '../services/session';

export interface AuthUser {
  userId: string;
  email: string;
  roles: string[];
  activeRole?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      session?: SessionData;
      prisma: PrismaClient;
      redis: RedisService;
      checkDb: () => Promise<boolean>;
      ensureDbConnection: () => Promise<void>;
    }
  }
}
