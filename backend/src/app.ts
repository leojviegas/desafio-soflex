import cors from 'cors';
import express, { type Express, type Router } from 'express';
import { createErrorHandler, notFoundHandler } from './middlewares/index.js';

export interface CreateAppOptions {
  logger?: Pick<Console, 'error'>;
}

/**
 * Configura la instancia de Express 5 con middlewares globales, rutas `/api`
 * y manejadores uniformes de 404 y errores.
 */
export function createApp(
  apiRouter: Router,
  options: CreateAppOptions = {},
): Express {
  const app = express();
  app.disable('x-powered-by');

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(createErrorHandler(options.logger));

  return app;
}
