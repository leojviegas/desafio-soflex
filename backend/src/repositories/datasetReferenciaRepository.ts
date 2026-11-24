import type { CasoReferenciaCsv } from './casoReferenciaCsv.js';

export interface DatasetReferenciaRepository {
  findAll(): CasoReferenciaCsv[];
  findById(idRegistro: string): CasoReferenciaCsv | null;
  findByCategoria(categoria: string): CasoReferenciaCsv[];
  count(): number;
}
