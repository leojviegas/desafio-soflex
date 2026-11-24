import { AlertOctagon, AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import type { PrioridadIncidente } from '../types/domain';
import { PRIORIDAD_META } from '../types/domain';

interface PriorityBadgeProps {
  prioridad: PrioridadIncidente | null;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const ICON_BY_PRIORITY = {
  P1: AlertOctagon,
  P2: ShieldAlert,
  P3: AlertTriangle,
  P4: Info,
} as const;

const STYLE_BY_PRIORITY: Record<PrioridadIncidente, React.CSSProperties> = {
  P1: {
    backgroundColor: 'var(--p1-bg)',
    borderColor: 'var(--p1-border)',
    color: 'var(--p1-text)',
  },
  P2: {
    backgroundColor: 'var(--p2-bg)',
    borderColor: 'var(--p2-border)',
    color: 'var(--p2-text)',
  },
  P3: {
    backgroundColor: 'var(--p3-bg)',
    borderColor: 'var(--p3-border)',
    color: 'var(--p3-text)',
  },
  P4: {
    backgroundColor: 'var(--p4-bg)',
    borderColor: 'var(--p4-border)',
    color: 'var(--p4-text)',
  },
};

export function PriorityBadge({
  prioridad,
  size = 'sm',
  showLabel = true,
}: PriorityBadgeProps) {
  if (!prioridad) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-muted)',
        }}
      >
        Sin prioridad
      </span>
    );
  }

  const Icon = ICON_BY_PRIORITY[prioridad];
  const meta = PRIORIDAD_META[prioridad];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border font-semibold tracking-tight ${
        size === 'md' ? 'px-2 py-1 text-xs' : 'px-1.5 py-0.5 text-[11px]'
      }`}
      style={STYLE_BY_PRIORITY[prioridad]}
      title={meta.descripcion}
    >
      <Icon className={size === 'md' ? 'h-3.5 w-3.5 shrink-0' : 'h-3 w-3 shrink-0'} />
      <span className="font-mono-tabular">{meta.codigo}</span>
      {showLabel ? <span className="font-medium opacity-95">{meta.etiqueta}</span> : null}
    </span>
  );
}
