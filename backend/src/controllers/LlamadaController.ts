import type { Request, Response } from 'express';
import {
  AgregarTurnoBodySchema,
  AnalizarLlamadaBodySchema,
  CrearLlamadaBodySchema,
  DerivarLlamadaBodySchema,
  ListarLlamadasQuerySchema,
  LlamadaIdParamsSchema,
  PatchLlamadaBodySchema,
} from '../schemas/index.js';
import type { LlamadaService } from '../services/index.js';
import { parseWithSchema } from './errors/ControllerError.js';

export class LlamadaController {
  constructor(private readonly llamadaService: LlamadaService) {}

  crear = async (req: Request, res: Response): Promise<void> => {
    const body = parseWithSchema(CrearLlamadaBodySchema, req.body ?? {}, 'body');
    const llamada = await this.llamadaService.crearLlamada(body);
    res.status(201).json(llamada);
  };

  listar = async (req: Request, res: Response): Promise<void> => {
    const filtros = parseWithSchema(
      ListarLlamadasQuerySchema,
      req.query,
      'query',
    );
    const llamadas = await this.llamadaService.listarLlamadas(filtros);
    res.status(200).json(llamadas);
  };

  obtenerPorId = async (req: Request, res: Response): Promise<void> => {
    const { id } = parseWithSchema(LlamadaIdParamsSchema, req.params, 'params');
    const llamada = await this.llamadaService.obtenerLlamadaPorId(id);
    res.status(200).json(llamada);
  };

  agregarTurno = async (req: Request, res: Response): Promise<void> => {
    const { id } = parseWithSchema(LlamadaIdParamsSchema, req.params, 'params');
    const body = parseWithSchema(AgregarTurnoBodySchema, req.body ?? {}, 'body');
    const llamada = await this.llamadaService.agregarTurno(id, body);
    res.status(200).json(llamada);
  };

  analizar = async (req: Request, res: Response): Promise<void> => {
    const { id } = parseWithSchema(LlamadaIdParamsSchema, req.params, 'params');
    const body = parseWithSchema(
      AnalizarLlamadaBodySchema,
      req.body ?? {},
      'body',
    );
    const llamada = await this.llamadaService.analizarLlamada(id, body);
    res.status(200).json(llamada);
  };

  actualizar = async (req: Request, res: Response): Promise<void> => {
    const { id } = parseWithSchema(LlamadaIdParamsSchema, req.params, 'params');
    const body = parseWithSchema(PatchLlamadaBodySchema, req.body ?? {}, 'body');
    const llamada = await this.llamadaService.actualizarPorOperador(id, body);
    res.status(200).json(llamada);
  };

  derivar = async (req: Request, res: Response): Promise<void> => {
    const { id } = parseWithSchema(LlamadaIdParamsSchema, req.params, 'params');
    const body = parseWithSchema(DerivarLlamadaBodySchema, req.body ?? {}, 'body');
    const resultado = await this.llamadaService.derivarLlamada(id, body);
    res.status(200).json(resultado);
  };

  descartar = async (req: Request, res: Response): Promise<void> => {
    const { id } = parseWithSchema(LlamadaIdParamsSchema, req.params, 'params');
    const llamada = await this.llamadaService.descartarLlamada(id);
    res.status(200).json(llamada);
  };
}
