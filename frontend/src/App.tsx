import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OperationalHeader, type ActiveView } from './components/OperationalHeader';
import { useOperatorShortcuts } from './hooks/useOperatorShortcuts';
import { useTheme } from './hooks/useTheme';
import { CadTrayPage } from './pages/CadTrayPage';
import { OperatorConsolePage } from './pages/OperatorConsolePage';
import { apiClient } from './services';
import type { HealthResponse, PatchLlamadaPayload } from './types/api';
import type {
  CartaDespacho,
  CasoReferenciaCsv,
  CatalogoProtocolos,
  EstadoPreguntaOperador,
  HablanteTurno,
  Llamada,
  OrigenReporte,
  PrioridadIncidente,
} from './types/domain';

const QUICK_CASE_IDS = ['SFX-REC-2026-001', 'SFX-REC-2026-009', 'SFX-REC-2026-012'];
const ACTIVE_LLAMADA_STORAGE_KEY = 'soflex.activeLlamadaId';

function saveActiveLlamadaId(id: string | null): void {
  try {
    if (id) {
      window.sessionStorage.setItem(ACTIVE_LLAMADA_STORAGE_KEY, id);
    } else {
      window.sessionStorage.removeItem(ACTIVE_LLAMADA_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors in restricted contexts
  }
}

function readActiveLlamadaId(): string | null {
  try {
    return window.sessionStorage.getItem(ACTIVE_LLAMADA_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function App() {
  const { theme, toggleTheme } = useTheme();
  const [activeView, setActiveView] = useState<ActiveView>('console');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [catalogo, setCatalogo] = useState<CatalogoProtocolos | null>(null);
  const [datasetCases, setDatasetCases] = useState<CasoReferenciaCsv[]>([]);
  const [cartasDespacho, setCartasDespacho] = useState<CartaDespacho[]>([]);
  const [cadTotalCount, setCadTotalCount] = useState(0);
  const [cadPriorityFilter, setCadPriorityFilter] = useState<PrioridadIncidente | 'TODAS'>('TODAS');
  const [cadCategoriaFilter, setCadCategoriaFilter] = useState<number | 'TODAS'>('TODAS');
  const [loadingCad, setLoadingCad] = useState(false);
  const [llamada, setLlamada] = useState<Llamada | null>(null);

  const [bootstrapping, setBootstrapping] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingCount, setSavingCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const patchQueueRef = useRef<Promise<void>>(Promise.resolve());
  const flushDraftRef = useRef<(() => Promise<void>) | null>(null);

  const registerFlush = useCallback((flushFn: (() => Promise<void>) | null) => {
    flushDraftRef.current = flushFn;
  }, []);

  const bootstrap = useCallback(async () => {
    setBootstrapping(true);
    setErrorMessage(null);
    try {
      const [healthRes, protocolosRes, datasetRes, cartasRes] = await Promise.all([
        apiClient.getHealth(),
        apiClient.getProtocolos(),
        apiClient.getDatasetLlamadas(),
        apiClient.listCartasDespacho(),
      ]);
      setHealth(healthRes);
      setCatalogo(protocolosRes);
      setDatasetCases(datasetRes);
      setCartasDespacho(cartasRes);
      setCadTotalCount(cartasRes.length);

      const savedId = readActiveLlamadaId();
      if (savedId) {
        try {
          const restored = await apiClient.getLlamada(savedId);
          setLlamada(restored);
        } catch {
          saveActiveLlamadaId(null);
        }
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'No se pudo inicializar el panel operativo.',
      );
    } finally {
      setBootstrapping(false);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const loadCartasDespacho = useCallback(
    async (
      priority: PrioridadIncidente | 'TODAS',
      categoriaId: number | 'TODAS',
    ) => {
      setLoadingCad(true);
      try {
        const filters = {
          ...(priority !== 'TODAS' ? { prioridad: priority } : {}),
          ...(categoriaId !== 'TODAS' ? { categoriaId } : {}),
        };
        const result = await apiClient.listCartasDespacho(filters);
        setCartasDespacho(result);
        if (priority === 'TODAS' && categoriaId === 'TODAS') {
          setCadTotalCount(result.length);
        }
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'No se pudo cargar la Bandeja CAD.',
        );
      } finally {
        setLoadingCad(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (activeView === 'cad') {
      void loadCartasDespacho(cadPriorityFilter, cadCategoriaFilter);
    }
  }, [activeView, cadPriorityFilter, cadCategoriaFilter, loadCartasDespacho]);

  const quickCases = useMemo(() => {
    const chosen = QUICK_CASE_IDS.map((id) =>
      datasetCases.find((c) => c.idRegistro === id),
    ).filter((c): c is CasoReferenciaCsv => Boolean(c));
    return chosen.length > 0 ? chosen : datasetCases.slice(0, 3);
  }, [datasetCases]);

  const handleSelectDatasetCase = useCallback(async (caso: CasoReferenciaCsv) => {
    setErrorMessage(null);
    setActiveView('console');
    setAnalyzing(true);
    try {
      const created = await apiClient.createLlamada({
        origenReporte: caso.origenReporte,
        transcripcionCruda: caso.transcripcionCruda,
        analizarAhora: true,
      });
      setLlamada(created);
      saveActiveLlamadaId(created.id);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al cargar el caso del dataset.');
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const handleCreateFreeCall = useCallback(
    async (origenReporte: OrigenReporte, transcripcionCruda: string) => {
      setErrorMessage(null);
      setActiveView('console');
      setAnalyzing(true);
      try {
        const created = await apiClient.createLlamada({
          origenReporte,
          transcripcionCruda,
          analizarAhora: true,
        });
        setLlamada(created);
        saveActiveLlamadaId(created.id);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Error al crear la llamada.');
      } finally {
        setAnalyzing(false);
      }
    },
    [],
  );

  const handleNewFreeCall = useCallback(() => {
    setErrorMessage(null);
    setActiveView('console');
    setLlamada(null);
    saveActiveLlamadaId(null);
  }, []);

  const handleAppendTurno = useCallback(
    async (
      hablante: HablanteTurno,
      texto: string,
      reanalizar: boolean,
    ) => {
      if (!llamada) return;
      setErrorMessage(null);
      if (reanalizar) setAnalyzing(true);
      try {
        await flushDraftRef.current?.();
        await patchQueueRef.current;
        const updated = await apiClient.appendTurno(llamada.id, {
          hablante,
          texto,
          reanalizar,
        });
        setLlamada(updated);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Error al anexar el turno.');
      } finally {
        if (reanalizar) setAnalyzing(false);
      }
    },
    [llamada],
  );

  const handleUpdateRawTranscripcion = useCallback(
    async (texto: string, reanalizar: boolean) => {
      if (!llamada) return;
      setErrorMessage(null);
      if (reanalizar) setAnalyzing(true);
      try {
        await flushDraftRef.current?.();
        await patchQueueRef.current;
        const patched = await apiClient.patchLlamada(llamada.id, {
          transcripcionCruda: texto,
        });
        if (reanalizar) {
          const reanalyzed = await apiClient.analizarLlamada(patched.id);
          setLlamada(reanalyzed);
        } else {
          setLlamada(patched);
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Error al actualizar transcripción.');
      } finally {
        if (reanalizar) setAnalyzing(false);
      }
    },
    [llamada],
  );

  const handleReanalyze = useCallback(async () => {
    if (!llamada || llamada.estado !== 'EN_CURSO' || analyzing) return;
    setErrorMessage(null);
    setAnalyzing(true);
    try {
      await flushDraftRef.current?.();
      await patchQueueRef.current;
      const updated = await apiClient.analizarLlamada(llamada.id);
      setLlamada(updated);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al ejecutar análisis.');
    } finally {
      setAnalyzing(false);
    }
  }, [llamada, analyzing]);

  const handlePatchLlamada = useCallback(
    (payload: PatchLlamadaPayload): Promise<void> => {
      if (!llamada || llamada.estado !== 'EN_CURSO') return Promise.resolve();
      const targetId = llamada.id;
      setErrorMessage(null);
      setSavingCount((c) => c + 1);

      const nextTask = patchQueueRef.current.then(async () => {
        try {
          const updated = await apiClient.patchLlamada(targetId, payload);
          setLlamada((current) => (current?.id === targetId ? updated : current));
        } catch (err) {
          setErrorMessage(err instanceof Error ? err.message : 'No se pudo guardar el cambio.');
        } finally {
          setSavingCount((c) => Math.max(0, c - 1));
        }
      });

      patchQueueRef.current = nextTask;
      return nextTask;
    },
    [llamada],
  );

  const handleTogglePreArribo = useCallback(
    async (instruccionId: number, transmitida: boolean) => {
      await handlePatchLlamada({
        instruccionesPreArribo: [{ instruccionId, transmitida }],
      });
    },
    [handlePatchLlamada],
  );

  const handleUpdateChecklistItem = useCallback(
    async (
      preguntaId: number,
      estadoOperador: EstadoPreguntaOperador | null,
      notaOperador?: string | null,
    ) => {
      await handlePatchLlamada({
        checklist: [{ preguntaId, estadoOperador, notaOperador }],
      });
    },
    [handlePatchLlamada],
  );

  const handleDerivar = useCallback(async () => {
    if (!llamada || llamada.estado !== 'EN_CURSO' || submitting) return;
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await flushDraftRef.current?.();
      await patchQueueRef.current;
      const result = await apiClient.derivarLlamada(llamada.id);
      setLlamada(result.llamada);
      const allCartas = await apiClient.listCartasDespacho();
      setCadTotalCount(allCartas.length);
      if (cadPriorityFilter === 'TODAS' && cadCategoriaFilter === 'TODAS') {
        setCartasDespacho(allCartas);
      } else {
        await loadCartasDespacho(cadPriorityFilter, cadCategoriaFilter);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'No se pudo derivar la carta a CAD.');
    } finally {
      setSubmitting(false);
    }
  }, [llamada, submitting, cadPriorityFilter, cadCategoriaFilter, loadCartasDespacho]);

  const handleDescartar = useCallback(async () => {
    if (!llamada || llamada.estado !== 'EN_CURSO' || submitting) return;
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await flushDraftRef.current?.();
      await patchQueueRef.current;
      const updated = await apiClient.descartarLlamada(llamada.id);
      setLlamada(updated);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'No se pudo descartar la llamada.');
    } finally {
      setSubmitting(false);
    }
  }, [llamada, submitting]);

  const handleShortcutPriority = useCallback(
    (prioridad: PrioridadIncidente) => {
      if (!llamada || llamada.estado !== 'EN_CURSO') return;
      void handlePatchLlamada({ prioridad });
    },
    [llamada, handlePatchLlamada],
  );

  useOperatorShortcuts({
    enabled: activeView === 'console' && llamada !== null && llamada.estado === 'EN_CURSO',
    onAnalyze: () => void handleReanalyze(),
    onDerive: () => void handleDerivar(),
    onSelectPriority: handleShortcutPriority,
  });

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <OperationalHeader
        activeView={activeView}
        onChangeView={setActiveView}
        llamada={llamada}
        health={health}
        datasetCases={datasetCases}
        cadCount={cadTotalCount}
        loading={bootstrapping}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSelectDatasetCase={(caso) => void handleSelectDatasetCase(caso)}
        onNewFreeCall={handleNewFreeCall}
      />

      {activeView === 'console' ? (
        <OperatorConsolePage
          llamada={llamada}
          catalogo={catalogo}
          quickCases={quickCases}
          analyzing={analyzing}
          submitting={submitting}
          savingDraft={savingCount > 0}
          errorMessage={errorMessage}
          onDismissError={() => setErrorMessage(null)}
          onRetryBootstrap={() => void bootstrap()}
          onCreateFreeCall={handleCreateFreeCall}
          onSelectCase={(caso) => void handleSelectDatasetCase(caso)}
          onAppendTurno={handleAppendTurno}
          onUpdateRawTranscripcion={handleUpdateRawTranscripcion}
          onReanalyze={handleReanalyze}
          onTogglePreArribo={handleTogglePreArribo}
          onUpdateChecklistItem={handleUpdateChecklistItem}
          onPatchLlamada={handlePatchLlamada}
          onRegisterFlush={registerFlush}
          onDerivar={handleDerivar}
          onDescartar={handleDescartar}
          onOpenCadTray={() => setActiveView('cad')}
        />
      ) : (
        <CadTrayPage
          cartas={cartasDespacho}
          catalogo={catalogo}
          loading={loadingCad}
          priorityFilter={cadPriorityFilter}
          categoriaFilter={cadCategoriaFilter}
          onChangePriorityFilter={setCadPriorityFilter}
          onChangeCategoriaFilter={setCadCategoriaFilter}
          onRefresh={() => void loadCartasDespacho(cadPriorityFilter, cadCategoriaFilter)}
          onBackToConsole={() => setActiveView('console')}
        />
      )}
    </div>
  );
}

export default App;
