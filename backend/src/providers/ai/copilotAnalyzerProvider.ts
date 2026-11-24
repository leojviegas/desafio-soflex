import type {
  AnalisisCopiloto,
  OrigenReporte,
  ProveedorIA,
} from '../../domain/index.js';

export interface AnalyzeCallInput {
  transcripcionCruda: string;
  origenReporte?: OrigenReporte;
  subcategoriaIdFijadaPorOperador?: number | null;
  simularDegradado?: boolean;
}

export interface CopilotAnalyzerMetadata {
  readonly provider: ProveedorIA;
  readonly model: string;
  readonly fallbackEnabled: boolean;
}

/**
 * Contrato único desacoplado de proveedor para analizar transcripciones de llamadas.
 */
export interface CopilotAnalyzerProvider {
  analyze(input: AnalyzeCallInput): Promise<AnalisisCopiloto>;
  getMetadata(): CopilotAnalyzerMetadata;
}
