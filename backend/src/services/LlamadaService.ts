import {
  CampoEditableLlamada,
  type CartaDespacho,
  type CartaDespachoSnapshot,
  EstadoLlamada,
  type HablanteTurno,
  InvalidStateTransitionError,
  Llamada,
  type LlamadaJson,
  type OrigenReporte,
  ProtocoloSubcategoria,
} from '../domain/index.js';
import type { CopilotAnalyzerProvider } from '../providers/ai/index.js';
import type {
  CartaDespachoRepository,
  ListarLlamadasFiltros,
  LlamadaRepository,
  ProtocoloRepository,
} from '../repositories/index.js';
import type { PatchLlamadaBody } from '../schemas/index.js';
import { BusinessRuleError, NotFoundError } from './errors/ServiceError.js';

export type LlamadaResponseDto = LlamadaJson & {
  cartaDespacho: CartaDespachoSnapshot | null;
};

export interface DerivarLlamadaResultDto {
  llamada: LlamadaResponseDto;
  cartaDespacho: CartaDespachoSnapshot;
}

export interface CrearLlamadaServiceInput {
  origenReporte: OrigenReporte;
  transcripcionCruda: string;
  analizarAhora?: boolean;
}

export interface AgregarTurnoServiceInput {
  hablante: HablanteTurno;
  texto: string;
  reanalizar?: boolean;
}

export interface LlamadaServiceDeps {
  llamadaRepository: LlamadaRepository;
  cartaDespachoRepository: CartaDespachoRepository;
  protocoloRepository: ProtocoloRepository;
  copilotAnalyzer: CopilotAnalyzerProvider;
}

/**
 * Orquesta el ciclo de vida completo de una `Llamada`, el análisis dual-provider,
 * la protección de ediciones humanas y la derivación formal a `CartaDespacho`.
 */
export class LlamadaService {
  private readonly llamadaRepository: LlamadaRepository;
  private readonly cartaDespachoRepository: CartaDespachoRepository;
  private readonly protocoloRepository: ProtocoloRepository;
  private readonly copilotAnalyzer: CopilotAnalyzerProvider;

  constructor(deps: LlamadaServiceDeps) {
    this.llamadaRepository = deps.llamadaRepository;
    this.cartaDespachoRepository = deps.cartaDespachoRepository;
    this.protocoloRepository = deps.protocoloRepository;
    this.copilotAnalyzer = deps.copilotAnalyzer;
  }

  private async serializarLlamada(
    llamada: Llamada,
    cartaPrevia?: CartaDespacho | null,
  ): Promise<LlamadaResponseDto> {
    let carta: CartaDespacho | null = cartaPrevia ?? null;
    if (cartaPrevia === undefined && llamada.estado === EstadoLlamada.DERIVADA) {
      carta = await this.cartaDespachoRepository.findByLlamadaId(llamada.id);
    }

    return {
      ...llamada.toJSON(),
      cartaDespacho: carta ? carta.toJSON() : null,
    };
  }

  private obtenerSubcategoriaFijada(llamada: Llamada): number | null {
    const editados = new Set<string>(llamada.camposEditadosPorOperador);
    if (
      editados.has(CampoEditableLlamada.SUBCATEGORIA_ID) ||
      editados.has(CampoEditableLlamada.CATEGORIA_ID)
    ) {
      return llamada.subcategoriaId;
    }
    return null;
  }

  private async construirProtocoloSubcategoria(
    subcategoriaId: number,
  ): Promise<ProtocoloSubcategoria> {
    const subcategoria =
      await this.protocoloRepository.findSubcategoriaById(subcategoriaId);
    if (!subcategoria) {
      throw new BusinessRuleError(
        `No existe la subcategoría con id ${subcategoriaId} en el catálogo.`,
        { subcategoriaId },
      );
    }

    const categoria = await this.protocoloRepository.findCategoriaById(
      subcategoria.categoriaId,
    );
    if (!categoria) {
      throw new BusinessRuleError(
        `No existe la categoría con id ${subcategoria.categoriaId} en el catálogo.`,
        { categoriaId: subcategoria.categoriaId },
      );
    }

    const [preguntasUniversales, todasSub, instruccionesPreArribo] =
      await Promise.all([
        this.protocoloRepository.findPreguntasUniversales(),
        this.protocoloRepository.findPreguntasParaSubcategoria(subcategoria.id),
        this.protocoloRepository.findInstruccionesPreArribo(subcategoria.id),
      ]);

    const preguntasEspecificas = todasSub.filter((p) => !p.esUniversal);

    return new ProtocoloSubcategoria({
      categoria,
      subcategoria,
      preguntasUniversales,
      preguntasEspecificas,
      instruccionesPreArribo,
    });
  }

