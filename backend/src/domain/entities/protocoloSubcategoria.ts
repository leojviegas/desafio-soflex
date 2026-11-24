import { DomainValidationError } from '../errors/DomainError.js';
import type { CategoriaProtocolo } from './categoriaProtocolo.js';
import type { InstruccionPreArriboDef } from './instruccionPreArriboDef.js';
import { ItemInstruccionPreArribo } from './itemInstruccionPreArribo.js';
import type { PreguntaProtocoloDef } from './preguntaProtocoloDef.js';
import type { SubcategoriaProtocolo } from './subcategoriaProtocolo.js';

export interface ProtocoloSubcategoriaProps {
  categoria: CategoriaProtocolo;
  subcategoria: SubcategoriaProtocolo;
  preguntasUniversales: readonly PreguntaProtocoloDef[];
  preguntasEspecificas: readonly PreguntaProtocoloDef[];
  instruccionesPreArribo: readonly InstruccionPreArriboDef[];
}

/**
 * Agrupación coherente del protocolo operativo completo de una subcategoría:
 * categoría padre, subcategoría, preguntas universales + específicas e instrucciones pre-arribo.
 */
export class ProtocoloSubcategoria {
  readonly categoria: CategoriaProtocolo;
  readonly subcategoria: SubcategoriaProtocolo;
  readonly preguntasUniversales: readonly PreguntaProtocoloDef[];
  readonly preguntasEspecificas: readonly PreguntaProtocoloDef[];
  readonly instruccionesPreArribo: readonly InstruccionPreArriboDef[];

  constructor({
    categoria,
    subcategoria,
    preguntasUniversales,
    preguntasEspecificas,
    instruccionesPreArribo,
  }: ProtocoloSubcategoriaProps) {
    if (subcategoria.categoriaId !== categoria.id) {
      throw new DomainValidationError(
        `La subcategoría "${subcategoria.nombre}" no pertenece a la categoría "${categoria.nombre}".`,
        { categoriaId: categoria.id, subcategoriaCategoriaId: subcategoria.categoriaId },
      );
    }

    for (const p of preguntasUniversales) {
      if (!p.esUniversal) {
        throw new DomainValidationError(
          `La pregunta ${p.id} no es universal (subcategoriaId=${p.subcategoriaId}).`,
          { preguntaId: p.id },
        );
      }
    }

    for (const p of preguntasEspecificas) {
      if (p.subcategoriaId !== subcategoria.id) {
        throw new DomainValidationError(
          `La pregunta ${p.id} no pertenece a la subcategoría ${subcategoria.id}.`,
          { preguntaId: p.id, subcategoriaId: subcategoria.id },
        );
      }
    }

    for (const i of instruccionesPreArribo) {
      if (i.subcategoriaId !== subcategoria.id) {
        throw new DomainValidationError(
          `La instrucción pre-arribo ${i.id} no pertenece a la subcategoría ${subcategoria.id}.`,
          { instruccionId: i.id, subcategoriaId: subcategoria.id },
        );
      }
    }

    this.categoria = categoria;
    this.subcategoria = subcategoria;
    this.preguntasUniversales = Object.freeze([...preguntasUniversales]);
    this.preguntasEspecificas = Object.freeze([...preguntasEspecificas]);
    this.instruccionesPreArribo = Object.freeze([...instruccionesPreArribo]);
  }

  /**
   * Devuelve todas las preguntas aplicables (universales primero, luego específicas).
   */
  todasLasPreguntas(): PreguntaProtocoloDef[] {
    return [...this.preguntasUniversales, ...this.preguntasEspecificas];
  }

  /**
   * Genera las instrucciones pre-arribo iniciales sin transmitir (`transmitida: false`),
   * preservando el estado previo si se provee la lista anterior.
   */
  crearInstruccionesIniciales(
    previas: readonly ItemInstruccionPreArribo[] = [],
  ): ItemInstruccionPreArribo[] {
    const transmitidasPrevias = new Map<number, boolean>(
      previas.map((item) => [item.instruccionId, item.transmitida]),
    );

    return this.instruccionesPreArribo.map(
      (def) =>
        new ItemInstruccionPreArribo({
          instruccionId: def.id,
          texto: def.texto,
          critica: def.critica,
          transmitida: transmitidasPrevias.get(def.id) ?? false,
        }),
    );
  }
}
