import type { EstadoLlamada } from '../types/domain';

interface CallStatusPillProps {
  estado: EstadoLlamada;
}

const META: Record<
  EstadoLlamada,
  { label: string; dot: string; bg: string; border: string; text: string }
> = {
  EN_CURSO: {
    label: 'EN CURSO',
    dot: '#38bdf8',
    bg: 'var(--accent-primary-soft)',
    border: 'var(--border-focus)',
    text: 'var(--accent-primary-text)',
  },
  DERIVADA: {
    label: 'DERIVADA A CAD',
    dot: '#34d399',
    bg: 'var(--derived-bg)',
    border: 'var(--derived-border)',
    text: 'var(--derived-text)',
  },
  DESCARTADA: {
    label: 'DESCARTADA',
    dot: '#94a3b8',
    bg: 'var(--p4-bg)',
    border: 'var(--p4-border)',
    text: 'var(--p4-text)',
  },
};

export function CallStatusPill({ estado }: CallStatusPillProps) {
  const m = META[estado];
  return (
    <span
      className="font-mono-tabular inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold tracking-wide"
      style={{
        backgroundColor: m.bg,
        borderColor: m.border,
        color: m.text,
      }}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${estado === 'EN_CURSO' ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: m.dot }}
      />
      {m.label}
    </span>
  );
}
