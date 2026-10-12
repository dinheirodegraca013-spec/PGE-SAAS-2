import { apiClient } from '@/services/api/client';
import type { ApiResult, PaginatedResult } from '@/types/api';
import type { ProjetoMovelPlanejado } from '../types/projeto';

export const projetosService = {
  async listar(): Promise<ApiResult<PaginatedResult<ProjetoMovelPlanejado>>> {
    const response = await apiClient.get<ApiResult<PaginatedResult<ProjetoMovelPlanejado>>>(
      '/furniture/projetos',
    );
    return response.data;
  },

  async obterPorId(id: string): Promise<ApiResult<ProjetoMovelPlanejado>> {
    const response = await apiClient.get<ApiResult<ProjetoMovelPlanejado>>(
      `/furniture/projetos/${id}`,
    );
    return response.data;
  },

  async enviarOrcamentoPorWhatsApp(id: string): Promise<ApiResult<void>> {
    const response = await apiClient.post<ApiResult<void>>(
      `/furniture/projetos/${id}/enviar-orcamento-whatsapp`,
    );
    return response.data;
  },
};
