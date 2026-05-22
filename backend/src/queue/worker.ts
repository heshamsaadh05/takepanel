import { Worker } from 'bullmq';
import { redisConnection } from './index';
import { logger } from '../lib/logger';
import { SystemAgentClient } from '../services/system-agent.client';

const agentClient = new SystemAgentClient();

const worker = new Worker('hostmaster-tasks', async (job) => {
  logger.info({ jobId: job.id, name: job.name, data: job.data }, 'Processing task');
  if (typeof job.data?.operation === 'string') {
    return agentClient.execute({
      operation: job.data.operation,
      payload: job.data.payload ?? {}
    });
  }

  return {
    success: true,
    stdout: 'Task completed in mock mode',
    stderr: '',
    data: job.data ?? {},
    durationMs: 0
  };
}, { connection: redisConnection });

worker.on('completed', (job) => logger.info({ jobId: job.id }, 'Task completed'));
worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'Task failed'));
