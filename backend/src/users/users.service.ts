import { prisma } from '../lib/prisma';
import { hashPassword } from '../auth/auth.service';

export async function listUsers() {
  return prisma.user.findMany({
    include: { role: true },
    orderBy: { createdAt: 'desc' }
  });
}

export async function createUser(data: {
  username: string;
  email: string;
  password: string;
  roleId: string;
  locale?: string;
  theme?: string;
}) {
  const passwordHash = await hashPassword(data.password);
  return prisma.user.create({
    data: {
      username: data.username,
      email: data.email.toLowerCase(),
      passwordHash,
      roleId: data.roleId,
      locale: data.locale ?? 'en',
      theme: data.theme ?? 'dark'
    },
    include: { role: true }
  });
}

export async function getUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { role: true, resellerProfile: true }
  });
}

export async function updateUser(id: string, data: Partial<{
  username: string;
  email: string;
  roleId: string;
  status: 'active' | 'suspended' | 'pending' | 'deleted';
  locale: string;
  theme: string;
}>) {
  return prisma.user.update({
    where: { id },
    data,
    include: { role: true }
  });
}

export async function removeUser(id: string) {
  return prisma.user.update({
    where: { id },
    data: { status: 'deleted' }
  });
}
