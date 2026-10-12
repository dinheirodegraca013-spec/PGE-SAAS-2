import { apiClient } from '@/services/api/client';
import type { ApiResult, PaginatedResult } from '@/types/api';
import type { ProjetoMovelPlanejado, StatusProjeto } from '../types/projeto';

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

  async atualizarStatus(id: string, status: StatusProjeto): Promise<ApiResult<ProjetoMovelPlanejado>> {
    const response = await apiClient.put<ApiResult<ProjetoMovelPlanejado>>(
      `/furniture/projetos/${id}`,
      { status },
    );
    return response.data;
  },

  async criar(projeto: Partial<ProjetoMovelPlanejado>): Promise<ApiResult<ProjetoMovelPlanejado>> {
    const response = await apiClient.post<ApiResult<ProjetoMovelPlanejado>>(
      '/furniture/projetos',
      projeto,
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
