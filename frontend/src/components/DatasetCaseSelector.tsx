import { ChevronDown, FileSpreadsheet, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CasoReferenciaCsv } from '../types/domain';
import { PriorityBadge } from './PriorityBadge';

interface DatasetCaseSelectorProps {
  cases: CasoReferenciaCsv[];
  loading: boolean;
  onSelectCase: (caso: CasoReferenciaCsv) => void;
}

export function DatasetCaseSelector({
  cases,
  loading,
  onSelectCase,
}: DatasetCaseSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter(
      (c) =>
        c.idRegistro.toLowerCase().includes(q) ||
        c.descripcionIncidente.toLowerCase().includes(q) ||
        c.categoria.toLowerCase().includes(q) ||
        c.prioridadSugerida.toLowerCase().includes(q) ||
        (c.calleDetectada ?? '').toLowerCase().includes(q) ||
        (c.barrioComuna ?? '').toLowerCase().includes(q),
    );
  }, [cases, query]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={loading}
        className="inline-flex h-8 items-center gap-2 rounded border px-2.5 text-xs font-medium transition-colors"
        style={{
          backgroundColor: 'var(--bg-surface-2)',
          borderColor: open ? 'var(--border-focus)' : 'var(--border-strong)',
          color: 'var(--text-primary)',
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--accent-primary-text)' }} />
        <span>Casos CSV ({cases.length})</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>

      {open ? (
        <div
          className="absolute left-0 top-10 z-50 w-[430px] max-w-[92vw] overflow-hidden rounded-md border shadow-2xl"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-strong)',
          }}
        >
          <div
            className="flex items-center gap-2 border-b px-3 py-2"
            style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-2)' }}
          >
            <Search className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por ID, calle, barrio, categoría o P1-P3..."
              className="w-full bg-transparent text-xs outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="rounded p-0.5 hover:opacity-80"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                Sin coincidencias para "{query}".
              </div>
            ) : (
              filtered.map((caso) => (
                <button
                  key={caso.idRegistro}
                  type="button"
                  onClick={() => {
                    onSelectCase(caso);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="flex w-full flex-col gap-1 px-3 py-2.5 text-left transition-colors"
                  style={{ borderColor: 'var(--border-subtle)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="font-mono-tabular text-[11px] font-semibold"
                        style={{ color: 'var(--accent-primary-text)' }}
                      >
                        {caso.idRegistro}
                      </span>
                      <span
                        className="truncate text-[10px] font-medium uppercase tracking-wide"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {caso.categoria.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <PriorityBadge prioridad={caso.prioridadSugerida} showLabel={false} />
                  </div>
                  <div className="text-xs font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {caso.descripcionIncidente}
                  </div>
                  <div className="truncate text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    {[caso.calleDetectada, caso.alturaDetectada, caso.barrioComuna]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
