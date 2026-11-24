import type { CasoReferenciaCsv } from '../domain/index.js';

export interface DatasetReferenciaRepository {
  findAll(): CasoReferenciaCsv[];
  findById(idRegistro: string): CasoReferenciaCsv | null;
  findByCategoria(categoria: string): CasoReferenciaCsv[];
  count(): number;
}
