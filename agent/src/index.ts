import crypto from 'node:crypto';
import http from 'node:http';
import { env } from './runtime-env';
import { allowedOperations } from './allowlist';
import { agentOperationSchema, makeResult } from './protocol';

function verifySignature(body: string, timestamp: string, signature: string) {
  if (!timestamp || !signature) return false;
  const age = Math.abs(Date.now() - Number(timestamp));
  if (Number.isNaN(age) || age > 5 * 60 * 1000) return false;
  const expected = crypto.createHmac('sha256', env.HOSTMASTER_AGENT_TOKEN).update(`${timestamp}.${body}`).digest('hex');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

async function handleExecute(body: string, headers: http.IncomingHttpHeaders) {
  if (headers['x-hostmaster-token'] !== env.HOSTMASTER_AGENT_TOKEN) {
    return { status: 401, body: makeResult({ success: false, stderr: 'invalid token' }) };
  }

  const timestamp = String(headers['x-hostmaster-timestamp'] ?? '');
  const signature = String(headers['x-hostmaster-signature'] ?? '');
  if (!verifySignature(body, timestamp, signature)) {
    return { status: 401, body: makeResult({ success: false, stderr: 'invalid signature' }) };
  }

  let json: unknown;
  try {
    json = JSON.parse(body || '{}');
  } catch {
    return { status: 400, body: makeResult({ success: false, stderr: 'invalid json' }) };
  }

  const parsed = agentOperationSchema.safeParse(json);
  if (!parsed.success) {
    return { status: 400, body: makeResult({ success: false, stderr: 'invalid payload' }) };
  }

  const { operation, payload } = parsed.data;
  if (!allowedOperations.has(operation)) {
    return { status: 403, body: makeResult({ success: false, stderr: 'operation not allowed' }) };
  }

  const startedAt = Date.now();

  if (env.HOSTMASTER_AGENT_MOCK) {
    return {
      status: 200,
      body: makeResult({
        success: true,
        stdout: `Mocked execution for ${operation}`,
        data: { operation, payload },
        durationMs: Date.now() - startedAt
      })
    };
  }

  return {
    status: 200,
    body: makeResult({
      success: true,
      stdout: '',
      data: { operation, payload },
      durationMs: Date.now() - startedAt
    })
  };
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: { status: 'ok', mock: env.HOSTMASTER_AGENT_MOCK } }));
    return;
  }

  if (req.method === 'POST' && req.url === '/execute') {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', async () => {
      const body = Buffer.concat(chunks).toString('utf8');
      const result = await handleExecute(body, req.headers);
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.body));
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: 'not_found' }));
});

server.listen(env.HOSTMASTER_AGENT_PORT, () => {
  console.log(`HostMaster agent listening on ${env.HOSTMASTER_AGENT_PORT}`);
});
