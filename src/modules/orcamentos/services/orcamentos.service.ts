import { supabaseAnonKey, supabaseUrl, isSupabaseConfigured } from '@/lib/supabase';
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

async function publicQuoteRequest(token: string, method: 'GET' | 'POST', body?: unknown) {
  if (!isSupabaseConfigured) {
    return { ok: false, data: { error: 'Supabase não está configurado.' } };
  }

  const url = new URL(`${supabaseUrl.replace(/\/+$/, '')}/functions/v1/public-orcamento`);
  if (method === 'GET') url.searchParams.set('token', token);

  const response = await fetch(url.toString(), {
    method,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    ...(method === 'POST' ? { body: JSON.stringify({ ...(body as object || {}), token }) } : {}),
  });

  const data = await response.json().catch(() => ({ error: 'Resposta inválida do serviço de orçamento.' }));
  return { ok: response.ok, data };
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

  /** Consulta pública limitada aos campos do orçamento via Edge Function e token aleatório. */
  async obterPublicoPorToken(token: string): Promise<ApiResult<Orcamento>> {
    try {
      const response = await publicQuoteRequest(token, 'GET');
      if (!response.ok || !response.data?.quote) {
        return { succeeded: false, errors: [response.data?.error || 'Orçamento não encontrado, expirado ou indisponível.'] };
      }
      return { succeeded: true, value: mapPublicOrcamento(response.data.quote), errors: [] };
    } catch {
      return { succeeded: false, errors: ['Não foi possível conectar ao serviço de orçamento.'] };
    }
  },

  /** Registra aceite público somente para o token específico do orçamento. */
  async assinarPublico(token: string, input: AssinarOrcamentoInput): Promise<ApiResult<void>> {
    try {
      const response = await publicQuoteRequest(token, 'POST', { nome: input.nome.trim() });
      if (!response.ok) {
        return { succeeded: false, errors: [response.data?.error || 'Não foi possível registrar o aceite.'] };
      }
      return { succeeded: true, errors: [] };
    } catch {
      return { succeeded: false, errors: ['Não foi possível conectar ao serviço de orçamento.'] };
    }
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
