import { apiClient } from '@/services/api/client';
import type { ApiResult } from '@/types/api';
import type { WhatsAppConfiguracao, WhatsAppConfiguracaoInput } from '../types/whatsappConfig';

export const whatsappConfigService = {
  async obter(): Promise<ApiResult<WhatsAppConfiguracao>> {
    const response = await apiClient.get<ApiResult<WhatsAppConfiguracao>>('/whatsapp/configuracao');
    return response.data;
  },

  async atualizar(input: WhatsAppConfiguracaoInput): Promise<ApiResult<WhatsAppConfiguracao>> {
    const response = await apiClient.put<ApiResult<WhatsAppConfiguracao>>('/whatsapp/configuracao', input);
    return response.data;
  },
};
