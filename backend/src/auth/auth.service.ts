import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { fail } from '../lib/http';

function signAccessToken(userId: string, tokenVersion: number) {
  return jwt.sign({ tv: tokenVersion, sub: userId }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn']
  });
}

function signRefreshToken(userId: string, tokenVersion: number) {
  return jwt.sign({ tv: tokenVersion, kind: 'refresh', sub: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL as jwt.SignOptions['expiresIn']
  });
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function login(identifier: string, password: string) {
  const normalized = identifier.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: normalized },
        { username: identifier.trim() }
      ]
    },
    include: { role: true }
  });

  if (!user || user.status !== 'active') {
    return null;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return null;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  const accessToken = signAccessToken(user.id, user.tokenVersion);
  const refreshToken = signRefreshToken(user.id, user.tokenVersion);

  return {
    user,
    accessToken,
    refreshToken
  };
}

export async function refreshToken(refreshToken: string) {
  const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as jwt.JwtPayload & { tv?: number };
  const user = await prisma.user.findUnique({
    where: { id: payload.sub as string },
    include: { role: true }
  });

  if (!user || user.status !== 'active' || (payload.tv ?? -1) !== user.tokenVersion) {
    return null;
  }

  return {
    user,
    accessToken: signAccessToken(user.id, user.tokenVersion),
    refreshToken: signRefreshToken(user.id, user.tokenVersion)
  };
}

export async function revokeCurrentSession(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } }
  });
}

export function generateApiTokenValue() {
  return crypto.randomBytes(32).toString('hex');
}
