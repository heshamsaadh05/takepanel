import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';

type JwtPayload = {
  sub: string;
  tv: number;
};

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ success: false, error: { code: 'unauthorized', message: 'Missing access token' } });
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true }
    });

    if (!user || user.status !== 'active' || user.tokenVersion !== payload.tv) {
      return res.status(401).json({ success: false, error: { code: 'unauthorized', message: 'Invalid or expired token' } });
    }

    req.authUser = user;
    next();
  } catch {
    return res.status(401).json({ success: false, error: { code: 'unauthorized', message: 'Invalid or expired token' } });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next();
  }
  return requireAuth(req, _res as Response, next);
}
