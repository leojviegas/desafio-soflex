import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  ClipboardCheck,
  HelpCircle,
  MessageSquarePlus,
  Plus,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  EstadoPreguntaOperador,
  ItemChecklistLlamada,
  Llamada,
  NivelCerteza,
} from '../../types/domain';

interface LiveAssistanceColumnProps {
  llamada: Llamada | null;
  analyzing: boolean;
  onTogglePreArribo: (instruccionId: number, transmitida: boolean) => Promise<void>;
  onUpdateChecklistItem: (
    preguntaId: number,
    estadoOperador: EstadoPreguntaOperador | null,
    notaOperador?: string | null,
  ) => Promise<void>;
  onUpdateRiesgos: (riesgos: string[]) => Promise<void>;
}

const CONFIDENCE_STYLE: Record<NivelCerteza, { bg: string; border: string; text: string }> = {
  ALTA: {
    bg: 'var(--human-bg)',
    border: 'var(--human-border)',
    text: 'var(--human-text)',
  },
  MEDIA: {
    bg: 'var(--p2-bg)',
    border: 'var(--p2-border)',
    text: 'var(--p2-text)',
  },
  BAJA: {
    bg: 'var(--p1-bg)',
    border: 'var(--p1-border)',
    text: 'var(--p1-text)',
  },
};

