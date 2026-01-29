import { Request, Response, NextFunction } from 'express';
import { prismaService } from '../services/prisma';

/**
 * Middleware to attach Prisma client to requests
 */
export const prismaMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.prisma = prismaService.client;
  req.checkDb = prismaService.checkDb.bind(prismaService);
  req.ensureDbConnection = prismaService.ensureConnection.bind(prismaService);
  next();
};
