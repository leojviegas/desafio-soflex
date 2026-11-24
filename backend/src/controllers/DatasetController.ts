import type { Request, Response } from 'express';
import type { DatasetService } from '../services/index.js';

export class DatasetController {
  constructor(private readonly datasetService: DatasetService) {}

  getDatasetLlamadas = (_req: Request, res: Response): void => {
    const casos = this.datasetService.listarCasosReferencia();
    res.status(200).json(casos);
  };
}
