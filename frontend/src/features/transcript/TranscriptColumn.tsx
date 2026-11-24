import {
  FileText,
  Headphones,
  MessageSquareText,
  PhoneIncoming,
  RefreshCw,
  Send,
  Sparkles,
  User,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ORIGEN_REPORTE_LABELS,
  type CasoReferenciaCsv,
  type HablanteTurno,
  type Llamada,
  type OrigenReporte,
} from '../../types/domain';
import { parseTurnosFromTranscripcion } from '../../utils/transcript';
import { PriorityBadge } from '../../components/PriorityBadge';

interface TranscriptColumnProps {
  llamada: Llamada | null;
  analyzing: boolean;
  quickCases: CasoReferenciaCsv[];
  onCreateFreeCall: (origen: OrigenReporte, transcripcion: string) => Promise<void>;
  onSelectCase: (caso: CasoReferenciaCsv) => void;
  onAppendTurno: (
    hablante: HablanteTurno,
    texto: string,
    reanalizar: boolean,
  ) => Promise<void>;
  onUpdateRawTranscripcion: (texto: string, reanalizar: boolean) => Promise<void>;
  onReanalyze: () => Promise<void>;
}

type TranscriptViewMode = 'turnos' | 'crudo';

const ORIGEN_OPTIONS: OrigenReporte[] = [
  'TELEFONIA_911',
  'TELEFONIA_103',
  'TELEFONIA_107',
  'TELEFONIA_147',
  'APP_CIUDADANA',
  'OTRO',
];

