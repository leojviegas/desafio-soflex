import type { Express } from 'express';
import { createApp } from './app.js';
import { loadConfig, type AppConfig } from './config/index.js';
import {
  CartaDespachoController,
  DatasetController,
  HealthController,
  LlamadaController,
  ProtocoloController,
} from './controllers/index.js';
import {
  buildCopilotAnalyzer,
  type CopilotAnalyzerProvider,
} from './providers/ai/index.js';
import {
  type CartaDespachoRepository,
  CsvDatasetReferenciaRepository,
  type DatasetReferenciaRepository,
  type LlamadaRepository,
  openSqliteDatabase,
  type ProtocoloRepository,
  SqliteCartaDespachoRepository,
  SqliteLlamadaRepository,
  SqliteProtocoloRepository,
} from './repositories/index.js';
import { buildApiRouter } from './routes/index.js';
import {
  CartaDespachoService,
  DatasetService,
  HealthService,
  LlamadaService,
  ProtocoloService,
} from './services/index.js';

export interface BuildAppOptions {
  config?: AppConfig;
  copilotAnalyzer?: CopilotAnalyzerProvider;
  datasetRepository?: DatasetReferenciaRepository;
  logger?: Pick<Console, 'info' | 'warn' | 'error'>;
}

export interface BuiltApp {
  app: Express;
  config: AppConfig;
  close: () => void;
  repositories: {
    protocoloRepository: ProtocoloRepository;
    llamadaRepository: LlamadaRepository;
    cartaDespachoRepository: CartaDespachoRepository;
    datasetRepository: DatasetReferenciaRepository;
  };
  services: {
    healthService: HealthService;
    protocoloService: ProtocoloService;
    datasetService: DatasetService;
    llamadaService: LlamadaService;
    cartaDespachoService: CartaDespachoService;
  };
}

/**
 * Composition root único: carga configuración, inicializa SQLite + CSV,
 * instancia proveedor IA, servicios, controladores y aplicación Express.
 */
export function buildApp(options: BuildAppOptions = {}): BuiltApp {
  const logger = options.logger ?? console;
  const config = options.config ?? loadConfig();
  const db = openSqliteDatabase(config.databasePath);

  let closed = false;
  const close = (): void => {
    if (!closed) {
      closed = true;
      db.close();
    }
  };

  try {
    const protocoloRepository = new SqliteProtocoloRepository(db);
    const llamadaRepository = new SqliteLlamadaRepository(db);
    const cartaDespachoRepository = new SqliteCartaDespachoRepository(db);
    const datasetRepository =
      options.datasetRepository ??
      CsvDatasetReferenciaRepository.fromFile(config.datasetCsvPath);

    const copilotAnalyzer =
      options.copilotAnalyzer ??
      buildCopilotAnalyzer({
        llmConfig: config.llm,
        protocoloRepository,
        datasetRepository,
        logger,
      });

    const healthService = new HealthService({
      protocoloRepository,
      datasetRepository,
      copilotAnalyzer,
      configuredProvider: config.llm.provider,
    });
    const protocoloService = new ProtocoloService(protocoloRepository);
    const datasetService = new DatasetService(datasetRepository);
    const llamadaService = new LlamadaService({
      llamadaRepository,
      cartaDespachoRepository,
      protocoloRepository,
      copilotAnalyzer,
    });
    const cartaDespachoService = new CartaDespachoService(
      cartaDespachoRepository,
    );

    const apiRouter = buildApiRouter({
      healthController: new HealthController(healthService),
      protocoloController: new ProtocoloController(protocoloService),
      datasetController: new DatasetController(datasetService),
      llamadaController: new LlamadaController(llamadaService),
      cartaDespachoController: new CartaDespachoController(
        cartaDespachoService,
      ),
    });

    const app = createApp(apiRouter, { logger });

    return {
      app,
      config,
      close,
      repositories: {
        protocoloRepository,
        llamadaRepository,
        cartaDespachoRepository,
        datasetRepository,
      },
      services: {
        healthService,
        protocoloService,
        datasetService,
        llamadaService,
        cartaDespachoService,
      },
    };
  } catch (error) {
    close();
    throw error;
  }
}
