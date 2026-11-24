import { Router } from 'express';
import type { LlamadaController } from '../controllers/index.js';

export function buildLlamadaRouter(controller: LlamadaController): Router {
  const router = Router();
  router.post('/', controller.crear);
  router.get('/', controller.listar);
  router.get('/:id', controller.obtenerPorId);
  router.post('/:id/turnos', controller.agregarTurno);
  router.post('/:id/analizar', controller.analizar);
  router.patch('/:id', controller.actualizar);
  router.post('/:id/derivar', controller.derivar);
  router.post('/:id/descartar', controller.descartar);
  return router;
}
