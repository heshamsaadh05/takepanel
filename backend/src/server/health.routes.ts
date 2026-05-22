import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { ok } from '../lib/http';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const [users, roles, services] = await Promise.all([
    prisma.user.count(),
    prisma.role.count(),
    prisma.serverService.count()
  ]);

  return ok(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    counts: { users, roles, services }
  });
});
