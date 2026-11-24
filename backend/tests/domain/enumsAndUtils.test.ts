import { describe, expect, it } from 'vitest';
import {
  CampoEditableLlamada,
  CAMPOS_EDITABLES_LLAMADA,
  esCampoEditableLlamada,
  esEstadoLlamada,
  esEstadoPreguntaIA,
  esEstadoPreguntaOperador,
  esHablanteTurno,
  esNivelCerteza,
  esOrigenReporte,
  esPrioridadIncidente,
  esProveedorIA,
  EstadoLlamada,
  EstadoPreguntaIA,
  EstadoPreguntaOperador,
  ESTADOS_LLAMADA,
  ESTADOS_PREGUNTA_IA,
  ESTADOS_PREGUNTA_OPERADOR,
  HABLANTES_TURNO,
  HablanteTurno,
  limpiarTextoOpcional,
  NIVELES_CERTEZA,
  NivelCerteza,
  normalizarParaComparacion,
  ORIGENES_REPORTE,
  OrigenReporte,
  PRIORIDADES_INCIDENTE,
  PrioridadIncidente,
  PROVEEDORES_IA,
  ProveedorIA,
} from '../../src/domain/index.js';

describe('domain/enums y utils', () => {
  it('mantiene todos los enums congelados y con sus listas inmutables', () => {
    const enums = [
      OrigenReporte,
      EstadoLlamada,
      PrioridadIncidente,
      EstadoPreguntaIA,
      EstadoPreguntaOperador,
      NivelCerteza,
      ProveedorIA,
      HablanteTurno,
      CampoEditableLlamada,
    ];

    for (const enumObj of enums) {
      expect(Object.isFrozen(enumObj)).toBe(true);
    }

    expect(ORIGENES_REPORTE).toHaveLength(6);
    expect(ESTADOS_LLAMADA).toEqual(['EN_CURSO', 'DERIVADA', 'DESCARTADA']);
    expect(PRIORIDADES_INCIDENTE).toEqual(['P1', 'P2', 'P3', 'P4']);
    expect(ESTADOS_PREGUNTA_IA).toEqual(['RESPONDIDA', 'AMBIGUA', 'PENDIENTE']);
    expect(ESTADOS_PREGUNTA_OPERADOR).toEqual([
      'CONFIRMADA',
      'PENDIENTE',
      'NO_APLICA',
    ]);
    expect(NIVELES_CERTEZA).toEqual(['ALTA', 'MEDIA', 'BAJA']);
    expect(PROVEEDORES_IA).toHaveLength(5);
    expect(HABLANTES_TURNO).toEqual(['OPERADOR', 'LLAMANTE']);
    expect(CAMPOS_EDITABLES_LLAMADA).toHaveLength(12);
  });

  it('valida type guards correctamente y rechaza valores ajenos (incluido SISTEMA en HablanteTurno)', () => {
    expect(esOrigenReporte('TELEFONIA_911')).toBe(true);
    expect(esOrigenReporte('MI_ARGENTINA')).toBe(false);

    expect(esEstadoLlamada('EN_CURSO')).toBe(true);
    expect(esEstadoLlamada('CERRADA')).toBe(false);

    expect(esPrioridadIncidente('P4')).toBe(true);
    expect(esPrioridadIncidente('P5')).toBe(false);

    expect(esEstadoPreguntaIA('AMBIGUA')).toBe(true);
    expect(esEstadoPreguntaIA('CONFIRMADA')).toBe(false);

    expect(esEstadoPreguntaOperador('PENDIENTE')).toBe(true);
    expect(esEstadoPreguntaOperador('AMBIGUA')).toBe(false);

    expect(esNivelCerteza('ALTA')).toBe(true);
    expect(esNivelCerteza('MUY_ALTA')).toBe(false);

    expect(esProveedorIA('openai-compatible')).toBe(true);
    expect(esProveedorIA('anthropic')).toBe(false);

    expect(esHablanteTurno('OPERADOR')).toBe(true);
    expect(esHablanteTurno('LLAMANTE')).toBe(true);
    expect(esHablanteTurno('SISTEMA')).toBe(false);

    expect(esCampoEditableLlamada('ubicacion.calle')).toBe(true);
    expect(esCampoEditableLlamada('ubicacion.codigoPostal')).toBe(false);
  });

  it('normaliza texto removiendo tildes, signos y mayúsculas y limpia textos opcionales', () => {
    expect(
      normalizarParaComparacion('¡Sí! En Av. Corrientes 1540, casi Montevideo.'),
    ).toBe('si en av corrientes 1540 casi montevideo');

    expect(limpiarTextoOpcional('   ')).toBeNull();
    expect(limpiarTextoOpcional(undefined)).toBeNull();
    expect(limpiarTextoOpcional('  Palermo  ')).toBe('Palermo');
  });
});
