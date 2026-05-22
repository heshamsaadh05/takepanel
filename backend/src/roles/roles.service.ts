import { prisma } from '../lib/prisma';

export async function listRoles() {
  return prisma.role.findMany({ orderBy: { name: 'asc' } });
}

export async function createRole(data: { name: string; description?: string; permissions: string[] }) {
  return prisma.role.create({
    data: {
      name: data.name,
      description: data.description,
      permissions: data.permissions
    }
  });
}

export async function updateRole(id: string, data: Partial<{ name: string; description?: string; permissions: string[] }>) {
  return prisma.role.update({
    where: { id },
    data
  });
}

export async function deleteRole(id: string) {
  return prisma.role.delete({ where: { id } });
}
