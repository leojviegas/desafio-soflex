import { Router } from 'express';
import type {
  CartaDespachoController,
  DatasetController,
  HealthController,
  LlamadaController,
  ProtocoloController,
} from '../controllers/index.js';
import { buildCartaDespachoRouter } from './cartaDespachoRoutes.js';
import { buildDatasetRouter } from './datasetRoutes.js';
import { buildHealthRouter } from './healthRoutes.js';
import { buildLlamadaRouter } from './llamadaRoutes.js';
import { buildProtocoloRouter } from './protocoloRoutes.js';

export interface ApiControllers {
  healthController: HealthController;
  protocoloController: ProtocoloController;
  datasetController: DatasetController;
  llamadaController: LlamadaController;
  cartaDespachoController: CartaDespachoController;
}

export function buildApiRouter(controllers: ApiControllers): Router {
  const router = Router();

  router.use('/health', buildHealthRouter(controllers.healthController));
  router.use('/protocolos', buildProtocoloRouter(controllers.protocoloController));
  router.use('/dataset', buildDatasetRouter(controllers.datasetController));
  router.use('/llamadas', buildLlamadaRouter(controllers.llamadaController));
  router.use(
    '/cartas-despacho',
    buildCartaDespachoRouter(controllers.cartaDespachoController),
  );

  return router;
}

export {
  buildCartaDespachoRouter,
  buildDatasetRouter,
  buildHealthRouter,
  buildLlamadaRouter,
  buildProtocoloRouter,
};
