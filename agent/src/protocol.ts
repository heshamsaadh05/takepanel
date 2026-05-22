import { z } from 'zod';

export const agentOperationSchema = z.object({
  operation: z.string().min(1),
  payload: z.record(z.unknown()).default({})
});

export type AgentResult = {
  success: boolean;
  stdout: string;
  stderr: string;
  data: Record<string, unknown>;
  durationMs: number;
};

export function makeResult(partial: Partial<AgentResult>): AgentResult {
  return {
    success: partial.success ?? false,
    stdout: partial.stdout ?? '',
    stderr: partial.stderr ?? '',
    data: partial.data ?? {},
    durationMs: partial.durationMs ?? 0
  };
}
