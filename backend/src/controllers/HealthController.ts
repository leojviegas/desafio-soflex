import type { Request, Response } from 'express';
import type { HealthService } from '../services/index.js';

export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  getHealth = async (_req: Request, res: Response): Promise<void> => {
    const status = await this.healthService.obtenerEstado();
    res.status(200).json(status);
  };
}
