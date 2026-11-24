import type { CartaDespachoSnapshot } from '../domain/index.js';
import type {
  CartaDespachoRepository,
  ListarCartasDespachoFiltros,
} from '../repositories/index.js';
import { NotFoundError } from './errors/ServiceError.js';

/**
 * Servicio de consulta para la bandeja CAD de Cartas de Despacho inmutables.
 */
export class CartaDespachoService {
  constructor(
    private readonly cartaDespachoRepository: CartaDespachoRepository,
  ) {}

  async listarCartas(
    filtros?: ListarCartasDespachoFiltros,
  ): Promise<CartaDespachoSnapshot[]> {
    const cartas = await this.cartaDespachoRepository.findAll(filtros);
    return cartas.map((carta) => carta.toJSON());
  }

  async obtenerCartaPorId(id: string): Promise<CartaDespachoSnapshot> {
    const carta = await this.cartaDespachoRepository.findById(id);
    if (!carta) {
      throw new NotFoundError(
        `No se encontró la carta de despacho con id "${id}".`,
        { cartaDespachoId: id },
      );
    }
    return carta.toJSON();
  }
}
