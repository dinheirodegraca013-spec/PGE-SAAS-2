import { apiClient } from '@/services/api/client';
import type { ApiResult } from '@/types/api';
import type { Cliente, ClienteCreateInput } from '../types/cliente';

/**
 * Camada de serviço do módulo Clientes: isola as views de detalhes de HTTP.
 * Espelha exatamente o contrato de ERP.SaaS.Api.Controllers.ClientesController.
 */
export const clientesService = {
  async listar(): Promise<ApiResult<Cliente[]>> {
    const response = await apiClient.get<ApiResult<Cliente[]>>('/clientes');
    return response.data;
  },

  async obterPorId(id: string): Promise<ApiResult<Cliente>> {
    const response = await apiClient.get<ApiResult<Cliente>>(`/clientes/${id}`);
    return response.data;
  },

  async criar(cliente: ClienteCreateInput): Promise<ApiResult<Cliente>> {
    const response = await apiClient.post<ApiResult<Cliente>>('/clientes', cliente);
    return response.data;
  },
};
