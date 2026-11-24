import type {
  AppendTurnoPayload,
  CopilotApiClient,
  CreateLlamadaPayload,
  DerivarLlamadaPayload,
  DerivarLlamadaResponse,
  HealthResponse,
  ListCartasDespachoFilters,
  ListLlamadasFilters,
  PatchLlamadaPayload,
} from '../types/api';
import type {
  CartaDespacho,
  CasoReferenciaCsv,
  CatalogoProtocolos,
  Llamada,
} from '../types/domain';

export class ApiClientError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
  }
}

export class HttpCopilotApiClient implements CopilotApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      ...init,
    });

    if (!response.ok) {
      let message = `Error HTTP ${response.status}`;
      let details: unknown;
      try {
        const body = (await response.json()) as { message?: string; error?: string; details?: unknown };
        message = body.message ?? body.error ?? message;
        details = body.details;
      } catch {
        // ignore JSON parse failure on non-JSON error body
      }
      throw new ApiClientError(message, response.status, details);
    }

    return (await response.json()) as T;
  }

  getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }

  getProtocolos(): Promise<CatalogoProtocolos> {
    return this.request<CatalogoProtocolos>('/protocolos');
  }

  getDatasetLlamadas(): Promise<CasoReferenciaCsv[]> {
    return this.request<CasoReferenciaCsv[]>('/dataset/llamadas');
  }

  createLlamada(payload: CreateLlamadaPayload): Promise<Llamada> {
    return this.request<Llamada>('/llamadas', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  listLlamadas(filters?: ListLlamadasFilters): Promise<Llamada[]> {
    const params = new URLSearchParams();
    if (filters?.estado) params.set('estado', filters.estado);
    if (filters?.categoriaId) params.set('categoriaId', String(filters.categoriaId));
    if (filters?.subcategoriaId) params.set('subcategoriaId', String(filters.subcategoriaId));
    if (filters?.prioridad) params.set('prioridad', filters.prioridad);
    const qs = params.toString();
    return this.request<Llamada[]>(`/llamadas${qs ? `?${qs}` : ''}`);
  }

  getLlamada(id: string): Promise<Llamada> {
    return this.request<Llamada>(`/llamadas/${encodeURIComponent(id)}`);
  }

  appendTurno(id: string, payload: AppendTurnoPayload): Promise<Llamada> {
    return this.request<Llamada>(`/llamadas/${encodeURIComponent(id)}/turnos`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  analizarLlamada(id: string): Promise<Llamada> {
    return this.request<Llamada>(`/llamadas/${encodeURIComponent(id)}/analizar`, {
      method: 'POST',
    });
  }

  patchLlamada(id: string, payload: PatchLlamadaPayload): Promise<Llamada> {
    return this.request<Llamada>(`/llamadas/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  derivarLlamada(id: string, payload?: DerivarLlamadaPayload): Promise<DerivarLlamadaResponse> {
    return this.request<DerivarLlamadaResponse>(`/llamadas/${encodeURIComponent(id)}/derivar`, {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    });
  }

  descartarLlamada(id: string): Promise<Llamada> {
    return this.request<Llamada>(`/llamadas/${encodeURIComponent(id)}/descartar`, {
      method: 'POST',
    });
  }

  listCartasDespacho(filters?: ListCartasDespachoFilters): Promise<CartaDespacho[]> {
    const params = new URLSearchParams();
    if (filters?.prioridad) params.set('prioridad', filters.prioridad);
    if (filters?.categoriaId) params.set('categoriaId', String(filters.categoriaId));
    const qs = params.toString();
    return this.request<CartaDespacho[]>(`/cartas-despacho${qs ? `?${qs}` : ''}`);
  }

  getCartaDespacho(id: string): Promise<CartaDespacho> {
    return this.request<CartaDespacho>(`/cartas-despacho/${encodeURIComponent(id)}`);
  }
}
