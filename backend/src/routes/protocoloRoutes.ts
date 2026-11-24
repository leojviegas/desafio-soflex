import { Router } from 'express';
import type { ProtocoloController } from '../controllers/index.js';

export function buildProtocoloRouter(controller: ProtocoloController): Router {
  const router = Router();
  router.get('/', controller.getProtocolos);
  return router;
}
