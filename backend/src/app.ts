import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';

import { env } from './config/env';
import { logger } from './lib/logger';
import { errorHandler } from './middleware/error-handler';
import { authRouter } from './auth/auth.routes';
import { usersRouter } from './users/users.routes';
import { rolesRouter } from './roles/roles.routes';
import { dashboardRouter } from './dashboard/dashboard.routes';
import { healthRouter } from './server/health.routes';
import { createPlaceholderRouter } from './common/placeholder';

export const app = express();
const apiPrefix = env.API_PREFIX.replace(/\/$/, '') || '/api';

app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(pinoHttp({ logger }));

app.use(rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false
}));

app.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      app: env.APP_NAME,
      status: 'ok',
      docs: '/docs'
    }
  });
});

app.use(`${apiPrefix}/health`, healthRouter);
app.use(`${apiPrefix}/auth`, authRouter);
app.use(`${apiPrefix}/users`, usersRouter);
app.use(`${apiPrefix}/roles`, rolesRouter);
app.use(`${apiPrefix}/dashboard`, dashboardRouter);

const placeholderModules: Array<[string, string[]]> = [
  [`${apiPrefix}/accounts`, ['GET /api/accounts', 'POST /api/accounts', 'PATCH /api/accounts/:id']],
  [`${apiPrefix}/packages`, ['GET /api/packages', 'POST /api/packages']],
  [`${apiPrefix}/resellers`, ['GET /api/resellers', 'POST /api/resellers']],
  [`${apiPrefix}/domains`, ['GET /api/domains', 'POST /api/domains']],
  [`${apiPrefix}/dns`, ['GET /api/dns/zones', 'POST /api/dns/zones']],
  [`${apiPrefix}/email`, ['GET /api/email/accounts', 'POST /api/email/accounts']],
  [`${apiPrefix}/databases`, ['GET /api/databases', 'POST /api/databases']],
  [`${apiPrefix}/files`, ['GET /api/files/list', 'POST /api/files/upload']],
  [`${apiPrefix}/ssl`, ['GET /api/ssl/certificates', 'POST /api/ssl/issue']],
  [`${apiPrefix}/backups`, ['GET /api/backups', 'POST /api/backups/run']],
  [`${apiPrefix}/metrics`, ['GET /api/metrics/server', 'GET /api/metrics/services']],
  [`${apiPrefix}/security`, ['GET /api/security/events', 'GET /api/security/audit-logs']],
  [`${apiPrefix}/services`, ['GET /api/services', 'POST /api/services/:name/restart']],
  [`${apiPrefix}/php`, ['GET /api/php/versions', 'PATCH /api/domains/:id/php-version']],
  [`${apiPrefix}/notifications`, ['GET /api/notifications', 'PATCH /api/notifications/:id/read']],
  [`${apiPrefix}/audit`, ['GET /api/security/audit-logs']],
  [`${apiPrefix}/api-tokens`, ['GET /api/api-tokens', 'POST /api/api-tokens']],
  [`${apiPrefix}/settings`, ['GET /api/settings', 'PATCH /api/settings']],
  [`${apiPrefix}/tasks`, ['GET /api/tasks', 'POST /api/tasks/:id/cancel']]
];

for (const [path, endpoints] of placeholderModules) {
  app.use(path, createPlaceholderRouter(path, endpoints));
}

app.use(errorHandler);