function ChecklistRow({
  item,
  locked,
  onUpdate,
}: {
  item: ItemChecklistLlamada;
  locked: boolean;
  onUpdate: (
    preguntaId: number,
    estadoOperador: EstadoPreguntaOperador | null,
    notaOperador?: string | null,
  ) => Promise<void>;
}) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(item.notaOperador ?? '');

  const effectiveConfirmed = item.estadoOperador === 'CONFIRMADA';
  const effectiveNotApplicable = item.estadoOperador === 'NO_APLICA';
  const needsManualVerification =
    item.estadoIA === 'AMBIGUA' || (!item.evidenciaVerificada && item.citaEvidencia !== null);

  async function handleSaveNote() {
    setEditingNote(false);
    await onUpdate(item.preguntaId, item.estadoOperador, noteDraft.trim() || null);
  }

  return (
    <div
      className="rounded-md border p-2.5 transition-colors"
      style={{
        backgroundColor: effectiveNotApplicable
          ? 'var(--bg-canvas)'
          : 'var(--bg-surface-2)',
        borderColor: needsManualVerification && !effectiveConfirmed
          ? 'var(--missing-border)'
          : effectiveConfirmed
            ? 'var(--human-border)'
            : 'var(--border-subtle)',
        opacity: effectiveNotApplicable ? 0.65 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {item.critica ? (
              <span
                className="rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{
                  backgroundColor: 'var(--p1-bg)',
                  borderColor: 'var(--p1-border)',
                  color: 'var(--p1-text)',
                }}
              >
                Crítica
              </span>
            ) : null}
            {item.esUniversal ? (
              <span
                className="rounded border px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                Universal
              </span>
            ) : null}
            {item.estadoIA === 'AMBIGUA' && !effectiveConfirmed ? (
              <span
                className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: 'var(--missing-bg)',
                  borderColor: 'var(--missing-border)',
                  color: 'var(--missing-text)',
                }}
              >
                <AlertTriangle className="h-2.5 w-2.5" />
                {item.evidenciaVerificada ? 'Ambigua' : 'Verificar manualmente'}
              </span>
            ) : null}
            {effectiveConfirmed ? (
              <span
                className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: 'var(--human-bg)',
                  borderColor: 'var(--human-border)',
                  color: 'var(--human-text)',
                }}
              >
                <CheckCircle2 className="h-2.5 w-2.5" />
                Confirmada Operador
              </span>
            ) : null}
            {effectiveNotApplicable ? (
              <span
                className="rounded border px-1.5 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: 'var(--p4-bg)',
                  borderColor: 'var(--p4-border)',
                  color: 'var(--p4-text)',
                }}
              >
                No aplica
              </span>
            ) : null}
          </div>

          <p
            className={`text-[13px] font-medium leading-snug ${
              effectiveNotApplicable ? 'line-through' : ''
            }`}
            style={{ color: 'var(--text-primary)' }}
          >
            {item.texto}
          </p>

          {item.respuestaIA ? (
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              {item.respuestaIA}
            </p>
          ) : null}

          {item.citaEvidencia ? (
            <blockquote
              className="font-mono-tabular mt-1.5 border-l-2 pl-2 text-[11px] italic leading-snug"
              style={{
                borderColor: item.evidenciaVerificada
                  ? 'var(--ai-border)'
                  : 'var(--missing-border)',
                color: 'var(--text-secondary)',
              }}
            >
              “{item.citaEvidencia}”
            </blockquote>
          ) : null}

          {item.notaOperador && !editingNote ? (
            <div
              className="mt-1.5 rounded border px-2 py-1 text-[11px]"
              style={{
                backgroundColor: 'var(--human-bg)',
                borderColor: 'var(--human-border)',
                color: 'var(--human-text)',
              }}
            >
              Nota operador: {item.notaOperador}
            </div>
          ) : null}
        </div>
      </div>

      {/* Quick Operator Actions */}
      {!locked ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t pt-2" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            type="button"
            onClick={() =>
              void onUpdate(
                item.preguntaId,
                effectiveConfirmed ? null : 'CONFIRMADA',
              )
            }
            className="inline-flex h-6 items-center gap-1 rounded border px-2 text-[11px] font-medium transition-colors"
            style={
              effectiveConfirmed
                ? {
                    backgroundColor: 'var(--human-bg)',
                    borderColor: 'var(--human-border)',
                    color: 'var(--human-text)',
                  }
                : {
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-strong)',
                    color: 'var(--text-primary)',
                  }
            }
          >
            <Check className="h-3 w-3" />
            {effectiveConfirmed ? 'Confirmada' : 'Confirmar'}
          </button>

          <button
            type="button"
            onClick={() =>
              void onUpdate(
                item.preguntaId,
                effectiveNotApplicable ? null : 'NO_APLICA',
              )
            }
            className="inline-flex h-6 items-center gap-1 rounded border px-2 text-[11px] font-medium transition-colors"
            style={
              effectiveNotApplicable
                ? {
                    backgroundColor: 'var(--p4-bg)',
                    borderColor: 'var(--p4-border)',
                    color: 'var(--p4-text)',
                  }
                : {
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }
            }
          >
            <Ban className="h-3 w-3" />
            No aplica
          </button>

          <button
            type="button"
            onClick={() => {
              setNoteDraft(item.notaOperador ?? '');
              setEditingNote((prev) => !prev);
            }}
            className="inline-flex h-6 items-center gap-1 rounded border px-2 text-[11px] font-medium transition-colors"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <MessageSquarePlus className="h-3 w-3" />
            {item.notaOperador ? 'Editar nota' : 'Nota'}
          </button>
        </div>
      ) : null}

      {editingNote && !locked ? (
        <div className="mt-2 flex items-center gap-1.5">
          <input
            type="text"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSaveNote();
              }
              if (e.key === 'Escape') setEditingNote(false);
            }}
            placeholder="Dato confirmado verbalmente por el llamante..."
            className="h-7 flex-1 rounded border px-2 text-xs outline-none"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-focus)',
              color: 'var(--text-primary)',
            }}
            autoFocus
          />
          <button
            type="button"
            onClick={() => void handleSaveNote()}
            className="h-7 rounded px-2.5 text-[11px] font-semibold"
            style={{ backgroundColor: 'var(--accent-primary)', color: '#ffffff' }}
          >
            Guardar
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function LiveAssistanceColumn({
  llamada,
  analyzing,
  onTogglePreArribo,
  onUpdateChecklistItem,
  onUpdateRiesgos,
}: LiveAssistanceColumnProps) {
  const [newRisk, setNewRisk] = useState('');
  const isLocked = llamada !== null && llamada.estado !== 'EN_CURSO';

  const { pendingItems, answeredItems } = useMemo(() => {
    const list = llamada?.checklist ?? [];
    const pending: ItemChecklistLlamada[] = [];
    const answered: ItemChecklistLlamada[] = [];

    for (const item of list) {
      const resolvedByOperator =
        item.estadoOperador === 'CONFIRMADA' || item.estadoOperador === 'NO_APLICA';
      const resolvedByAi =
        item.estadoOperador === null &&
        item.estadoIA === 'RESPONDIDA' &&
        item.evidenciaVerificada;

      if (resolvedByOperator || resolvedByAi) {
        answered.push(item);
      } else {
        pending.push(item);
      }
    }

    // Prioritize critical questions first
    pending.sort((a, b) => Number(b.critica) - Number(a.critica));
    return { pendingItems: pending, answeredItems: answered };
  }, [llamada?.checklist]);

  const preArriboList = llamada?.instruccionesPreArribo ?? [];
  const transmittedCount = preArriboList.filter((i) => i.transmitida).length;
  const confidence = llamada?.ultimoAnalisis?.confianzaGlobal;

  async function handleAddRisk() {
    if (!llamada || isLocked) return;
    const clean = newRisk.trim();
    if (!clean) return;
    setNewRisk('');
    await onUpdateRiesgos([...llamada.riesgosDetectados, clean]);
  }

  async function handleRemoveRisk(index: number) {
    if (!llamada || isLocked) return;
    const next = llamada.riesgosDetectados.filter((_, idx) => idx !== index);
    await onUpdateRiesgos(next);
  }

  return (
    <section
      aria-label="Asistencia en vivo del copiloto"
      className="relative flex h-full min-h-0 flex-col border-r"
      style={{
        backgroundColor: 'var(--bg-canvas)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Column Header */}
      <div
        className="flex items-center justify-between gap-2 border-b px-3 py-2"
        style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-2)' }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: 'var(--accent-primary-text)' }} />
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
              2. Asistencia en Vivo
            </h2>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Pre-arribo determinista · Protocolo guiado
            </div>
          </div>
        </div>

        {confidence ? (
          <span
            className="font-mono-tabular inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold"
            style={{
              backgroundColor: CONFIDENCE_STYLE[confidence].bg,
              borderColor: CONFIDENCE_STYLE[confidence].border,
              color: CONFIDENCE_STYLE[confidence].text,
            }}
          >
            Confianza: {confidence}
          </span>
        ) : null}
      </div>

      {/* Non-blocking analysis loading bar */}
      {analyzing ? (
        <div
          role="status"
          aria-live="polite"
          className="relative overflow-hidden border-b px-3 py-1.5 text-xs font-medium"
          style={{
            backgroundColor: 'var(--accent-primary-soft)',
            borderColor: 'var(--border-focus)',
            color: 'var(--accent-primary-text)',
          }}
        >
          <span>Procesando transcripción y verificando protocolo...</span>
          <div
            className="animate-pulse-bar absolute bottom-0 left-0 h-0.5 w-1/3"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          />
        </div>
      ) : null}

      {/* Empty state */}
      {!llamada ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div
            className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-strong)',
              color: 'var(--accent-primary-text)',
            }}
          >
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Copiloto en espera de transcripción
          </h3>
          <p className="mt-1 max-w-sm text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Cargá un caso del CSV desde la barra superior o pegá una transcripción en la columna
            izquierda para recibir instrucciones de pre-arribo inmediatas y el checklist dinámico de
            protocolo.
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-4">
          {/* 1. PRE-ARRIVAL SAFETY INSTRUCTIONS (Highest visual priority) */}
          <div
            className="overflow-hidden rounded-md border border-l-4"
            style={{
              backgroundColor: 'var(--prearrival-bg)',
              borderColor: 'var(--prearrival-border)',
              borderLeftColor: 'var(--prearrival-rail)',
            }}
          >
            <div
              className="flex items-center justify-between gap-2 border-b px-3 py-2"
              style={{ borderColor: 'var(--prearrival-border)' }}
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0" style={{ color: 'var(--prearrival-rail)' }} />
                <h3
                  className="text-xs font-bold uppercase tracking-wide"
                  style={{ color: 'var(--prearrival-header)' }}
                >
                  Instrucciones de Seguridad Pre-Arribo
                </h3>
              </div>
              <span
                className="font-mono-tabular rounded px-1.5 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                }}
              >
                {transmittedCount}/{preArriboList.length} transmitidas
              </span>
            </div>

            {preArriboList.length === 0 ? (
              <div className="px-3 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                Analizá la llamada o seleccioná una subcategoría para cargar las directivas de
                pre-arribo.
              </div>
            ) : (
              <ul className="divide-y" style={{ borderColor: 'var(--prearrival-border)' }}>
                {preArriboList.map((ins) => (
                  <li key={ins.instruccionId} className="px-3 py-2.5">
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={ins.transmitida}
                        disabled={isLocked}
                        onChange={(e) => void onTogglePreArribo(ins.instruccionId, e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          {ins.critica ? (
                            <span
                              className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                              style={{
                                backgroundColor: 'var(--p1-solid)',
                                color: '#ffffff',
                              }}
                            >
                              Lectura inmediata
                            </span>
                          ) : (
                            <span
                              className="rounded border px-1.5 py-0.5 text-[10px] font-medium"
                              style={{
                                borderColor: 'var(--border-strong)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              Complementaria
                            </span>
                          )}
                          {ins.transmitida ? (
                            <span
                              className="text-[10px] font-semibold"
                              style={{ color: 'var(--human-text)' }}
                            >
                              Transmitida al llamante
                            </span>
                          ) : null}
                        </div>
                        <p
                          className={`text-[13px] font-semibold leading-snug ${
                            ins.transmitida ? 'line-through opacity-65' : ''
                          }`}
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {ins.texto}
                        </p>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 2. DYNAMIC PROTOCOL CHECKLIST */}
          <div className="flex flex-col gap-3">
            {/* Pending / Ambiguous first */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5" style={{ color: 'var(--missing-text)' }} />
                  <h3
                    className="text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Preguntas Pendientes / Por Confirmar ({pendingItems.length})
                  </h3>
                </div>
              </div>

              {pendingItems.length === 0 ? (
                <div
                  className="rounded-md border px-3 py-2.5 text-xs"
                  style={{
                    backgroundColor: 'var(--human-bg)',
                    borderColor: 'var(--human-border)',
                    color: 'var(--human-text)',
                  }}
                >
                  Todas las preguntas del protocolo fueron respondidas o gestionadas.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {pendingItems.map((item) => (
                    <ChecklistRow
                      key={item.preguntaId}
                      item={item}
                      locked={isLocked}
                      onUpdate={onUpdateChecklistItem}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Answered in transcript / Confirmed */}
            {answeredItems.length > 0 ? (
              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: 'var(--human-text)' }} />
                  <h3
                    className="text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Respondidas en Relato / Confirmadas ({answeredItems.length})
                  </h3>
                </div>
                <div className="flex flex-col gap-2">
                  {answeredItems.map((item) => (
                    <ChecklistRow
                      key={item.preguntaId}
                      item={item}
                      locked={isLocked}
                      onUpdate={onUpdateChecklistItem}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* 3. DETECTED RISKS */}
          <div
            className="rounded-md border p-3"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" style={{ color: 'var(--p2-text)' }} />
                <h3
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Riesgos Detectados
                </h3>
              </div>
              <span className="font-mono-tabular text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {llamada.riesgosDetectados.length} ítems
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {llamada.riesgosDetectados.length === 0 ? (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Sin riesgos cargados aún.
                </span>
              ) : (
                llamada.riesgosDetectados.map((risk, idx) => (
                  <span
                    key={`${risk}-${idx}`}
                    className="inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: 'var(--p2-bg)',
                      borderColor: 'var(--p2-border)',
                      color: 'var(--p2-text)',
                    }}
                  >
                    <span>{risk}</span>
                    {!isLocked ? (
                      <button
                        type="button"
                        onClick={() => void handleRemoveRisk(idx)}
                        className="rounded hover:opacity-75"
                        aria-label={`Quitar riesgo ${risk}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    ) : null}
                  </span>
                ))
              )}
            </div>

            {!isLocked ? (
              <div className="mt-2.5 flex items-center gap-1.5">
                <input
                  type="text"
                  value={newRisk}
                  onChange={(e) => setNewRisk(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleAddRisk();
                    }
                  }}
                  placeholder="Agregar riesgo detectado..."
                  className="h-7 flex-1 rounded border px-2 text-xs outline-none"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => void handleAddRisk()}
                  disabled={!newRisk.trim()}
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
      )}
    </section>
  );
}
