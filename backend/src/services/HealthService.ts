import type { LlmProviderType } from '../config/env.js';
import type { ProveedorIA } from '../domain/index.js';
import type { CopilotAnalyzerProvider } from '../providers/ai/index.js';
import type {
  DatasetReferenciaRepository,
  ProtocoloRepository,
} from '../repositories/index.js';

export interface HealthStatusDto {
  status: 'ok' | 'degraded';
  ai: {
    provider: ProveedorIA;
    model: string;
    fallbackEnabled: boolean;
  };
  catalog: {
    categorias: number;
    subcategorias: number;
  };
  datasetLoaded: number;
}

export interface HealthServiceDeps {
  protocoloRepository: ProtocoloRepository;
  datasetRepository: DatasetReferenciaRepository;
  copilotAnalyzer: CopilotAnalyzerProvider;
  configuredProvider: LlmProviderType;
}

/**
 * Expone el estado operativo del backend, el catálogo SQLite, el dataset CSV
 * y el proveedor de IA activo.
 */
export class HealthService {
  private readonly protocoloRepository: ProtocoloRepository;
  private readonly datasetRepository: DatasetReferenciaRepository;
  private readonly copilotAnalyzer: CopilotAnalyzerProvider;
  private readonly configuredProvider: LlmProviderType;

  constructor(deps: HealthServiceDeps) {
    this.protocoloRepository = deps.protocoloRepository;
    this.datasetRepository = deps.datasetRepository;
    this.copilotAnalyzer = deps.copilotAnalyzer;
    this.configuredProvider = deps.configuredProvider;
  }

  async obtenerEstado(): Promise<HealthStatusDto> {
    const [categorias, subcategorias] = await Promise.all([
      this.protocoloRepository.countCategorias(),
      this.protocoloRepository.countSubcategorias(),
    ]);
    const datasetLoaded = this.datasetRepository.count();
    const aiMeta = this.copilotAnalyzer.getMetadata();

    const degraded =
      (this.configuredProvider !== 'mock' && aiMeta.provider === 'mock') ||
      categorias === 0 ||
      subcategorias === 0;

    return {
      status: degraded ? 'degraded' : 'ok',
      ai: {
        provider: aiMeta.provider,
        model: aiMeta.model,
        fallbackEnabled: aiMeta.fallbackEnabled,
      },
      catalog: {
        categorias,
        subcategorias,
      },
      datasetLoaded,
    };
  }
}
