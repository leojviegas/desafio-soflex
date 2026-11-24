import {
  esCampoEditableLlamada,
  type CampoEditableLlamada,
} from '../enums/campoEditableLlamada.js';
import { DomainValidationError } from '../errors/DomainError.js';

/**
 * Registro inmutable de los campos editados manualmente por el operador
 * para protegerlos ante re-análisis del copiloto IA (Human-in-the-Loop).
 */
export class RegistroEdicionesOperador {
  private readonly campos: ReadonlySet<CampoEditableLlamada>;

  private constructor(campos: ReadonlySet<CampoEditableLlamada>) {
    this.campos = campos;
  }

  static vacio(): RegistroEdicionesOperador {
    return new RegistroEdicionesOperador(new Set());
  }

  static desdeStrings(valores: readonly string[]): RegistroEdicionesOperador {
    const set = new Set<CampoEditableLlamada>();
    for (const valor of valores) {
      if (!esCampoEditableLlamada(valor)) {
        throw new DomainValidationError(
          `Campo editable inválido en registro de ediciones: "${valor}".`,
          { campo: valor },
        );
      }
      set.add(valor);
    }
    return new RegistroEdicionesOperador(set);
  }

  registrar(...nuevosCampos: CampoEditableLlamada[]): RegistroEdicionesOperador {
    if (nuevosCampos.length === 0) {
      return this;
    }
    const next = new Set(this.campos);
    for (const campo of nuevosCampos) {
      next.add(campo);
    }
    return new RegistroEdicionesOperador(next);
  }

  estaProtegido(campo: CampoEditableLlamada): boolean {
    return this.campos.has(campo);
  }

  toArray(): CampoEditableLlamada[] {
    return [...this.campos];
  }
}
