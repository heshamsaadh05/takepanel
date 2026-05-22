import crypto from 'node:crypto';
import { env } from '../config/env';

export type AgentOperation = {
  operation: string;
  payload?: Record<string, unknown>;
};

export type AgentResult = {
  success: boolean;
  stdout: string;
  stderr: string;
  data: Record<string, unknown>;
  durationMs: number;
};

export class SystemAgentClient {
  constructor(
    private readonly baseUrl = env.AGENT_URL,
    private readonly token = env.AGENT_TOKEN
  ) {}

  async execute(input: AgentOperation): Promise<AgentResult> {
    const body = JSON.stringify({
      operation: input.operation,
      payload: input.payload ?? {}
    });
    const timestamp = String(Date.now());
    const signature = crypto.createHmac('sha256', this.token).update(`${timestamp}.${body}`).digest('hex');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.AGENT_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseUrl}/execute`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-hostmaster-token': this.token,
          'x-hostmaster-timestamp': timestamp,
          'x-hostmaster-signature': signature
        },
        body,
        signal: controller.signal
      });

      const data = (await response.json()) as AgentResult;
      if (!response.ok) {
        throw new Error(data?.stderr ?? `Agent request failed with status ${response.status}`);
      }

      return data;
    } finally {
      clearTimeout(timeout);
    }
  }
}
