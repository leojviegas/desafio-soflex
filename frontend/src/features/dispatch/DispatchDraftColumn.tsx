import {
  AlertCircle,
  CheckCircle2,
  FileOutput,
  MapPin,
  Plus,
  SendHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FieldOriginTag, type FieldOrigin } from '../../components/FieldOriginTag';
import type { PatchLlamadaPayload } from '../../types/api';
import {
  PRIORIDAD_META,
  type CatalogoProtocolos,
  type Llamada,
  type PrioridadIncidente,
} from '../../types/domain';

interface DispatchDraftColumnProps {
  llamada: Llamada | null;
  catalogo: CatalogoProtocolos | null;
  analyzing: boolean;
  submitting: boolean;
  savingDraft?: boolean;
  onPatchLlamada: (payload: PatchLlamadaPayload) => Promise<void>;
  onRegisterFlush?: (flushFn: (() => Promise<void>) | null) => void;
  onDerivar: () => Promise<void>;
  onDescartar: () => Promise<void>;
}

interface TextDraft {
  calle: string;
  altura: string;
  interseccion: string;
  barrioComuna: string;
  referencia: string;
  descripcionIncidente: string;
  notasOperativasDespacho: string;
}

const EMPTY_TEXT_DRAFT: TextDraft = {
  calle: '',
  altura: '',
  interseccion: '',
  barrioComuna: '',
  referencia: '',
  descripcionIncidente: '',
  notasOperativasDespacho: '',
};

function extractDraftFromLlamada(llamada: Llamada | null): TextDraft {
  if (!llamada) return EMPTY_TEXT_DRAFT;
  return {
    calle: llamada.ubicacion.calle ?? '',
    altura: llamada.ubicacion.altura ?? '',
    interseccion: llamada.ubicacion.interseccion ?? '',
    barrioComuna: llamada.ubicacion.barrioComuna ?? '',
    referencia: llamada.ubicacion.referencia ?? '',
    descripcionIncidente: llamada.descripcionIncidente,
    notasOperativasDespacho: llamada.notasOperativasDespacho,
  };
}

const PRIORIDADES: PrioridadIncidente[] = ['P1', 'P2', 'P3', 'P4'];

const PRIORITY_BUTTON_ACTIVE: Record<PrioridadIncidente, React.CSSProperties> = {
  P1: {
    backgroundColor: 'var(--p1-solid)',
    borderColor: 'var(--p1-solid)',
    color: '#ffffff',
  },
  P2: {
    backgroundColor: 'var(--p2-solid)',
    borderColor: 'var(--p2-solid)',
    color: '#ffffff',
  },
  P3: {
    backgroundColor: 'var(--p3-solid)',
    borderColor: 'var(--p3-solid)',
    color: '#ffffff',
  },
  P4: {
    backgroundColor: 'var(--p4-solid)',
    borderColor: 'var(--p4-solid)',
    color: '#ffffff',
  },
};

