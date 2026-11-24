import { AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';

export type FieldOrigin = 'ai' | 'human' | 'missing' | 'none';

interface FieldOriginTagProps {
  origin: FieldOrigin;
}

export function FieldOriginTag({ origin }: FieldOriginTagProps) {
  if (origin === 'none') return null;

  if (origin === 'missing') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold"
        style={{
          backgroundColor: 'var(--missing-bg)',
          borderColor: 'var(--missing-border)',
          color: 'var(--missing-text)',
        }}
      >
        <AlertCircle className="h-2.5 w-2.5 shrink-0" />
        Faltante
      </span>
    );
  }

  if (origin === 'human') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold"
        style={{
          backgroundColor: 'var(--human-bg)',
          borderColor: 'var(--human-border)',
          color: 'var(--human-text)',
        }}
      >
        <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
        Editado Operador
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold"
      style={{
        backgroundColor: 'var(--ai-bg)',
        borderColor: 'var(--ai-border)',
        color: 'var(--ai-text)',
      }}
    >
      <Sparkles className="h-2.5 w-2.5 shrink-0" />
      Sugerido IA
    </span>
  );
}
