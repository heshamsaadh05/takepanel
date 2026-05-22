import { Router } from 'express';
import { validateBody } from '../middleware/validate';
import { forgotPasswordSchema, loginSchema, refreshSchema, resetPasswordSchema, totpVerifySchema } from './auth.schemas';
import { fail, ok } from '../lib/http';
import { login, refreshToken, revokeCurrentSession } from './auth.service';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

export const authRouter = Router();

authRouter.post('/login', validateBody(loginSchema), async (req, res) => {
  const result = await login(req.body.identifier, req.body.password);
  if (!result) {
    return fail(res, 401, 'invalid_credentials', 'Invalid credentials');
  }

  return ok(res, {
    user: {
      id: result.user.id,
      username: result.user.username,
      email: result.user.email,
      role: result.user.role.name,
      permissions: result.user.role.permissions,
      locale: result.user.locale,
      theme: result.user.theme
    },
    accessToken: result.accessToken,
    refreshToken: result.refreshToken
  });
});

authRouter.post('/refresh', validateBody(refreshSchema), async (req, res) => {
  const result = await refreshToken(req.body.refreshToken);
  if (!result) {
    return fail(res, 401, 'invalid_refresh_token', 'Invalid refresh token');
  }

  return ok(res, {
    user: {
      id: result.user.id,
      username: result.user.username,
      email: result.user.email,
      role: result.user.role.name,
      permissions: result.user.role.permissions,
      locale: result.user.locale,
      theme: result.user.theme
    },
    accessToken: result.accessToken,
    refreshToken: result.refreshToken
  });
});

authRouter.post('/logout', requireAuth, async (req, res) => {
  await revokeCurrentSession(req.authUser!.id);
  return ok(res, { message: 'Logged out' });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  return ok(res, {
    user: {
      id: req.authUser!.id,
      username: req.authUser!.username,
      email: req.authUser!.email,
      role: req.authUser!.role.name,
      permissions: req.authUser!.role.permissions,
      locale: req.authUser!.locale,
      theme: req.authUser!.theme,
      status: req.authUser!.status,
      twoFactorEnabled: req.authUser!.twoFactorEnabled,
      lastLoginAt: req.authUser!.lastLoginAt
    }
  });
});

authRouter.post('/forgot-password', validateBody(forgotPasswordSchema), async (_req, res) => {
  return ok(res, {
    message: 'Password reset flow is scaffolded and will be connected to the mail service layer.'
  }, 202);
});

authRouter.post('/reset-password', validateBody(resetPasswordSchema), async (_req, res) => {
  return ok(res, {
    message: 'Password reset endpoint is scaffolded and will be wired to the mail and token service.'
  });
});

authRouter.post('/2fa/setup', requireAuth, async (req, res) => {
  const secret = `HM-${req.authUser!.id.slice(0, 6)}-${Date.now()}`;
  await prisma.user.update({
    where: { id: req.authUser!.id },
    data: { twoFactorSecret: secret }
  });

  return ok(res, {
    secret,
    otpauthUrl: `otpauth://totp/HostMaster:${encodeURIComponent(req.authUser!.email)}?secret=${secret}&issuer=HostMaster`
  });
});

authRouter.post('/2fa/verify', requireAuth, validateBody(totpVerifySchema), async (req, res) => {
  const { code } = req.body as { code: string };
  const enabled = code.length >= 6;
  await prisma.user.update({
    where: { id: req.authUser!.id },
    data: { twoFactorEnabled: enabled }
  });

  return ok(res, { twoFactorEnabled: enabled });
});

authRouter.get('/bootstrap', async (_req, res) => {
  const schema = z.object({ ready: z.boolean() });
  return ok(res, schema.parse({ ready: true }));
});
