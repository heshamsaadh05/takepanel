import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  logger.error({ err }, 'Request failed');

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'validation_error',
        message: 'Validation failed',
        details: err.flatten()
      }
    });
  }

  const status = typeof err?.status === 'number' ? err.status : 500;
  return res.status(status).json({
    success: false,
    error: {
      code: err?.code ?? 'internal_error',
      message: err?.message ?? 'Unexpected server error'
    }
  });
};
