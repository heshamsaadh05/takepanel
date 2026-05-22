import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const schema = z.object({
  HOSTMASTER_AGENT_PORT: z.coerce.number().int().positive().default(9090),
  HOSTMASTER_AGENT_TOKEN: z.string().min(24),
  HOSTMASTER_AGENT_MOCK: z.coerce.boolean().default(true)
});

export const env = schema.parse(process.env);
