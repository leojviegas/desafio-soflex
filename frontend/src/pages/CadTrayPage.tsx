import {
  AlertTriangle,
  Clock,
  Filter,
  Inbox,
  MapPin,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { PriorityBadge } from '../components/PriorityBadge';
import {
  ORIGEN_REPORTE_LABELS,
  type CartaDespacho,
  type CatalogoProtocolos,
  type PrioridadIncidente,
} from '../types/domain';

interface CadTrayPageProps {
  cartas: CartaDespacho[];
  catalogo: CatalogoProtocolos | null;
  onBackToConsole: () => void;
}

const PRIORITY_FILTERS: Array<PrioridadIncidente | 'TODAS'> = [
  'TODAS',
  'P1',
  'P2',
  'P3',
  'P4',
];

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function CadTrayPage({
  cartas,
  catalogo,
  onBackToConsole,
}: CadTrayPageProps) {
  const [priorityFilter, setPriorityFilter] = useState<PrioridadIncidente | 'TODAS'>('TODAS');
  const [categoriaFilter, setCategoriaFilter] = useState<number | 'TODAS'>('TODAS');
  const [selectedId, setSelectedId] = useState<string | null>(cartas[0]?.id ?? null);

  const lookup = useMemo(() => {
    const catMap = new Map<number, string>();
    const subMap = new Map<number, string>();
    for (const cat of catalogo?.categorias ?? []) {
      catMap.set(cat.id, cat.etiqueta);
      for (const sub of cat.subcategorias) {
        subMap.set(sub.id, sub.etiqueta);
      }
    }
    return { catMap, subMap };
  }, [catalogo]);

  const filtered = useMemo(() => {
    return cartas.filter((c) => {
      if (priorityFilter !== 'TODAS' && c.prioridad !== priorityFilter) return false;
      if (categoriaFilter !== 'TODAS' && c.categoriaId !== categoriaFilter) return false;
      return true;
    });
  }, [cartas, priorityFilter, categoriaFilter]);

  const selectedCarta = useMemo(() => {
    if (filtered.length === 0) return null;
    return filtered.find((c) => c.id === selectedId) ?? filtered[0];
  }, [filtered, selectedId]);

  return (
    <main
      aria-label="Bandeja de Cartas de Despacho CAD"
      className="flex flex-1 min-h-0 flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--bg-canvas)' }}
    >
      {/* Filter Toolbar */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5"
        style={{
          backgroundColor: 'var(--bg-surface-2)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4" style={{ color: 'var(--accent-primary-text)' }} />
          <div>
            <h1 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
              Bandeja de Cartas de Despacho (CAD)
            </h1>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Fichas inmutables derivadas por el operador · Sin transcripción cruda
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
            <div
              className="inline-flex rounded border p-0.5"
              style={{
                backgroundColor: 'var(--bg-canvas)',
                borderColor: 'var(--border-strong)',
              }}
            >
              {PRIORITY_FILTERS.map((prio) => (
                <button
                  key={prio}
                  type="button"
                  onClick={() => setPriorityFilter(prio)}
                  className="font-mono-tabular h-6 rounded px-2 text-[11px] font-semibold transition-colors"
                  style={
                    priorityFilter === prio
                      ? { backgroundColor: 'var(--accent-primary)', color: '#ffffff' }
                      : { color: 'var(--text-secondary)' }
                  }
                >
                  {prio === 'TODAS' ? 'Todas' : prio}
                </button>
              ))}
            </div>
          </div>

          <select
            aria-label="Filtrar por categoría"
            value={categoriaFilter}
            onChange={(e) =>
              setCategoriaFilter(e.target.value === 'TODAS' ? 'TODAS' : Number(e.target.value))
            }
            className="h-7 rounded border px-2 text-xs outline-none"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="TODAS">Todas las categorías</option>
            {catalogo?.categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.etiqueta}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onBackToConsole}
            className="h-7 rounded border px-2.5 text-xs font-medium"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          >
            Volver a Consola
          </button>
        </div>
      </div>

      {/* Master-Detail Content */}
      {filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <Inbox className="mb-3 h-8 w-8 opacity-40" style={{ color: 'var(--text-muted)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            No hay cartas de despacho con los filtros actuales
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            Derivá una llamada desde la Consola en Vivo o ajustá los filtros de prioridad y
            categoría.
          </p>
        </div>
      ) : (
        <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-12">
          {/* Left List */}
          <aside
            aria-label="Listado de cartas derivadas"
            className="overflow-y-auto border-r lg:col-span-5"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {filtered.map((carta) => {
                const isSelected = selectedCarta?.id === carta.id;
                const ubicacionStr = [
                  carta.ubicacion.calle,
                  carta.ubicacion.altura,
                  carta.ubicacion.barrioComuna,
                ]
                  .filter(Boolean)
                  .join(' · ');

                return (
                  <button
                    key={carta.id}
                    type="button"
                    onClick={() => setSelectedId(carta.id)}
                    className="flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors"
                    style={{
                      backgroundColor: isSelected ? 'var(--bg-elevated)' : 'transparent',
                      borderLeft: isSelected
                        ? '3px solid var(--accent-primary)'
                        : '3px solid transparent',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono-tabular text-xs font-bold"
                          style={{ color: 'var(--accent-primary-text)' }}
                        >
                          {carta.id}
                        </span>
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {ORIGEN_REPORTE_LABELS[carta.origenReporte]}
                        </span>
                      </div>
                      <PriorityBadge prioridad={carta.prioridad} />
                    </div>

                    <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {carta.descripcionIncidente}
                    </div>

                    <div
                      className="flex items-center justify-between gap-2 text-[11px]"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <span className="truncate">{ubicacionStr || 'Sin dirección'}</span>
                      <span className="font-mono-tabular shrink-0 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {formatTime(carta.derivadaEn)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right Detail */}
          <section
            aria-label="Detalle de Carta de Despacho seleccionada"
            className="overflow-y-auto p-5 lg:col-span-7"
            style={{ backgroundColor: 'var(--bg-canvas)' }}
          >
            {selectedCarta ? (
              <article
                className="mx-auto flex max-w-3xl flex-col gap-4 rounded-md border p-5"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-strong)',
                }}
              >
                <div
                  className="flex flex-wrap items-start justify-between gap-3 border-b pb-4"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span
                        className="font-mono-tabular text-sm font-bold"
                        style={{ color: 'var(--accent-primary-text)' }}
                      >
                        {selectedCarta.id}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          backgroundColor: 'var(--derived-bg)',
                          borderColor: 'var(--derived-border)',
                          color: 'var(--derived-text)',
                        }}
                      >
                        <ShieldCheck className="h-3 w-3" />
                        INMUTABLE · LISTA PARA CAD
                      </span>
                    </div>
                    <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                      {selectedCarta.descripcionIncidente}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span>{lookup.catMap.get(selectedCarta.categoriaId) ?? `Cat #${selectedCarta.categoriaId}`}</span>
                      <span>·</span>
                      <span>{lookup.subMap.get(selectedCarta.subcategoriaId) ?? `Sub #${selectedCarta.subcategoriaId}`}</span>
                      <span>·</span>
                      <span className="font-mono-tabular inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(selectedCarta.derivadaEn)}
                      </span>
                    </div>
                  </div>
                  <PriorityBadge prioridad={selectedCarta.prioridad} size="md" />
                </div>

                {/* Location Grid */}
                <div
                  className="rounded-md border p-3.5"
                  style={{
                    backgroundColor: 'var(--bg-surface-2)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                    <MapPin className="h-3.5 w-3.5" style={{ color: 'var(--accent-primary-text)' }} />
                    Ubicación Validada
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                    <div>
                      <dt className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Calle</dt>
                      <dd className="mt-0.5 font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {selectedCarta.ubicacion.calle ?? '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Altura</dt>
                      <dd className="font-mono-tabular mt-0.5 font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {selectedCarta.ubicacion.altura ?? '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Intersección</dt>
                      <dd className="mt-0.5 font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {selectedCarta.ubicacion.interseccion ?? '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Barrio / Comuna</dt>
                      <dd className="mt-0.5 font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {selectedCarta.ubicacion.barrioComuna ?? '—'}
                      </dd>
                    </div>
                  </dl>
                  {selectedCarta.ubicacion.referencia ? (
                    <div className="mt-2.5 border-t pt-2 text-xs" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                      Referencia: <strong style={{ color: 'var(--text-primary)' }}>{selectedCarta.ubicacion.referencia}</strong>
                    </div>
                  ) : null}
                </div>

                {/* Operational Notes */}
                <div>
                  <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                    Notas Operativas para Despacho
                  </h3>
                  <p
                    className="rounded-md border p-3 text-xs leading-relaxed"
                    style={{
                      backgroundColor: 'var(--bg-surface-2)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {selectedCarta.notasOperativasDespacho}
                  </p>
                </div>

                {/* Risks + Recommended Resources */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                      <AlertTriangle className="h-3.5 w-3.5" style={{ color: 'var(--p2-text)' }} />
                      Riesgos Detectados
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCarta.riesgosDetectados.map((risk, i) => (
                        <span
                          key={`${risk}-${i}`}
                          className="rounded border px-2 py-1 text-xs font-medium"
                          style={{
                            backgroundColor: 'var(--p2-bg)',
                            borderColor: 'var(--p2-border)',
                            color: 'var(--p2-text)',
                          }}
                        >
                          {risk}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                      <Truck className="h-3.5 w-3.5" style={{ color: 'var(--accent-primary-text)' }} />
                      Recursos Recomendados (Referencia)
                    </h3>
                    <ul className="flex flex-col gap-1.5">
                      {selectedCarta.recursosRecomendadosDespacho.map((rec, i) => (
                        <li
                          key={`${rec}-${i}`}
                          className="rounded border px-2.5 py-1.5 text-xs font-medium"
                          style={{
                            backgroundColor: 'var(--bg-surface-2)',
                            borderColor: 'var(--border-strong)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            ) : null}
          </section>
        </div>
      )}
    </main>
  );
}
