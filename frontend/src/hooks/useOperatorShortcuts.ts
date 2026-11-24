import { useEffect, useRef } from 'react';
import type { PrioridadIncidente } from '../types/domain';

interface OperatorShortcutsHandlers {
  enabled: boolean;
  onAnalyze: () => void;
  onDerive: () => void;
  onSelectPriority: (prioridad: PrioridadIncidente) => void;
}

const PRIORITY_KEY_MAP: Record<string, PrioridadIncidente> = {
  '1': 'P1',
  '2': 'P2',
  '3': 'P3',
  '4': 'P4',
};

export function useOperatorShortcuts(handlers: OperatorShortcutsHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const current = handlersRef.current;
      if (!current.enabled) return;

      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        current.onAnalyze();
        return;
      }

      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        const lower = event.key.toLowerCase();
        if (lower === 'd') {
          event.preventDefault();
          current.onDerive();
          return;
        }
        const priority = PRIORITY_KEY_MAP[event.key];
        if (priority) {
          event.preventDefault();
          current.onSelectPriority(priority);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
