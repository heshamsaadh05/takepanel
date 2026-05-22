import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requirePermissions } from '../middleware/rbac';
import { prisma } from '../lib/prisma';
import { ok } from '../lib/http';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth, requirePermissions('admin.dashboard.view'));

dashboardRouter.get('/overview', async (_req, res) => {
  const [activeAccounts, suspendedAccounts, services, alerts, tasks, topAccounts] = await Promise.all([
    prisma.hostingAccount.count({ where: { status: 'active' } }),
    prisma.hostingAccount.count({ where: { status: 'suspended' } }),
    prisma.serverService.findMany({ orderBy: { name: 'asc' } }),
    prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { user: true } }),
    prisma.task.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { createdBy: true } }),
    prisma.hostingAccount.findMany({ orderBy: [{ diskUsed: 'desc' }], take: 5, include: { ownerUser: true, package: true } })
  ]);

  return ok(res, {
    counters: { activeAccounts, suspendedAccounts },
    services,
    alerts,
    tasks,
    topAccounts,
    charts: {
      bandwidth: [],
      disk: []
    }
  });
});
