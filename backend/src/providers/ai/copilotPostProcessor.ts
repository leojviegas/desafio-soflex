import {
  AnalisisCopiloto,
  MetadatosEjecucionIA,
  ProtocoloSubcategoria,
  Transcripcion,
  type DeteccionPreguntaIA,
} from '../../domain/index.js';
import type { ProtocoloRepository } from '../../repositories/index.js';
import type { LlmCopilotOutput } from '../../schemas/index.js';

export interface ConsolidarSalidaCopilotoParams {
  rawOutput: LlmCopilotOutput;
  transcripcionCruda: string;
  protocoloRepository: ProtocoloRepository;
  metadatos: MetadatosEjecucionIA;
  subcategoriaIdFijadaPorOperador?: number | null;
}

async function resolverSubcategoriaSegura(
  protocoloRepository: ProtocoloRepository,
  targetSubcategoriaId: number,
) {
  const encontrada =
    await protocoloRepository.findSubcategoriaById(targetSubcategoriaId);
  if (encontrada) {
    return encontrada;
  }

  const respaldoGeneral =
    await protocoloRepository.findSubcategoriaByNombre('general_otro');
  if (respaldoGeneral) {
    return respaldoGeneral;
  }

  const todas = await protocoloRepository.listarSubcategorias();
  const primera = todas[0];
  if (!primera) {
    throw new Error(
      'El catálogo de protocolos en SQLite no contiene subcategorías seedeadas.',
    );
  }
  return primera;
}

/**
 * Ejecuta el Paso 4 determinista conectando la salida estructurada (LLM o mock)
 * contra el catálogo oficial en SQLite y las reglas de dominio de `AnalisisCopiloto`.
 */
export async function consolidarSalidaCopiloto({
  rawOutput,
  transcripcionCruda,
  protocoloRepository,
  metadatos,
  subcategoriaIdFijadaPorOperador,
}: ConsolidarSalidaCopilotoParams): Promise<AnalisisCopiloto> {
  const targetSubcategoriaId =
    subcategoriaIdFijadaPorOperador &&
    Number.isInteger(subcategoriaIdFijadaPorOperador) &&
    subcategoriaIdFijadaPorOperador > 0
      ? subcategoriaIdFijadaPorOperador
      : rawOutput.subcategoriaId;

  const subcategoria = await resolverSubcategoriaSegura(
    protocoloRepository,
    targetSubcategoriaId,
  );
  const categoria = await protocoloRepository.findCategoriaById(
    subcategoria.categoriaId,
  );
  if (!categoria) {
    throw new Error(
      `No se encontró la categoría padre ${subcategoria.categoriaId} para la subcategoría ${subcategoria.id}.`,
    );
  }

  const [preguntas, instruccionesPreArribo] = await Promise.all([
    protocoloRepository.findPreguntasParaSubcategoria(subcategoria.id),
    protocoloRepository.findInstruccionesPreArribo(subcategoria.id),
  ]);

  const preguntasUniversales = preguntas.filter((p) => p.esUniversal);
  const preguntasEspecificas = preguntas.filter((p) => !p.esUniversal);

  const protocolo = new ProtocoloSubcategoria({
    categoria,
    subcategoria,
    preguntasUniversales,
    preguntasEspecificas,
    instruccionesPreArribo,
  });

  const transcripcion = new Transcripcion(transcripcionCruda);
  const preguntasDetectadas: DeteccionPreguntaIA[] =
    rawOutput.preguntasDetectadas.map((item) => ({
      preguntaId: item.preguntaId,
      estado: item.estado,
      respuestaExtraida: item.respuestaExtraida,
      citaEvidencia: item.citaEvidencia,
    }));

  return AnalisisCopiloto.consolidarDesdeDetecciones({
    protocolo,
    transcripcion,
    descripcionIncidente: rawOutput.descripcionIncidente,
    ubicacion: rawOutput.ubicacion,
    prioridadSugerida: rawOutput.prioridadSugerida,
    preguntasDetectadas,
    riesgosDetectados: rawOutput.riesgosDetectados,
    recursosRecomendadosDespacho: rawOutput.recursosRecomendadosDespacho,
    notasOperativasDespacho: rawOutput.notasOperativasDespacho,
    confianzaGlobal: rawOutput.confianzaGlobal,
    metadatos,
  });
}
