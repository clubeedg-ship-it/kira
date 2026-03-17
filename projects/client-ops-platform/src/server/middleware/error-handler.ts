import type { Request, Response, NextFunction } from 'express';
import { AuthorizationError, NotFoundError } from '../../core/errors';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AuthorizationError) {
    res.status(403).json({ error: err.message });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.errors });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Record not found' });
      return;
    }
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Duplicate record' });
      return;
    }
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
}
