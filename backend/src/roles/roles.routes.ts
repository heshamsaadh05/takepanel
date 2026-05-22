import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { requirePermissions } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { createRole, deleteRole, listRoles, updateRole } from './roles.service';
import { ok } from '../lib/http';

export const rolesRouter = Router();

const roleSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  permissions: z.array(z.string()).default([])
});

rolesRouter.use(requireAuth, requirePermissions('roles.manage'));

rolesRouter.get('/', async (_req, res) => ok(res, await listRoles()));

rolesRouter.post('/', validateBody(roleSchema), async (req, res) => {
  const body = req.body as { name: string; description?: string; permissions: string[] };
  return ok(res, await createRole(body), 201);
});

rolesRouter.patch('/:id', validateBody(roleSchema.partial()), async (req, res) => {
  const id = String(req.params.id);
  const body = req.body as Partial<{ name: string; description?: string; permissions: string[] }>;
  return ok(res, await updateRole(id, body));
});

rolesRouter.delete('/:id', async (req, res) => ok(res, await deleteRole(String(req.params.id))));
