import type { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  userId: string;
  isPlatformAdmin: boolean;
}

/**
 * Minimal auth middleware for MVP.
 * Reads X-User-Id header (dev/internal use).
 * Replace with proper session/JWT auth before production.
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string | undefined;

  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isPlatformAdmin: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid user' });
      return;
    }

    (req as AuthenticatedRequest).userId = user.id;
    (req as AuthenticatedRequest).isPlatformAdmin = user.isPlatformAdmin;
    next();
  } catch {
    res.status(500).json({ error: 'Auth check failed' });
  }
}
