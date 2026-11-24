import type { Request, Response } from 'express';
import type { ProtocoloService } from '../services/index.js';

export class ProtocoloController {
  constructor(private readonly protocoloService: ProtocoloService) {}

  getProtocolos = async (_req: Request, res: Response): Promise<void> => {
    const catalogo = await this.protocoloService.obtenerCatalogoCompleto();
    res.status(200).json(catalogo);
  };
}
