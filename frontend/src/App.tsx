import { useCallback, useEffect, useMemo, useState } from 'react';
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

export function App() {
  const { theme, toggleTheme } = useTheme();
  const [activeView, setActiveView] = useState<ActiveView>('console');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [catalogo, setCatalogo] = useState<CatalogoProtocolos | null>(null);
  const [datasetCases, setDatasetCases] = useState<CasoReferenciaCsv[]>([]);
  const [cartasDespacho, setCartasDespacho] = useState<CartaDespacho[]>([]);
  const [llamada, setLlamada] = useState<Llamada | null>(null);

  const [bootstrapping, setBootstrapping] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      try {
        const [healthRes, protocolosRes, datasetRes, cartasRes] = await Promise.all([
          apiClient.getHealth(),
          apiClient.getProtocolos(),
          apiClient.getDatasetLlamadas(),
          apiClient.listCartasDespacho(),
        ]);
        if (!active) return;
        setHealth(healthRes);
        setCatalogo(protocolosRes);
        setDatasetCases(datasetRes);
        setCartasDespacho(cartasRes);
      } catch (err) {
        if (!active) return;
        setErrorMessage(
          err instanceof Error ? err.message : 'No se pudo inicializar el panel operativo.',
        );
      } finally {
        if (active) setBootstrapping(false);
      }
    }
    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

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
  }, []);

  const handleAppendTurno = useCallback(
    async (
      hablante: Exclude<HablanteTurno, 'SISTEMA'>,
      texto: string,
      reanalizar: boolean,
    ) => {
      if (!llamada) return;
      setErrorMessage(null);
      if (reanalizar) setAnalyzing(true);
      try {
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
      const updated = await apiClient.analizarLlamada(llamada.id);
      setLlamada(updated);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al ejecutar análisis.');
    } finally {
      setAnalyzing(false);
    }
  }, [llamada, analyzing]);

  const handlePatchLlamada = useCallback(
    async (payload: PatchLlamadaPayload) => {
      if (!llamada || llamada.estado !== 'EN_CURSO') return;
      setErrorMessage(null);
      try {
        const updated = await apiClient.patchLlamada(llamada.id, payload);
        setLlamada(updated);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'No se pudo guardar el cambio.');
      }
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
      const result = await apiClient.derivarLlamada(llamada.id, {
        notasOperativasDespacho: llamada.notasOperativasDespacho,
      });
      setLlamada(result.llamada);
      const updatedCartas = await apiClient.listCartasDespacho();
      setCartasDespacho(updatedCartas);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'No se pudo derivar la carta a CAD.');
    } finally {
      setSubmitting(false);
    }
  }, [llamada, submitting]);

  const handleDescartar = useCallback(async () => {
    if (!llamada || llamada.estado !== 'EN_CURSO' || submitting) return;
    setErrorMessage(null);
    setSubmitting(true);
    try {
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
        cadCount={cartasDespacho.length}
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
          errorMessage={errorMessage}
          onDismissError={() => setErrorMessage(null)}
          onCreateFreeCall={handleCreateFreeCall}
          onSelectCase={(caso) => void handleSelectDatasetCase(caso)}
          onAppendTurno={handleAppendTurno}
          onUpdateRawTranscripcion={handleUpdateRawTranscripcion}
          onReanalyze={handleReanalyze}
          onTogglePreArribo={handleTogglePreArribo}
          onUpdateChecklistItem={handleUpdateChecklistItem}
          onPatchLlamada={handlePatchLlamada}
          onDerivar={handleDerivar}
          onDescartar={handleDescartar}
          onOpenCadTray={() => setActiveView('cad')}
        />
      ) : (
        <CadTrayPage
          cartas={cartasDespacho}
          catalogo={catalogo}
          onBackToConsole={() => setActiveView('console')}
        />
      )}
    </div>
  );
}

export default App;
