import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { permissionKeys } from '../config/permissions';

type PermissionKey = (typeof permissionKeys)[number];

const permissionSet = new Set(permissionKeys);

function normalizePermissions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function requirePermissions(...requiredPermissions: PermissionKey[]) {
  const checked = z.array(z.enum(permissionKeys)).parse(requiredPermissions);

  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.authUser;
    if (!user) {
      return res.status(401).json({ success: false, error: { code: 'unauthorized', message: 'Login required' } });
    }

    if (user.role?.name === 'super_admin') {
      return next();
    }

    const rolePermissions = normalizePermissions(user.role?.permissions).filter((permission) => permissionSet.has(permission as PermissionKey));
    const missing = checked.filter((permission) => !rolePermissions.includes(permission));

    if (missing.length > 0) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'forbidden',
          message: 'Missing required permissions',
          details: { missing }
        }
      });
    }

    return next();
  };
}
