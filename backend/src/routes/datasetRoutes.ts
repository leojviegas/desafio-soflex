import { Router } from 'express';
import type { DatasetController } from '../controllers/index.js';

export function buildDatasetRouter(controller: DatasetController): Router {
  const router = Router();
  router.get('/llamadas', controller.getDatasetLlamadas);
  return router;
}