  async crearLlamada(
    input: CrearLlamadaServiceInput,
  ): Promise<LlamadaResponseDto> {
    const llamada = Llamada.crear({
      origenReporte: input.origenReporte,
      transcripcionCruda: input.transcripcionCruda,
    });

    if (input.analizarAhora) {
      const analisis = await this.copilotAnalyzer.analyze({
        transcripcionCruda: llamada.transcripcionCruda,
        origenReporte: llamada.origenReporte,
      });
      llamada.aplicarAnalisis(analisis);
    }

    await this.llamadaRepository.save(llamada);
    return this.serializarLlamada(llamada, null);
  }

  async listarLlamadas(
    filtros?: ListarLlamadasFiltros,
  ): Promise<LlamadaResponseDto[]> {
    const llamadas = await this.llamadaRepository.findAll(filtros);
    return Promise.all(llamadas.map((llamada) => this.serializarLlamada(llamada)));
  }

  async obtenerLlamadaPorId(id: string): Promise<LlamadaResponseDto> {
    const llamada = await this.llamadaRepository.findById(id);
    if (!llamada) {
      throw new NotFoundError(`No se encontró la llamada con id "${id}".`, {
        llamadaId: id,
      });
    }
    return this.serializarLlamada(llamada);
  }

  async agregarTurno(
    id: string,
    input: AgregarTurnoServiceInput,
  ): Promise<LlamadaResponseDto> {
    const llamada = await this.llamadaRepository.findById(id);
    if (!llamada) {
      throw new NotFoundError(`No se encontró la llamada con id "${id}".`, {
        llamadaId: id,
      });
    }

    llamada.agregarTurno({
      hablante: input.hablante,
      texto: input.texto,
    });

    if (input.reanalizar) {
      const analisis = await this.copilotAnalyzer.analyze({
        transcripcionCruda: llamada.transcripcionCruda,
        origenReporte: llamada.origenReporte,
        subcategoriaIdFijadaPorOperador: this.obtenerSubcategoriaFijada(llamada),
      });
      llamada.aplicarAnalisis(analisis);
    }

    await this.llamadaRepository.save(llamada);
    return this.serializarLlamada(llamada, null);
  }

  async analizarLlamada(
    id: string,
    opciones?: { simularDegradado?: boolean },
  ): Promise<LlamadaResponseDto> {
    const llamada = await this.llamadaRepository.findById(id);
    if (!llamada) {
      throw new NotFoundError(`No se encontró la llamada con id "${id}".`, {
        llamadaId: id,
      });
    }

    if (llamada.estado !== EstadoLlamada.EN_CURSO) {
      throw new InvalidStateTransitionError(
        `No se puede analizar porque la llamada "${llamada.id}" está en estado ${llamada.estado}.`,
        {
          llamadaId: llamada.id,
          estadoActual: llamada.estado,
          accion: 'analizar la llamada',
        },
      );
    }

    const analisis = await this.copilotAnalyzer.analyze({
      transcripcionCruda: llamada.transcripcionCruda,
      origenReporte: llamada.origenReporte,
      subcategoriaIdFijadaPorOperador: this.obtenerSubcategoriaFijada(llamada),
      simularDegradado: opciones?.simularDegradado,
    });

    llamada.aplicarAnalisis(analisis);
    await this.llamadaRepository.save(llamada);
    return this.serializarLlamada(llamada, null);
  }