export function TranscriptColumn({
  llamada,
  analyzing,
  quickCases,
  onCreateFreeCall,
  onSelectCase,
  onAppendTurno,
  onUpdateRawTranscripcion,
  onReanalyze,
}: TranscriptColumnProps) {
  const [viewMode, setViewMode] = useState<TranscriptViewMode>('turnos');
  const [speaker, setSpeaker] = useState<HablanteTurno>('LLAMANTE');
  const [turnDraft, setTurnDraft] = useState('');
  const [rawDraft, setRawDraft] = useState('');
  const [newCallOrigin, setNewCallOrigin] = useState<OrigenReporte>('TELEFONIA_911');
  const [newCallTranscript, setNewCallTranscript] = useState('');
  const listEndRef = useRef<HTMLDivElement>(null);

  const isLocked = llamada !== null && llamada.estado !== 'EN_CURSO';

  useEffect(() => {
    setRawDraft(llamada?.transcripcionCruda ?? '');
  }, [llamada?.id, llamada?.transcripcionCruda]);

  const turnos = useMemo(() => {
    if (!llamada) return [];
    return llamada.turnos && llamada.turnos.length > 0
      ? llamada.turnos
      : parseTurnosFromTranscripcion(llamada.transcripcionCruda);
  }, [llamada]);

  useEffect(() => {
    if (viewMode === 'turnos' && turnos.length > 0) {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [turnos.length, viewMode]);

  async function handleSendTurn(reanalizar: boolean) {
    const clean = turnDraft.trim();
    if (!clean || isLocked || !llamada) return;
    setTurnDraft('');
    await onAppendTurno(speaker, clean, reanalizar);
  }

  async function handleStartFreeCall() {
    const clean = newCallTranscript.trim();
    if (!clean) return;
    await onCreateFreeCall(newCallOrigin, clean);
    setNewCallTranscript('');
    setViewMode('turnos');
  }

  const rawHasChanges = llamada !== null && rawDraft.trim() !== llamada.transcripcionCruda.trim();

  // Empty state when no call is active yet
  if (!llamada) {
    return (
      <section
        aria-label="Transcripción y entrada de llamada"
        className="flex h-full flex-col border-r"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div
          className="flex items-center justify-between border-b px-3 py-2.5"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-2)' }}
        >
          <div className="flex items-center gap-2">
            <PhoneIncoming className="h-4 w-4" style={{ color: 'var(--accent-primary-text)' }} />
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
              1. Ingreso de Transcripción
            </h2>
          </div>
          <span
            className="font-mono-tabular rounded border px-1.5 py-0.5 text-[10px]"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            Ctrl+Enter
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3.5">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="new-call-origin"
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-secondary)' }}
            >
              Canal de origen
            </label>
            <select
              id="new-call-origin"
              value={newCallOrigin}
              onChange={(e) => setNewCallOrigin(e.target.value as OrigenReporte)}
              className="h-9 rounded border px-2.5 text-xs font-medium outline-none"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            >
              {ORIGEN_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {ORIGEN_REPORTE_LABELS[opt]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-1 flex-col gap-2">
            <label
              htmlFor="new-call-transcript"
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-secondary)' }}
            >
              Pegar transcripción cruda (Operador / Llamante)
            </label>
            <textarea
              id="new-call-transcript"
              value={newCallTranscript}
              onChange={(e) => setNewCallTranscript(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  void handleStartFreeCall();
                }
              }}
              placeholder={
                'Operador: 911 emergencias, ¿cuál es su urgencia?\nLlamante: Hola, hay un incendio en Av. Corrientes 1540...'
              }
              className="min-h-[160px] flex-1 resize-none rounded border p-3 text-xs leading-relaxed outline-none"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              type="button"
              onClick={() => void handleStartFreeCall()}
              disabled={!newCallTranscript.trim() || analyzing}
              className="inline-flex h-9 items-center justify-center gap-2 rounded font-semibold text-xs transition-opacity disabled:opacity-45"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: '#ffffff',
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Iniciar y Analizar Llamada</span>
            </button>
          </div>

          <div className="border-t pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <div
              className="mb-2 text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              Acceso rápido del dataset CSV
            </div>
            <div className="flex flex-col gap-1.5">
              {quickCases.map((caso) => (
                <button
                  key={caso.idRegistro}
                  type="button"
                  onClick={() => onSelectCase(caso)}
                  className="flex flex-col gap-1 rounded border p-2.5 text-left transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-surface-2)',
                    borderColor: 'var(--border-subtle)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-focus)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="font-mono-tabular text-[11px] font-semibold"
                      style={{ color: 'var(--accent-primary-text)' }}
                    >
                      {caso.idRegistro}
                    </span>
                    <PriorityBadge prioridad={caso.prioridadSugerida} showLabel={false} />
                  </div>
                  <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    {caso.descripcionIncidente}
                  </div>
                  <div className="truncate text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    {caso.calleDetectada} {caso.alturaDetectada} · {caso.barrioComuna}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Transcripción y turnos de la llamada"
      className="flex h-full min-h-0 flex-col border-r"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Column Header */}
      <div
        className="flex items-center justify-between gap-2 border-b px-3 py-2"
        style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-2)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquareText className="h-4 w-4 shrink-0" style={{ color: 'var(--accent-primary-text)' }} />
          <div className="min-w-0">
            <h2 className="truncate text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
              1. Transcripción
            </h2>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {ORIGEN_REPORTE_LABELS[llamada.origenReporte]} · {turnos.length} turnos
            </div>
          </div>
        </div>

        {/* Mode switcher: Por turnos vs Texto crudo */}
        <div
          className="inline-flex shrink-0 rounded border p-0.5"
          style={{
            backgroundColor: 'var(--bg-canvas)',
            borderColor: 'var(--border-strong)',
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode('turnos')}
            className="inline-flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors"
            style={
              viewMode === 'turnos'
                ? { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }
                : { color: 'var(--text-muted)' }
            }
          >
            <MessageSquareText className="h-3 w-3" />
            Turnos
          </button>
          <button
            type="button"
            onClick={() => setViewMode('crudo')}
            className="inline-flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors"
            style={
              viewMode === 'crudo'
                ? { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }
                : { color: 'var(--text-muted)' }
            }
          >
            <FileText className="h-3 w-3" />
            Texto crudo
          </button>
        </div>
      </div>

      {/* Main Transcript Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {viewMode === 'turnos' ? (
          <div className="flex flex-col gap-2.5">
            {turnos.map((turno) => {
              const isOperator = turno.hablante === 'OPERADOR';
              return (
                <article
                  key={`${turno.indice}-${turno.hablante}`}
                  className="rounded-md border p-2.5"
                  style={
                    isOperator
                      ? {
                          backgroundColor: 'var(--bg-surface-2)',
                          borderColor: 'var(--border-subtle)',
                        }
                      : {
                          backgroundColor: 'var(--bg-elevated)',
                          borderColor: 'var(--border-strong)',
                          borderLeftWidth: '3px',
                          borderLeftColor: 'var(--accent-primary)',
                        }
                  }
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide"
                      style={{
                        color: isOperator
                          ? 'var(--text-secondary)'
                          : 'var(--accent-primary-text)',
                      }}
                    >
                      {isOperator ? (
                        <Headphones className="h-3 w-3" />
                      ) : (
                        <User className="h-3 w-3" />
                      )}
                      {isOperator ? 'Operador' : 'Llamante'}
                    </span>
                    <span
                      className="font-mono-tabular text-[10px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      #{String(turno.indice).padStart(2, '0')}
                    </span>
                  </div>
                  <p
                    className="text-[13px] leading-relaxed whitespace-pre-wrap"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {turno.texto}
                  </p>
                </article>
              );
            })}
            <div ref={listEndRef} />
          </div>
        ) : (
          <div className="flex h-full flex-col gap-2">
            <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              Pegá o editá el relato completo respetando los prefijos <code className="font-mono-tabular">Operador:</code> y{' '}
              <code className="font-mono-tabular">Llamante:</code>.
            </p>
            <textarea
              value={rawDraft}
              onChange={(e) => setRawDraft(e.target.value)}
              disabled={isLocked}
              aria-label="Transcripción cruda completa"
              className="font-mono-tabular min-h-[260px] flex-1 resize-none rounded border p-2.5 text-xs leading-relaxed outline-none disabled:opacity-60"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            />
            {!isLocked && rawHasChanges ? (
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRawDraft(llamada.transcripcionCruda)}
                  className="h-8 rounded border px-2.5 text-xs font-medium"
                  style={{
                    borderColor: 'var(--border-strong)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Deshacer
                </button>
                <button
                  type="button"
                  onClick={() => void onUpdateRawTranscripcion(rawDraft, true)}
                  disabled={analyzing || !rawDraft.trim()}
                  className="inline-flex h-8 items-center gap-1.5 rounded px-3 text-xs font-semibold disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: '#ffffff',
                  }}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                  Guardar y Re-analizar
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Bottom Sticky Composer */}
      <div
        className="border-t p-3"
        style={{
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'var(--bg-surface-2)',
        }}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div
            className="inline-flex rounded border p-0.5"
            style={{
              backgroundColor: 'var(--bg-canvas)',
              borderColor: 'var(--border-strong)',
            }}
          >
            <button
              type="button"
              disabled={isLocked}
              onClick={() => setSpeaker('LLAMANTE')}
              className="inline-flex h-6 items-center gap-1 rounded px-2 text-[11px] font-semibold transition-colors disabled:opacity-50"
              style={
                speaker === 'LLAMANTE'
                  ? { backgroundColor: 'var(--accent-primary-soft)', color: 'var(--accent-primary-text)' }
                  : { color: 'var(--text-muted)' }
              }
            >
              <User className="h-3 w-3" />
              Llamante
            </button>
            <button
              type="button"
              disabled={isLocked}
              onClick={() => setSpeaker('OPERADOR')}
              className="inline-flex h-6 items-center gap-1 rounded px-2 text-[11px] font-semibold transition-colors disabled:opacity-50"
              style={
                speaker === 'OPERADOR'
                  ? { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }
                  : { color: 'var(--text-muted)' }
              }
            >
              <Headphones className="h-3 w-3" />
              Operador
            </button>
          </div>

          <button
            type="button"
            disabled={isLocked || analyzing}
            onClick={() => void onReanalyze()}
            className="inline-flex h-6 items-center gap-1.5 rounded border px-2 text-[11px] font-medium transition-colors disabled:opacity-45"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
            title="Re-ejecutar análisis del copiloto (Ctrl+Enter)"
          >
            <RefreshCw className={`h-3 w-3 ${analyzing ? 'animate-spin' : ''}`} />
            <span>Re-analizar</span>
            <kbd
              className="font-mono-tabular hidden sm:inline rounded px-1 text-[9px]"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
            >
              Ctrl+↵
            </kbd>
          </button>
        </div>

        <div className="flex items-end gap-2">
          <textarea
            rows={2}
            value={turnDraft}
            disabled={isLocked}
            onChange={(e) => setTurnDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (turnDraft.trim()) {
                  void handleSendTurn(true);
                } else {
                  void onReanalyze();
                }
              }
            }}
            placeholder={
              isLocked
                ? 'Llamada cerrada (solo lectura).'
                : speaker === 'LLAMANTE'
                  ? 'Anexar respuesta del llamante y re-analizar...'
                  : 'Registrar pregunta del operador...'
            }
            className="flex-1 resize-none rounded border px-2.5 py-2 text-xs leading-snug outline-none disabled:opacity-50"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            type="button"
            disabled={isLocked || analyzing || !turnDraft.trim()}
            onClick={() => void handleSendTurn(true)}
            className="inline-flex h-[54px] shrink-0 flex-col items-center justify-center gap-0.5 rounded px-3 text-[11px] font-semibold transition-opacity disabled:opacity-45"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
            }}
            title="Anexar turno y re-analizar (Ctrl+Enter)"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Anexar</span>
          </button>
        </div>
      </div>
    </section>
  );
}
