import { AlertTriangle, CheckCircle2, Inbox, X } from 'lucide-react';
import { LiveAssistanceColumn } from '../features/assistance/LiveAssistanceColumn';
import { DispatchDraftColumn } from '../features/dispatch/DispatchDraftColumn';
import { TranscriptColumn } from '../features/transcript/TranscriptColumn';
import type { PatchLlamadaPayload } from '../types/api';
import type {
  CasoReferenciaCsv,
  CatalogoProtocolos,
  EstadoPreguntaOperador,
  HablanteTurno,
  Llamada,
  OrigenReporte,
} from '../types/domain';

interface OperatorConsolePageProps {
  llamada: Llamada | null;
  catalogo: CatalogoProtocolos | null;
  quickCases: CasoReferenciaCsv[];
  analyzing: boolean;
  submitting: boolean;
  errorMessage: string | null;
  onDismissError: () => void;
  onCreateFreeCall: (origen: OrigenReporte, transcripcion: string) => Promise<void>;
  onSelectCase: (caso: CasoReferenciaCsv) => void;
  onAppendTurno: (
    hablante: Exclude<HablanteTurno, 'SISTEMA'>,
    texto: string,
    reanalizar: boolean,
  ) => Promise<void>;
  onUpdateRawTranscripcion: (texto: string, reanalizar: boolean) => Promise<void>;
  onReanalyze: () => Promise<void>;
  onTogglePreArribo: (instruccionId: number, transmitida: boolean) => Promise<void>;
  onUpdateChecklistItem: (
    preguntaId: number,
    estadoOperador: EstadoPreguntaOperador | null,
    notaOperador?: string | null,
  ) => Promise<void>;
  onPatchLlamada: (payload: PatchLlamadaPayload) => Promise<void>;
  onDerivar: () => Promise<void>;
  onDescartar: () => Promise<void>;
  onOpenCadTray: () => void;
}

export function OperatorConsolePage({
  llamada,
  catalogo,
  quickCases,
  analyzing,
  submitting,
  errorMessage,
  onDismissError,
  onCreateFreeCall,
  onSelectCase,
  onAppendTurno,
  onUpdateRawTranscripcion,
  onReanalyze,
  onTogglePreArribo,
  onUpdateChecklistItem,
  onPatchLlamada,
  onDerivar,
  onDescartar,
  onOpenCadTray,
}: OperatorConsolePageProps) {
  const isDegraded = llamada?.ultimoAnalisis?.degradado === true;
  const isDerived = llamada?.estado === 'DERIVADA';

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      {/* Contextual non-blocking banners */}
      {errorMessage ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 border-b px-4 py-2 text-xs font-medium"
          style={{
            backgroundColor: 'var(--p1-bg)',
            borderColor: 'var(--p1-border)',
            color: 'var(--p1-text)',
          }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={onDismissError}
            className="rounded p-0.5 hover:opacity-80"
            aria-label="Cerrar alerta"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {isDegraded ? (
        <div
          role="status"
          className="flex items-center gap-2 border-b px-4 py-1.5 text-xs font-medium"
          style={{
            backgroundColor: 'var(--degraded-bg)',
            borderColor: 'var(--degraded-border)',
            color: 'var(--degraded-text)',
          }}
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            Modo degradado activo:{' '}
            {llamada?.ultimoAnalisis?.motivoDegradacion ??
              'El proveedor LLM externo no respondió; se aplicó el motor determinista local.'}
          </span>
        </div>
      ) : null}

      {isDerived && llamada?.cartaDespacho ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-xs font-medium"
          style={{
            backgroundColor: 'var(--derived-bg)',
            borderColor: 'var(--derived-border)',
            color: 'var(--derived-text)',
          }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              Llamada derivada formalmente a CAD · Carta{' '}
              <strong className="font-mono-tabular">{llamada.cartaDespacho.id}</strong> registrada a
              las{' '}
              <span className="font-mono-tabular">
                {new Date(llamada.cartaDespacho.derivadaEn).toLocaleTimeString('es-AR')}
              </span>
              . Edición bloqueada para auditoría.
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenCadTray}
            className="inline-flex h-7 items-center gap-1.5 rounded border px-2.5 text-xs font-semibold"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--derived-border)',
              color: 'var(--derived-text)',
            }}
          >
            <Inbox className="h-3.5 w-3.5" />
            Ver en Bandeja CAD
          </button>
        </div>
      ) : null}

      {/* Strictly 3-Column Tactical Grid */}
      <main className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-12 overflow-y-auto lg:overflow-hidden">
        <div className="min-h-[420px] lg:col-span-3 lg:h-full lg:min-h-0">
          <TranscriptColumn
            llamada={llamada}
            analyzing={analyzing}
            quickCases={quickCases}
            onCreateFreeCall={onCreateFreeCall}
            onSelectCase={onSelectCase}
            onAppendTurno={onAppendTurno}
            onUpdateRawTranscripcion={onUpdateRawTranscripcion}
            onReanalyze={onReanalyze}
          />
        </div>

        <div className="min-h-[420px] lg:col-span-5 lg:h-full lg:min-h-0">
          <LiveAssistanceColumn
            llamada={llamada}
            analyzing={analyzing}
            onTogglePreArribo={onTogglePreArribo}
            onUpdateChecklistItem={onUpdateChecklistItem}
            onUpdateRiesgos={(riesgos) => onPatchLlamada({ riesgosDetectados: riesgos })}
          />
        </div>

        <div className="min-h-[480px] lg:col-span-4 lg:h-full lg:min-h-0">
          <DispatchDraftColumn
            llamada={llamada}
            catalogo={catalogo}
            analyzing={analyzing}
            submitting={submitting}
            onPatchLlamada={onPatchLlamada}
            onDerivar={onDerivar}
            onDescartar={onDescartar}
          />
        </div>
      </main>
    </div>
  );
}
