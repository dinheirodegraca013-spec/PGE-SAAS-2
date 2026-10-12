import { apiClient } from '@/services/api/client';
import type { ApiResult } from '@/types/api';
import type { AtualizarServicoInput, Servico } from '../types/servico';

export interface CriarServicoInput {
  clienteId: string;
  clienteNome: string;
  titulo?: string;
  escopo?: string;
}

export const servicosService = {
  async listar(): Promise<ApiResult<Servico[]>> {
    const response = await apiClient.get<ApiResult<Servico[]>>('/servicos');
    return response.data;
  },

  async obterPorId(id: string): Promise<ApiResult<Servico>> {
    const response = await apiClient.get<ApiResult<Servico>>(`/servicos/${id}`);
    return response.data;
  },

  async criar(input: CriarServicoInput): Promise<ApiResult<Servico>> {
    const response = await apiClient.post<ApiResult<Servico>>('/servicos', input);
    return response.data;
  },

  async atualizar(id: string, input: AtualizarServicoInput): Promise<ApiResult<Servico>> {
    const response = await apiClient.put<ApiResult<Servico>>(`/servicos/${id}`, input);
    return response.data;
  },
};