export function DispatchDraftColumn({
  llamada,
  catalogo,
  analyzing,
  submitting,
  savingDraft = false,
  onPatchLlamada,
  onRegisterFlush,
  onDerivar,
  onDescartar,
}: DispatchDraftColumnProps) {
  const [newResource, setNewResource] = useState('');
  const [draft, setDraft] = useState<TextDraft>(() => extractDraftFromLlamada(llamada));
  const draftRef = useRef<TextDraft>(draft);
  const dirtyFieldsRef = useRef<Set<keyof TextDraft>>(new Set());
  const debounceTimerRef = useRef<number | null>(null);
  const lastCallIdRef = useRef<string | null>(llamada?.id ?? null);

  const isLocked = llamada !== null && llamada.estado !== 'EN_CURSO';

  useEffect(() => {
    const nextId = llamada?.id ?? null;
    if (nextId !== lastCallIdRef.current) {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      dirtyFieldsRef.current.clear();
      lastCallIdRef.current = nextId;
      const reset = extractDraftFromLlamada(llamada);
      draftRef.current = reset;
      setDraft(reset);
      return;
    }

    if (!llamada) {
      return;
    }

    const incoming = extractDraftFromLlamada(llamada);
    setDraft((prev) => {
      const dirty = dirtyFieldsRef.current;
      const merged: TextDraft = {
        calle: dirty.has('calle') ? prev.calle : incoming.calle,
        altura: dirty.has('altura') ? prev.altura : incoming.altura,
        interseccion: dirty.has('interseccion') ? prev.interseccion : incoming.interseccion,
        barrioComuna: dirty.has('barrioComuna') ? prev.barrioComuna : incoming.barrioComuna,
        referencia: dirty.has('referencia') ? prev.referencia : incoming.referencia,
        descripcionIncidente: dirty.has('descripcionIncidente')
          ? prev.descripcionIncidente
          : incoming.descripcionIncidente,
        notasOperativasDespacho: dirty.has('notasOperativasDespacho')
          ? prev.notasOperativasDespacho
          : incoming.notasOperativasDespacho,
      };
      draftRef.current = merged;
      return merged;
    });
  }, [llamada, llamada?.id, llamada?.actualizadaEn]);

  const flushPendingDraft = useCallback(async () => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (!llamada || isLocked || dirtyFieldsRef.current.size === 0) {
      return;
    }

    const dirtyKeys = Array.from(dirtyFieldsRef.current);
    dirtyFieldsRef.current.clear();

    const current = draftRef.current;
    const payload: PatchLlamadaPayload = {};
    const ubicacionPatch: NonNullable<PatchLlamadaPayload['ubicacion']> = {};
    let hasUbicacion = false;

    for (const key of dirtyKeys) {
      if (
        key === 'calle' ||
        key === 'altura' ||
        key === 'interseccion' ||
        key === 'barrioComuna' ||
        key === 'referencia'
      ) {
        const trimmed = current[key].trim();
        ubicacionPatch[key] = trimmed.length > 0 ? trimmed : null;
        hasUbicacion = true;
      } else if (key === 'descripcionIncidente') {
        payload.descripcionIncidente = current.descripcionIncidente.trim();
      } else if (key === 'notasOperativasDespacho') {
        payload.notasOperativasDespacho = current.notasOperativasDespacho.trim();
      }
    }

    if (hasUbicacion) {
      payload.ubicacion = ubicacionPatch;
    }

    await onPatchLlamada(payload);
  }, [llamada, isLocked, onPatchLlamada]);

  useEffect(() => {
    onRegisterFlush?.(flushPendingDraft);
    return () => {
      onRegisterFlush?.(null);
    };
  }, [flushPendingDraft, onRegisterFlush]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  function handleTextChange(field: keyof TextDraft, value: string) {
    if (!llamada || isLocked) return;
    const next = { ...draftRef.current, [field]: value };
    draftRef.current = next;
    setDraft(next);
    dirtyFieldsRef.current.add(field);

    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      void flushPendingDraft();
    }, 350);
  }

  const editedSet = useMemo(
    () => new Set(llamada?.camposEditadosPorOperador ?? []),
    [llamada?.camposEditadosPorOperador],
  );

  const missingLocSet = useMemo(
    () => new Set(llamada?.ubicacion.camposFaltantes ?? []),
    [llamada?.ubicacion.camposFaltantes],
  );

  const selectedCategoria = useMemo(
    () => catalogo?.categorias.find((c) => c.id === llamada?.categoriaId) ?? null,
    [catalogo, llamada?.categoriaId],
  );

  const deriveMissingFields = useMemo(() => {
    if (!llamada) return ['Llamada activa'];
    const missing: string[] = [];
    if (!llamada.categoriaId) missing.push('Categoría');
    if (!llamada.subcategoriaId) missing.push('Subcategoría');
    if (!llamada.prioridad) missing.push('Prioridad');
    if (
      !draft.calle.trim() &&
      !draft.interseccion.trim() &&
      !draft.referencia.trim()
    ) {
      missing.push('Ubicación mínima');
    }
    if (!draft.notasOperativasDespacho.trim()) {
      missing.push('Notas operativas');
    }
    return missing;
  }, [llamada, draft.calle, draft.interseccion, draft.referencia, draft.notasOperativasDespacho]);

  function getFieldOrigin(
    fieldKey: string,
    hasValue: boolean,
    isMissingLocation = false,
  ): FieldOrigin {
    if (!llamada) return 'none';
    if (editedSet.has(fieldKey)) return 'human';
    if (isMissingLocation && !hasValue) return 'missing';
    if (hasValue && llamada.ultimoAnalisis) return 'ai';
    return 'none';
  }

  async function handleAddResource() {
    if (!llamada || isLocked) return;
    const clean = newResource.trim();
    if (!clean) return;
    setNewResource('');
    await onPatchLlamada({
      recursosRecomendadosDespacho: [...llamada.recursosRecomendadosDespacho, clean],
    });
  }

  async function handleRemoveResource(idx: number) {
    if (!llamada || isLocked) return;
    await onPatchLlamada({
      recursosRecomendadosDespacho: llamada.recursosRecomendadosDespacho.filter((_, i) => i !== idx),
    });
  }

  return (
    <section
      aria-label="Borrador de Carta de Despacho hacia CAD"
      className="flex h-full min-h-0 flex-col"
      style={{
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      {/* Column Header */}
      <div
        className="flex items-center justify-between gap-2 border-b px-3 py-2"
        style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-2)' }}
      >
        <div className="flex items-center gap-2">
          <FileOutput className="h-4 w-4" style={{ color: 'var(--accent-primary-text)' }} />
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
              3. Carta de Despacho (Salida CAD)
            </h2>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              El operador valida y deriva · El despachador CAD asigna móviles
            </div>
          </div>
        </div>
        {savingDraft ? (
          <span
            className="font-mono-tabular rounded border px-1.5 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            Guardando...
          </span>
        ) : null}
      </div>

      {!llamada ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div
            className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border"
            style={{
              backgroundColor: 'var(--bg-surface-2)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-muted)',
            }}
          >
            <FileOutput className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Borrador de Carta CAD
          </h3>
          <p className="mt-1 max-w-xs text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Los campos estructurados de ubicación, tipología, prioridad y notas operativas se
            pre-completarán aquí para tu validación humana antes de derivar.
          </p>
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3.5">
            {/* PRIORITY SELECTOR (Alt+1..4) */}
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Prioridad de Severidad
                </span>
                <FieldOriginTag
                  origin={getFieldOrigin('prioridad', llamada.prioridad !== null)}
                />
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {PRIORIDADES.map((prio) => {
                  const meta = PRIORIDAD_META[prio];
                  const active = llamada.prioridad === prio;
                  return (
                    <button
                      key={prio}
                      type="button"
                      disabled={isLocked}
                      onClick={() => void onPatchLlamada({ prioridad: prio })}
                      className="flex flex-col items-center justify-center rounded border py-1.5 px-1 transition-all disabled:opacity-55"
                      style={
                        active
                          ? PRIORITY_BUTTON_ACTIVE[prio]
                          : {
                              backgroundColor: 'var(--bg-surface-2)',
                              borderColor: 'var(--border-strong)',
                              color: 'var(--text-primary)',
                            }
                      }
                      title={`${meta.codigo} ${meta.etiqueta}: ${meta.descripcion} (${meta.atajo})`}
                    >
                      <span className="font-mono-tabular text-xs font-bold leading-none">
                        {meta.codigo}
                      </span>
                      <span className="mt-0.5 text-[10px] font-medium leading-none opacity-90">
                        {meta.etiqueta}
                      </span>
                      <span className="font-mono-tabular mt-0.5 text-[9px] opacity-65">
                        {meta.atajo}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* NORMALIZED LOCATION */}
            <div
              className="rounded-md border p-2.5"
              style={{
                backgroundColor: 'var(--bg-surface-2)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" style={{ color: 'var(--accent-primary-text)' }} />
                  <span
                    className="text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Ubicación Normalizada
                  </span>
                </div>
                {llamada.ubicacion.camposFaltantes.length > 0 ? (
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: 'var(--missing-text)' }}
                  >
                    {llamada.ubicacion.camposFaltantes.length} dato(s) sin confirmar
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold"
                    style={{ color: 'var(--human-text)' }}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Completa
                  </span>
                )}
              </div>

              <div className="grid grid-cols-12 gap-2">
                {/* Calle */}
                <div className="col-span-8">
                  <div className="mb-1 flex items-center justify-between gap-1">
                    <label
                      htmlFor="loc-calle"
                      className="text-[11px] font-medium"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Calle / Avenida
                    </label>
                    <FieldOriginTag
                      origin={getFieldOrigin(
                        'ubicacion.calle',
                        Boolean(llamada.ubicacion.calle),
                        missingLocSet.has('calle'),
                      )}
                    />
                  </div>
                  <input
                    id="loc-calle"
                    type="text"
                    disabled={isLocked}
                    value={draft.calle}
                    onChange={(e) => handleTextChange('calle', e.target.value)}
                    onBlur={() => void flushPendingDraft()}
                    placeholder="Ej. Av. Corrientes"
                    className="h-8 w-full rounded border px-2 text-xs outline-none disabled:opacity-60"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor:
                        missingLocSet.has('calle') && !llamada.ubicacion.calle
                          ? 'var(--missing-border)'
                          : 'var(--border-strong)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                {/* Altura */}
                <div className="col-span-4">
                  <div className="mb-1 flex items-center justify-between gap-1">
                    <label
                      htmlFor="loc-altura"
                      className="text-[11px] font-medium"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Altura
                    </label>
                    <FieldOriginTag
                      origin={getFieldOrigin(
                        'ubicacion.altura',
                        Boolean(llamada.ubicacion.altura),
                        missingLocSet.has('altura'),
                      )}
                    />
                  </div>
                  <input
                    id="loc-altura"
                    type="text"
                    disabled={isLocked}
                    value={draft.altura}
                    onChange={(e) => handleTextChange('altura', e.target.value)}
                    onBlur={() => void flushPendingDraft()}
                    placeholder="Ej. 1540"
                    className="font-mono-tabular h-8 w-full rounded border px-2 text-xs outline-none disabled:opacity-60"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor:
                        missingLocSet.has('altura') && !llamada.ubicacion.altura
                          ? 'var(--missing-border)'
                          : 'var(--border-strong)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                {/* Intersección */}
                <div className="col-span-6">
                  <div className="mb-1 flex items-center justify-between gap-1">
                    <label
                      htmlFor="loc-interseccion"
                      className="text-[11px] font-medium"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Intersección / Entre
                    </label>
                    <FieldOriginTag
                      origin={getFieldOrigin(
                        'ubicacion.interseccion',
                        Boolean(llamada.ubicacion.interseccion),
                        missingLocSet.has('interseccion'),
                      )}
                    />
                  </div>
                  <input
                    id="loc-interseccion"
                    type="text"
                    disabled={isLocked}
                    value={draft.interseccion}
                    onChange={(e) => handleTextChange('interseccion', e.target.value)}
                    onBlur={() => void flushPendingDraft()}
                    placeholder="Ej. Montevideo y Paraná"
                    className="h-8 w-full rounded border px-2 text-xs outline-none disabled:opacity-60"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor:
                        missingLocSet.has('interseccion') && !llamada.ubicacion.interseccion
                          ? 'var(--missing-border)'
                          : 'var(--border-strong)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                {/* Barrio / Comuna */}
                <div className="col-span-6">
                  <div className="mb-1 flex items-center justify-between gap-1">
                    <label
                      htmlFor="loc-barrio"
                      className="text-[11px] font-medium"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Barrio / Comuna
                    </label>
                    <FieldOriginTag
                      origin={getFieldOrigin(
                        'ubicacion.barrioComuna',
                        Boolean(llamada.ubicacion.barrioComuna),
                        missingLocSet.has('barrioComuna'),
                      )}
                    />
                  </div>
                  <input
                    id="loc-barrio"
                    type="text"
                    disabled={isLocked}
                    value={draft.barrioComuna}
                    onChange={(e) => handleTextChange('barrioComuna', e.target.value)}
                    onBlur={() => void flushPendingDraft()}
                    placeholder="Ej. San Nicolás (Comuna 1)"
                    className="h-8 w-full rounded border px-2 text-xs outline-none disabled:opacity-60"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor:
                        missingLocSet.has('barrioComuna') && !llamada.ubicacion.barrioComuna
                          ? 'var(--missing-border)'
                          : 'var(--border-strong)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                {/* Referencia */}
                <div className="col-span-12">
                  <div className="mb-1 flex items-center justify-between gap-1">
                    <label
                      htmlFor="loc-referencia"
                      className="text-[11px] font-medium"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Referencia adicional (piso, comercio, sentido)
                    </label>
                    <FieldOriginTag
                      origin={getFieldOrigin(
                        'ubicacion.referencia',
                        Boolean(llamada.ubicacion.referencia),
                      )}
                    />
                  </div>
                  <input
                    id="loc-referencia"
                    type="text"
                    disabled={isLocked}
                    value={draft.referencia}
                    onChange={(e) => handleTextChange('referencia', e.target.value)}
                    onBlur={() => void flushPendingDraft()}
                    placeholder="Ej. Pizzería frente al teatro, 3ro C..."
                    className="h-8 w-full rounded border px-2 text-xs outline-none disabled:opacity-60"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border-strong)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* TYPOLOGY (Linked Category -> Subcategory) */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center justify-between gap-1">
                  <label
                    htmlFor="cat-select"
                    className="text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Categoría
                  </label>
                  <FieldOriginTag
                    origin={getFieldOrigin('categoriaId', llamada.categoriaId !== null)}
                  />
                </div>
                <select
                  id="cat-select"
                  disabled={isLocked || !catalogo}
                  value={llamada.categoriaId ?? ''}
                  onChange={(e) => {
                    const catId = Number(e.target.value);
                    const cat = catalogo?.categorias.find((c) => c.id === catId);
                    const firstSub = cat?.subcategorias[0];
                    if (firstSub) {
                      void onPatchLlamada({
                        categoriaId: catId,
                        subcategoriaId: firstSub.id,
                      });
                    }
                  }}
                  className="h-8 w-full rounded border px-2 text-xs outline-none disabled:opacity-60"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-strong)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="">Seleccionar categoría...</option>
                  {catalogo?.categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-1">
                  <label
                    htmlFor="subcat-select"
                    className="text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Subcategoría Protocolo
                  </label>
                  <FieldOriginTag
                    origin={getFieldOrigin('subcategoriaId', llamada.subcategoriaId !== null)}
                  />
                </div>
                <select
                  id="subcat-select"
                  disabled={isLocked || !selectedCategoria}
                  value={llamada.subcategoriaId ?? ''}
                  onChange={(e) => {
                    const subId = Number(e.target.value);
                    if (subId) {
                      void onPatchLlamada({ subcategoriaId: subId });
                    }
                  }}
                  className="h-8 w-full rounded border px-2 text-xs outline-none disabled:opacity-60"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-strong)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="">Seleccionar protocolo...</option>
                  {selectedCategoria?.subcategorias.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.etiqueta}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div>
              <div className="mb-1 flex items-center justify-between gap-1">
                <label
                  htmlFor="desc-incidente"
                  className="text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Descripción breve del incidente
                </label>
                <FieldOriginTag
                  origin={getFieldOrigin(
                    'descripcionIncidente',
                    Boolean(llamada.descripcionIncidente.trim()),
                  )}
                />
              </div>
              <input
                id="desc-incidente"
                type="text"
                disabled={isLocked}
                value={draft.descripcionIncidente}
                onChange={(e) => handleTextChange('descripcionIncidente', e.target.value)}
                onBlur={() => void flushPendingDraft()}
                placeholder="Resumen conciso del hecho..."
                className="h-8 w-full rounded border px-2.5 text-xs outline-none disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* OPERATIONAL NOTES FOR CAD */}
            <div>
              <div className="mb-1 flex items-center justify-between gap-1">
                <label
                  htmlFor="notas-despacho"
                  className="text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Notas Operativas para Despacho CAD
                </label>
                <FieldOriginTag
                  origin={getFieldOrigin(
                    'notasOperativasDespacho',
                    Boolean(llamada.notasOperativasDespacho.trim()),
                    !llamada.notasOperativasDespacho.trim(),
                  )}
                />
              </div>
              <textarea
                id="notas-despacho"
                rows={3}
                disabled={isLocked}
                value={draft.notasOperativasDespacho}
                onChange={(e) => handleTextChange('notasOperativasDespacho', e.target.value)}
                onBlur={() => void flushPendingDraft()}
                placeholder="Síntesis accionable para el despachador CAD (sin transcripción cruda)..."
                className="w-full resize-none rounded border p-2.5 text-xs leading-relaxed outline-none disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: !draft.notasOperativasDespacho.trim()
                    ? 'var(--missing-border)'
                    : 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* RECOMMENDED RESOURCES (REFERENCE FOR CAD) */}
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-1">
                <span
                  className="text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Recursos Recomendados (Referencia CAD)
                </span>
                <FieldOriginTag
                  origin={getFieldOrigin(
                    'recursosRecomendadosDespacho',
                    llamada.recursosRecomendadosDespacho.length > 0,
                  )}
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {llamada.recursosRecomendadosDespacho.map((rec, idx) => (
                  <span
                    key={`${rec}-${idx}`}
                    className="inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs"
                    style={{
                      backgroundColor: 'var(--bg-surface-2)',
                      borderColor: 'var(--border-strong)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span>{rec}</span>
                    {!isLocked ? (
                      <button
                        type="button"
                        onClick={() => void handleRemoveResource(idx)}
                        className="rounded hover:opacity-75"
                        aria-label={`Quitar recurso ${rec}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    ) : null}
                  </span>
                ))}
              </div>

              {!isLocked ? (
                <div className="mt-2 flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newResource}
                    onChange={(e) => setNewResource(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleAddResource();
                      }
                    }}
                    placeholder="Agregar recurso de referencia..."
                    className="h-7 flex-1 rounded border px-2 text-xs outline-none"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void handleAddResource()}
                    disabled={!newResource.trim()}
                    className="inline-flex h-7 items-center gap-1 rounded border px-2 text-[11px] font-medium disabled:opacity-45"
                    style={{
                      backgroundColor: 'var(--bg-surface-2)',
                      borderColor: 'var(--border-strong)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <Plus className="h-3 w-3" />
                    Sumar
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Sticky Footer Actions */}
          <div
            className="border-t p-3"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface-2)',
            }}
          >
            {!isLocked && deriveMissingFields.length > 0 ? (
              <div
                className="mb-2 flex items-start gap-1.5 rounded border px-2.5 py-1.5 text-[11px]"
                style={{
                  backgroundColor: 'var(--missing-bg)',
                  borderColor: 'var(--missing-border)',
                  color: 'var(--missing-text)',
                }}
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Completar para derivar: <strong>{deriveMissingFields.join(', ')}</strong>.
                </span>
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isLocked || submitting}
                onClick={() => void onDescartar()}
                className="inline-flex h-9 items-center gap-1.5 rounded border px-3 text-xs font-medium transition-colors disabled:opacity-40"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-secondary)',
                }}
                title="Descartar llamada en curso"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Descartar</span>
              </button>

              <button
                type="button"
                disabled={isLocked || submitting || analyzing || deriveMissingFields.length > 0}
                onClick={() => void onDerivar()}
                className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded px-4 text-xs font-bold tracking-wide transition-opacity disabled:opacity-40"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: '#ffffff',
                }}
                title="Derivar Carta de Despacho a CAD (Alt+D)"
              >
                <SendHorizontal className="h-4 w-4" />
                <span>
                  {llamada.estado === 'DERIVADA'
                    ? 'Carta Derivada a CAD'
                    : submitting
                      ? 'Derivando...'
                      : 'Derivar a CAD'}
                </span>
                {llamada.estado === 'EN_CURSO' ? (
                  <kbd
                    className="font-mono-tabular rounded px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                  >
                    Alt+D
                  </kbd>
                ) : null}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
