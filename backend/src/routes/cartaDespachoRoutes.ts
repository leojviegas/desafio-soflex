import { Router } from 'express';
import type { CartaDespachoController } from '../controllers/index.js';

export function buildCartaDespachoRouter(
  controller: CartaDespachoController,
): Router {
  const router = Router();
  router.get('/', controller.listar);
  router.get('/:id', controller.obtenerPorId);
  return router;
}
