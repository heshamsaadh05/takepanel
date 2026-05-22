import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { defaultRolePermissions, permissionKeys } from '../src/config/permissions';
import { env } from '../src/config/env';

const prisma = new PrismaClient();

async function seedPermissions() {
  await Promise.all(
    permissionKeys.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: { description: key.replaceAll('.', ' ').replaceAll('_', ' ') },
        create: {
          key,
          description: key.replaceAll('.', ' ').replaceAll('_', ' ')
        }
      })
    )
  );
}

async function seedRoles() {
  await Promise.all(
    Object.entries(defaultRolePermissions).map(([name, permissions]) =>
      prisma.role.upsert({
        where: { name },
        update: {
          description: `${name.replaceAll('_', ' ')} role`,
          permissions
        },
        create: {
          name,
          description: `${name.replaceAll('_', ' ')} role`,
          permissions
        }
      })
    )
  );
}

async function seedAdmin() {
  const role = await prisma.role.findUnique({ where: { name: 'super_admin' } });
  if (!role) throw new Error('super_admin role missing');

  const passwordHash = await bcrypt.hash(env.ADMIN_BOOTSTRAP_PASSWORD, 12);

  return prisma.user.upsert({
    where: { email: env.ADMIN_BOOTSTRAP_EMAIL.toLowerCase() },
    update: {
      username: env.ADMIN_BOOTSTRAP_USERNAME,
      passwordHash,
      roleId: role.id,
      status: 'active',
      locale: env.DEFAULT_LOCALE,
      theme: env.DEFAULT_THEME
    },
    create: {
      username: env.ADMIN_BOOTSTRAP_USERNAME,
      email: env.ADMIN_BOOTSTRAP_EMAIL.toLowerCase(),
      passwordHash,
      roleId: role.id,
      status: 'active',
      locale: env.DEFAULT_LOCALE,
      theme: env.DEFAULT_THEME
    }
  });
}

async function seedPackage() {
  return prisma.package.upsert({
    where: { name: 'starter' },
    update: {},
    create: {
      name: 'starter',
      diskLimit: 10240,
      bandwidthLimit: 102400,
      maxDomains: 3,
      maxSubdomains: 10,
      maxParkedDomains: 2,
      maxAddonDomains: 3,
      maxEmailAccounts: 20,
      maxDatabases: 10,
      maxFtpAccounts: 5,
      maxCronJobs: 5,
      maxApiTokens: 5,
      maxInodes: 500000,
      featureSet: {
        ssl: true,
        ssh: true,
        phpVersions: ['8.1', '8.2', '8.3'],
        backups: true,
        terminal: true
      }
    }
  });
}

