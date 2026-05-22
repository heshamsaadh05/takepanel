import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { requirePermissions } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { createUser, getUser, listUsers, removeUser, updateUser } from './users.service';
import { fail, ok } from '../lib/http';

export const usersRouter = Router();

const createUserSchema = z.object({
  username: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  roleId: z.string().uuid(),
  locale: z.string().optional(),
  theme: z.string().optional()
});

const updateUserSchema = createUserSchema.partial().extend({
  status: z.enum(['active', 'suspended', 'pending', 'deleted']).optional()
});

usersRouter.use(requireAuth, requirePermissions('users.manage'));

usersRouter.get('/', async (_req, res) => ok(res, await listUsers()));

usersRouter.post('/', validateBody(createUserSchema), async (req, res) => {
  const user = await createUser(req.body as {
    username: string;
    email: string;
    password: string;
    roleId: string;
    locale?: string;
    theme?: string;
  });
  return ok(res, user, 201);
});

usersRouter.get('/:id', async (req, res) => {
  const user = await getUser(String(req.params.id));
  if (!user) return fail(res, 404, 'not_found', 'User not found');
  return ok(res, user);
});

usersRouter.patch('/:id', validateBody(updateUserSchema), async (req, res) => {
  const user = await updateUser(String(req.params.id), req.body as Partial<{
    username: string;
    email: string;
    roleId: string;
    status: 'active' | 'suspended' | 'pending' | 'deleted';
    locale: string;
    theme: string;
  }>);
  return ok(res, user);
});

usersRouter.delete('/:id', async (req, res) => {
  const user = await removeUser(String(req.params.id));
  return ok(res, user);
});

usersRouter.patch('/:id/status', validateBody(z.object({ status: z.enum(['active', 'suspended', 'pending', 'deleted']) })), async (req, res) => {
  const body = req.body as { status: 'active' | 'suspended' | 'pending' | 'deleted' };
  const user = await updateUser(String(req.params.id), { status: body.status });
  return ok(res, user);
});
