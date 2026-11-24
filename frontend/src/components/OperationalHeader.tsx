import {
  AlertTriangle,
  Cpu,
  Inbox,
  Moon,
  Plus,
  Radio,
  Sun,
} from 'lucide-react';
import type { HealthResponse } from '../types/api';
import type { CasoReferenciaCsv, Llamada } from '../types/domain';
import type { ThemeMode } from '../hooks/useTheme';
import { CallStatusPill } from './CallStatusPill';
import { DatasetCaseSelector } from './DatasetCaseSelector';

export type ActiveView = 'console' | 'cad';

interface OperationalHeaderProps {
  activeView: ActiveView;
  onChangeView: (view: ActiveView) => void;
  llamada: Llamada | null;
  health: HealthResponse | null;
  datasetCases: CasoReferenciaCsv[];
  cadCount: number;
  loading: boolean;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onSelectDatasetCase: (caso: CasoReferenciaCsv) => void;
  onNewFreeCall: () => void;
}

export function OperationalHeader({
  activeView,
  onChangeView,
  llamada,
  health,
  datasetCases,
  cadCount,
  loading,
  theme,
  onToggleTheme,
  onSelectDatasetCase,
  onNewFreeCall,
}: OperationalHeaderProps) {
  const analisis = llamada?.ultimoAnalisis;
  const provider = analisis?.proveedorUsado ?? health?.ai.provider ?? 'mock';
  const model = analisis?.modeloUsado ?? health?.ai.model ?? 'deterministic-rules-v1';
  const isMock = provider === 'mock';
  const degradado = analisis?.degradado ?? false;

  return (
    <header
      className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b px-3 lg:px-4"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Left: Brand + Active Call + CSV / New Call */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="flex h-7 w-7 items-center justify-center rounded border"
            style={{
              backgroundColor: 'var(--accent-primary-soft)',
              borderColor: 'var(--border-focus)',
              color: 'var(--accent-primary-text)',
            }}
          >
            <Radio className="h-4 w-4" />
          </div>
          <div className="hidden sm:block leading-tight">
            <div className="text-xs font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              SOFLEX COPILOTO
            </div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Sala 911 · 103 · 107 · 147
            </div>
          </div>
        </div>

        <div className="h-5 w-px shrink-0" style={{ backgroundColor: 'var(--border-subtle)' }} />

        {llamada ? (
          <div className="hidden md:flex items-center gap-2">
            <span
              className="font-mono-tabular text-xs font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {llamada.id}
            </span>
            <CallStatusPill estado={llamada.estado} />
          </div>
        ) : (
          <span className="hidden md:inline text-xs" style={{ color: 'var(--text-muted)' }}>
            Sin llamada activa
          </span>
        )}

        <DatasetCaseSelector
          cases={datasetCases}
          loading={loading}
          onSelectCase={onSelectDatasetCase}
        />

        <button
          type="button"
          onClick={onNewFreeCall}
          className="inline-flex h-8 items-center gap-1.5 rounded border px-2.5 text-xs font-medium transition-colors hover:opacity-90"
          style={{
            backgroundColor: 'var(--accent-primary-soft)',
            borderColor: 'var(--border-focus)',
            color: 'var(--accent-primary-text)',
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Nueva llamada</span>
        </button>
      </div>

      {/* Right: AI Indicator + View Switcher + Theme */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Live AI status pill */}
        <div
          className="hidden xl:flex items-center gap-2 rounded border px-2.5 py-1 text-[11px]"
          style={{
            backgroundColor: degradado ? 'var(--degraded-bg)' : 'var(--bg-surface-2)',
            borderColor: degradado ? 'var(--degraded-border)' : 'var(--border-subtle)',
            color: degradado ? 'var(--degraded-text)' : 'var(--text-secondary)',
          }}
          title={
            degradado
              ? analisis?.motivoDegradacion ?? 'Fallback determinista activo'
              : `${provider} / ${model}`
          }
        >
          {degradado ? (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <Cpu className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--accent-primary-text)' }} />
          )}
          <span className="font-medium">
            {isMock ? 'Modo simulado (mock)' : `Modo real (${provider} / ${model})`}
          </span>
          {analisis ? (
            <span
              className="font-mono-tabular rounded px-1 py-0.5 text-[10px]"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
            >
              {analisis.latenciaMs} ms
            </span>
          ) : null}
        </div>

        {/* View navigation: Consola en Vivo vs Bandeja CAD */}
        <nav
          aria-label="Vistas principales"
          className="inline-flex rounded border p-0.5"
          style={{
            backgroundColor: 'var(--bg-canvas)',
            borderColor: 'var(--border-strong)',
          }}
        >
          <button
            type="button"
            onClick={() => onChangeView('console')}
            className="inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-semibold transition-colors"
            style={
              activeView === 'console'
                ? {
                    backgroundColor: 'var(--accent-primary)',
                    color: '#ffffff',
                  }
                : {
                    color: 'var(--text-secondary)',
                  }
            }
          >
            <Radio className="h-3.5 w-3.5" />
            <span>Consola</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeView('cad')}
            className="inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-xs font-semibold transition-colors"
            style={
              activeView === 'cad'
                ? {
                    backgroundColor: 'var(--accent-primary)',
                    color: '#ffffff',
                  }
                : {
                    color: 'var(--text-secondary)',
                  }
            }
          >
            <Inbox className="h-3.5 w-3.5" />
            <span>Bandeja CAD</span>
            <span
              className="font-mono-tabular rounded px-1.5 py-0.5 text-[10px] font-bold"
              style={
                activeView === 'cad'
                  ? { backgroundColor: 'rgba(255,255,255,0.22)', color: '#ffffff' }
                  : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }
              }
            >
              {cadCount}
            </span>
          </button>
        </nav>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="inline-flex h-8 w-8 items-center justify-center rounded border transition-colors hover:opacity-85"
          style={{
            backgroundColor: 'var(--bg-surface-2)',
            borderColor: 'var(--border-strong)',
            color: 'var(--text-primary)',
          }}
          title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
