import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';

export const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null
});

export const taskQueue = new Queue('hostmaster-tasks', {
  connection: redisConnection
});
