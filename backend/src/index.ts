import { createServer } from 'node:http';
import { app } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';

const server = createServer(app);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, `${env.APP_NAME} API ready`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
