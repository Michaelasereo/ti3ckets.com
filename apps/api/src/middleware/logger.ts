import { Request, Response, NextFunction } from 'express';

/**
 * Simple request logging middleware (replaces Pino)
 */
export const logger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  // Log request
  console.log(`[${timestamp}] ${req.method} ${req.path}`);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
    console.log(
      `[${new Date().toISOString()}] ${logLevel} ${req.method} ${req.path} ${res.statusCode} ${duration}ms`
    );
  });

  next();
};