  async actualizarPorOperador(
    id: string,
    cambios: PatchLlamadaBody,
  ): Promise<LlamadaResponseDto> {
    const llamada = await this.llamadaRepository.findById(id);
    if (!llamada) {
      throw new NotFoundError(`No se encontró la llamada con id "${id}".`, {
        llamadaId: id,
      });
    }

    if (llamada.estado !== EstadoLlamada.EN_CURSO) {
      throw new InvalidStateTransitionError(
        `No se puede editar porque la llamada "${llamada.id}" está en estado ${llamada.estado}.`,
        {
          llamadaId: llamada.id,
          estadoActual: llamada.estado,
          accion: 'editar la llamada',
        },
      );
    }

    if (cambios.categoriaId !== undefined) {
      const cat = await this.protocoloRepository.findCategoriaById(
        cambios.categoriaId,
      );
      if (!cat) {
        throw new BusinessRuleError(
          `No existe la categoría con id ${cambios.categoriaId} en el catálogo.`,
          { categoriaId: cambios.categoriaId },
        );
      }
    }

    if (cambios.subcategoriaId !== undefined) {
      const protocolo = await this.construirProtocoloSubcategoria(
        cambios.subcategoriaId,
      );
      if (
        cambios.categoriaId !== undefined &&
        cambios.categoriaId !== protocolo.categoria.id
      ) {
        throw new BusinessRuleError(
          `La subcategoría ${cambios.subcategoriaId} no pertenece a la categoría ${cambios.categoriaId}.`,
          {
            categoriaId: cambios.categoriaId,
            subcategoriaId: cambios.subcategoriaId,
          },
        );
      }

      if (
        llamada.subcategoriaId !== protocolo.subcategoria.id ||
        llamada.checklist.length === 0
      ) {
        llamada.cambiarProtocoloPorOperador(protocolo);
      }
    } else if (cambios.categoriaId !== undefined) {
      if (
        llamada.categoriaId !== cambios.categoriaId ||
        llamada.subcategoriaId === null
      ) {
        const subs = await this.protocoloRepository.listarSubcategorias(
          cambios.categoriaId,
        );
        const primera = subs[0];
        if (!primera) {
          throw new BusinessRuleError(
            `La categoría ${cambios.categoriaId} no posee subcategorías disponibles.`,
            { categoriaId: cambios.categoriaId },
          );
        }
        const protocolo = await this.construirProtocoloSubcategoria(primera.id);
        llamada.cambiarProtocoloPorOperador(protocolo);
      }
    }

    const tieneOtrosCampos =
      cambios.transcripcionCruda !== undefined ||
      cambios.ubicacion !== undefined ||
      cambios.descripcionIncidente !== undefined ||
      cambios.prioridad !== undefined ||
      cambios.checklist !== undefined ||
      cambios.instruccionesPreArribo !== undefined ||
      cambios.riesgosDetectados !== undefined ||
      cambios.recursosRecomendadosDespacho !== undefined ||
      cambios.notasOperativasDespacho !== undefined;

    if (tieneOtrosCampos) {
      llamada.editarPorOperador({
        transcripcionCruda: cambios.transcripcionCruda,
        ubicacion: cambios.ubicacion,
        descripcionIncidente: cambios.descripcionIncidente,
        prioridad: cambios.prioridad,
        checklist: cambios.checklist,
        instruccionesPreArribo: cambios.instruccionesPreArribo,
        riesgosDetectados: cambios.riesgosDetectados,
        recursosRecomendadosDespacho: cambios.recursosRecomendadosDespacho,
        notasOperativasDespacho: cambios.notasOperativasDespacho,
      });
    }

    await this.llamadaRepository.save(llamada);
    return this.serializarLlamada(llamada, null);
  }

  async derivarLlamada(
    id: string,
    input?: { notasOperativasDespacho?: string },
  ): Promise<DerivarLlamadaResultDto> {
    const llamada = await this.llamadaRepository.findById(id);
    if (!llamada) {
      throw new NotFoundError(`No se encontró la llamada con id "${id}".`, {
        llamadaId: id,
      });
    }

    const cartaDespacho = llamada.derivar({
      notasOperativasDespacho: input?.notasOperativasDespacho,
    });

    await this.llamadaRepository.derivarAtomicamente(llamada, cartaDespacho);

    return {
      llamada: await this.serializarLlamada(llamada, cartaDespacho),
      cartaDespacho: cartaDespacho.toJSON(),
    };
  }

  async descartarLlamada(id: string): Promise<LlamadaResponseDto> {
    const llamada = await this.llamadaRepository.findById(id);
    if (!llamada) {
      throw new NotFoundError(`No se encontró la llamada con id "${id}".`, {
        llamadaId: id,
      });
    }

    llamada.descartar();
    await this.llamadaRepository.save(llamada);
    return this.serializarLlamada(llamada, null);
  }
}
