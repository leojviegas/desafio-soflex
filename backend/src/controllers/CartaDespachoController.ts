import type { Request, Response } from 'express';
import {
  CartaDespachoIdParamsSchema,
  ListarCartasDespachoQuerySchema,
} from '../schemas/index.js';
import type { CartaDespachoService } from '../services/index.js';
import { parseWithSchema } from './errors/ControllerError.js';

export class CartaDespachoController {
  constructor(private readonly cartaDespachoService: CartaDespachoService) {}

  listar = async (req: Request, res: Response): Promise<void> => {
    const filtros = parseWithSchema(
      ListarCartasDespachoQuerySchema,
      req.query,
      'query',
    );
    const cartas = await this.cartaDespachoService.listarCartas(filtros);
    res.status(200).json(cartas);
  };

  obtenerPorId = async (req: Request, res: Response): Promise<void> => {
    const { id } = parseWithSchema(
      CartaDespachoIdParamsSchema,
      req.params,
      'params',
    );
    const carta = await this.cartaDespachoService.obtenerCartaPorId(id);
    res.status(200).json(carta);
  };
}
