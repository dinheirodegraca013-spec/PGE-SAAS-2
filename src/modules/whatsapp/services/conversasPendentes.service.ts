import { apiClient } from '@/services/api/client';
import type { ApiResult } from '@/types/api';
import type {
  AprovarConversaInput,
  AprovarConversaResultado,
  ConversaPendente,
} from '../types/conversaPendente';

export const conversasPendentesService = {
  async listar(status: string = 'Pendente'): Promise<ApiResult<ConversaPendente[]>> {
    const response = await apiClient.get<ApiResult<ConversaPendente[]>>('/whatsapp/conversas-pendentes', {
      params: { status },
    });
    return response.data;
  },

  async aprovar(id: string, input: AprovarConversaInput): Promise<ApiResult<AprovarConversaResultado>> {
    const response = await apiClient.post<ApiResult<AprovarConversaResultado>>(
      `/whatsapp/conversas-pendentes/${id}/aprovar`,
      input,
    );
    return response.data;
  },

  async ignorar(id: string): Promise<ApiResult<void>> {
    const response = await apiClient.post<ApiResult<void>>(`/whatsapp/conversas-pendentes/${id}/ignorar`);
    return response.data;
  },
};