async function seedDemoData(ownerUserId: string, packageId: string) {
  const account = await prisma.hostingAccount.upsert({
    where: { username: 'demo' },
    update: {},
    create: {
      ownerUserId,
      username: 'demo',
      primaryDomain: 'demo.hostmaster.local',
      packageId,
      status: 'active',
      homeDirectory: '/home/demo',
      uid: 1001,
      gid: 1001,
      diskUsed: 512,
      diskLimit: 10240,
      bandwidthUsed: 1280,
      bandwidthLimit: 102400,
      inodeUsed: 1200,
      inodeLimit: 500000,
      ipAddress: '127.0.0.1',
      phpVersion: '8.3',
      notes: 'Demo hosting account'
    }
  });

  const domain = await prisma.domain.upsert({
    where: { domain: 'demo.hostmaster.local' },
    update: {},
    create: {
      accountId: account.id,
      domain: 'demo.hostmaster.local',
      type: 'primary',
      documentRoot: '/home/demo/public_html',
      sslEnabled: false,
      forceHttps: false,
      phpVersion: '8.3'
    }
  });

  await prisma.dnsZone.upsert({
    where: { domainId: domain.id },
    update: {},
    create: {
      domainId: domain.id,
      zoneName: 'demo.hostmaster.local',
      serial: 1,
      records: [
        { type: 'A', name: '@', value: '127.0.0.1', ttl: 3600 },
        { type: 'MX', name: '@', value: 'mail.demo.hostmaster.local', priority: 10, ttl: 3600 },
        { type: 'TXT', name: '@', value: 'v=spf1 +a +mx ~all', ttl: 3600 }
      ]
    }
  });

  await prisma.emailAccount.upsert({
    where: { email: 'info@demo.hostmaster.local' },
    update: {},
    create: {
      accountId: account.id,
      domainId: domain.id,
      localPart: 'info',
      email: 'info@demo.hostmaster.local',
      passwordHash: await bcrypt.hash('ChangeMe123!', 12),
      quotaMb: 1024,
      usedMb: 0,
      status: 'active'
    }
  });

  await prisma.database.upsert({
    where: {
      accountId_name: {
        accountId: account.id,
        name: 'demo_db'
      }
    },
    update: {},
    create: {
      accountId: account.id,
      name: 'demo_db',
      type: 'mysql',
      sizeMb: 5
    }
  });

  await prisma.databaseUser.upsert({
    where: {
      accountId_username: {
        accountId: account.id,
        username: 'demo_user'
      }
    },
    update: {},
    create: {
      accountId: account.id,
      username: 'demo_user',
      passwordHash: await bcrypt.hash('ChangeMe123!', 12),
      privileges: ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
    }
  });

  await prisma.ftpAccount.upsert({
    where: {
      accountId_username: {
        accountId: account.id,
        username: 'demo'
      }
    },
    update: {},
    create: {
      accountId: account.id,
      username: 'demo',
      homeDirectory: '/home/demo',
      quotaMb: 2048,
      status: 'active'
    }
  });

  await prisma.sslCertificate.upsert({
    where: {
      domainId_type: {
        domainId: domain.id,
        type: 'selfsigned'
      }
    },
    update: {},
    create: {
      domainId: domain.id,
      issuer: 'HostMaster',
      type: 'selfsigned',
      certificatePath: '/etc/ssl/demo.crt',
      privateKeyPath: '/etc/ssl/demo.key',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      autoRenew: false,
      status: 'active'
    }
  });

  await prisma.serverService.upsert({
    where: { name: 'nginx' },
    update: { status: 'running', port: 80, version: '1.26', enabled: true, lastCheckedAt: new Date() },
    create: { name: 'nginx', status: 'running', port: 80, version: '1.26', enabled: true, lastCheckedAt: new Date() }
  });

  await prisma.serverService.upsert({
    where: { name: 'postgresql' },
    update: { status: 'running', port: 5432, version: '16', enabled: true, lastCheckedAt: new Date() },
    create: { name: 'postgresql', status: 'running', port: 5432, version: '16', enabled: true, lastCheckedAt: new Date() }
  });

  await prisma.serverService.upsert({
    where: { name: 'postfix' },
    update: { status: 'running', port: 25, version: '3.8', enabled: true, lastCheckedAt: new Date() },
    create: { name: 'postfix', status: 'running', port: 25, version: '3.8', enabled: true, lastCheckedAt: new Date() }
  });

  await prisma.serverService.upsert({
    where: { name: 'bind' },
    update: { status: 'running', port: 53, version: '9.18', enabled: true, lastCheckedAt: new Date() },
    create: { name: 'bind', status: 'running', port: 53, version: '9.18', enabled: true, lastCheckedAt: new Date() }
  });
}

async function seedSettings() {
  const settings = [
    ['app.name', { value: 'HostMaster Panel' }],
    ['branding.primaryColor', { value: '#1d4ed8' }],
    ['branding.secondaryColor', { value: '#0f172a' }],
    ['defaults.locale', { value: env.DEFAULT_LOCALE }],
    ['defaults.theme', { value: env.DEFAULT_THEME }],
    ['system.mockMode', { value: env.MOCK_SYSTEM_MODE }],
    ['server.sharedIp', { value: '127.0.0.1' }],
    ['server.defaultNameservers', { value: ['ns1.hostmaster.local', 'ns2.hostmaster.local'] }]
  ] as const;

  await Promise.all(
    settings.map(([key, payload]) =>
      prisma.settings.upsert({
        where: { key },
        update: { value: payload.value },
        create: { key, value: payload.value }
      })
    )
  );
}

async function main() {
  await seedPermissions();
  await seedRoles();
  const admin = await seedAdmin();
  const starter = await seedPackage();
  await seedDemoData(admin.id, starter.id);
  await seedSettings();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
