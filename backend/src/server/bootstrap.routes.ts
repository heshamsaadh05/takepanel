import crypto from 'node:crypto';
import { Router, type Request } from 'express';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { fail, ok } from '../lib/http';

type BootstrapService = {
  key: string;
  name: string;
  status: string;
  description: string;
  version?: string | null;
  port?: number | null;
};

function readBootstrapToken(req: Request) {
  return String(req.query.token ?? req.header('x-hostmaster-bootstrap-token') ?? '');
}

function isBootstrapTokenValid(receivedToken: string) {
  const expectedToken = env.BOOTSTRAP_TOKEN.trim();
  if (!expectedToken) {
    return false;
  }

  const received = Buffer.from(receivedToken);
  const expected = Buffer.from(expectedToken);
  if (received.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(received, expected);
}

function buildPanelServices(): BootstrapService[] {
  return [
    {
      key: 'hostmaster-backend',
      name: 'HostMaster Backend API',
      status: 'running',
      description: 'REST API, authentication, and dashboard endpoints',
      version: `port ${env.PORT}`,
      port: env.PORT
    },
    {
      key: 'hostmaster-worker',
      name: 'HostMaster Task Worker',
      status: 'running',
      description: 'Background jobs and queued operations',
      version: 'worker'
    },
    {
      key: 'hostmaster-agent',
      name: 'HostMaster System Agent',
      status: 'running',
      description: 'Privileged system operations and service orchestration',
      version: `port ${new URL(env.AGENT_URL).port || '9090'}`,
      port: Number(new URL(env.AGENT_URL).port || 9090)
    }
  ];
}

export const bootstrapRouter = Router();

bootstrapRouter.get('/summary', async (req, res) => {
  if (!env.BOOTSTRAP_TOKEN) {
    return fail(res, 404, 'bootstrap_unavailable', 'Bootstrap summary is unavailable.');
  }

  const token = readBootstrapToken(req);
  if (!isBootstrapTokenValid(token)) {
    return fail(res, 403, 'bootstrap_token_invalid', 'Invalid bootstrap token.');
  }

  const [users, roles, services] = await Promise.all([
    prisma.user.count(),
    prisma.role.count(),
    prisma.serverService.findMany({ orderBy: { name: 'asc' } })
  ]);

  const systemServices = services.map((service) => ({
    key: service.name,
    name: service.name,
    status: service.status,
    description: service.enabled ? 'Configured and enabled' : 'Configured but disabled',
    version: service.version,
    port: service.port
  }));

  return ok(res, {
    generatedAt: new Date().toISOString(),
    panelUrl: env.APP_URL.replace(/\/$/, ''),
    loginUrl: `${env.APP_URL.replace(/\/$/, '')}/login`,
    login: {
      username: env.ADMIN_BOOTSTRAP_USERNAME,
      email: env.ADMIN_BOOTSTRAP_EMAIL,
      password: env.ADMIN_BOOTSTRAP_PASSWORD
    },
    counts: {
      users,
      roles,
      services: services.length + buildPanelServices().length
    },
    services: [...buildPanelServices(), ...systemServices],
    nextSteps: [
      'Open the login page and sign in with the seeded administrator account.',
      'Change the administrator password immediately after first sign-in.',
      'Review the dashboard, services, and package settings before creating new hosting accounts.'
    ]
  });
});
