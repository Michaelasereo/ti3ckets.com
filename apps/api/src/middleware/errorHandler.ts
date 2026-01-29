import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  status?: number;
}

/**
 * Centralized error handling middleware
 */
export const errorHandler = (
  error: AppError | ZodError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error
  console.error('Error:', error);

  // Zod validation errors
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.errors,
    });
  }

  // Custom errors with statusCode
  const statusCode = (error as AppError).statusCode || (error as AppError).status || 500;
  const message = error.message || 'Internal server error';

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(isDevelopment && { stack: error.stack }),
  });
};
