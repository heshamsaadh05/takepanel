import type { Role, User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      authUser?: User & { role: Role };
    }
  }
}

export {};
