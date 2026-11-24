import type {
  CasoReferenciaCsvSnapshot,
  DatasetReferenciaRepository,
} from '../repositories/index.js';

/**
 * Servicio de consulta para los 30 casos sintéticos cargados desde CSV.
 */
export class DatasetService {
  constructor(
    private readonly datasetRepository: DatasetReferenciaRepository,
  ) {}

  listarCasosReferencia(): CasoReferenciaCsvSnapshot[] {
    return this.datasetRepository.findAll().map((caso) => caso.toJSON());
  }
}
