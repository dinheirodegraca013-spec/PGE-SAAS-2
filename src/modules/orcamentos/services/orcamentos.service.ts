import { supabase } from '@/lib/supabase';
import { apiClient } from '@/services/api/client';
import type { ApiResult } from '@/types/api';
import type { AssinarOrcamentoInput, CriarOrcamentoInput, Orcamento } from '../types/orcamento';

function mapPublicOrcamento(data: any): Orcamento {
  return {
    id: String(data.id),
    publicToken: undefined,
    servicoId: data.servico_id ? String(data.servico_id) : '',
    itens: Array.isArray(data.itens) ? data.itens : [],
    valorTotal: Number(data.valor_total) || 0,
    dataValidade: data.data_validade || undefined,
    observacoesGerais: data.observacoes_gerais || undefined,
    status: data.status || 'Pendente',
    temPdfAssinado: Boolean(data.tem_pdf_assinado),
    assinadoPorNome: data.assinado_por_nome || undefined,
    assinadoEmUtc: data.assinado_em || undefined,
  };
}

export const orcamentosService = {
  async criar(servicoId: string, input: CriarOrcamentoInput): Promise<ApiResult<Orcamento>> {
    const response = await apiClient.post<ApiResult<Orcamento>>(`/servicos/${servicoId}/orcamentos`, input);
    return response.data;
  },

  async listarPorServico(servicoId: string): Promise<ApiResult<Orcamento[]>> {
    const response = await apiClient.get<ApiResult<Orcamento[]>>(`/servicos/${servicoId}/orcamentos`);
    return response.data;
  },

  /** Consulta interna; protegida pela sessão e pelas políticas RLS do tenant. */
  async obterPorId(id: string): Promise<ApiResult<Orcamento>> {
    const response = await apiClient.get<ApiResult<Orcamento>>(`/orcamentos/${id}`);
    return response.data;
  },

  /** Consulta pública limitada aos campos do orçamento usando token aleatório. */
  async obterPublicoPorToken(token: string): Promise<ApiResult<Orcamento>> {
    const { data, error } = await supabase.rpc('get_public_orcamento', { p_token: token });
    if (error || !data) {
      return { succeeded: false, errors: [error?.message || 'Orçamento não encontrado, expirado ou indisponível.'] };
    }
    return { succeeded: true, value: mapPublicOrcamento(data), errors: [] };
  },

  /** Registra aceite público somente para o token específico do orçamento. */
  async assinarPublico(token: string, input: AssinarOrcamentoInput): Promise<ApiResult<void>> {
    const { error } = await supabase.rpc('assinar_orcamento_publico', {
      p_token: token,
      p_nome: input.nome.trim(),
    });
    if (error) {
      return { succeeded: false, errors: [error.message || 'Não foi possível registrar o aceite.'] };
    }
    return { succeeded: true, errors: [] };
  },

  /** URL pública que deve ser compartilhada com o cliente; nunca usar o ID interno. */
  urlPublica(token: string): string {
    return `${window.location.origin}/orcamento/${encodeURIComponent(token)}`;
  },

  /** Monta URL de PDF */
  urlPdf(id: string, assinado: boolean): string {
    const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';
    return `${baseUrl}/orcamentos/${id}/pdf?assinado=${assinado}`;
  },
};
