import { Router } from 'express';
import { ok } from '../lib/http';

export function createPlaceholderRouter(section: string, endpoints: string[]) {
  const router = Router();

  router.get('/', (_req, res) => ok(res, {
    section,
    status: 'scaffolded',
    endpoints
  }));

  return router;
}
