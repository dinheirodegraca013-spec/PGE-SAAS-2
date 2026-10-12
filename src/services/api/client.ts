import {
  INITIAL_CLIENTES,
  INITIAL_PROJETOS,
  INITIAL_SERVICOS,
  INITIAL_ORCAMENTOS,
  INITIAL_CONVERSAS_PENDENTES,
  INITIAL_WHATSAPP_CONFIG,
  INITIAL_USER,
} from './mockData';
import { ApiResult, PaginatedResult } from '@/types/api';
import { Cliente } from '@/modules/clientes/types/cliente';
import { ProjetoMovelPlanejado, StatusProjeto } from '@/modules/furniture/types/projeto';
import { Servico, StatusServico } from '@/modules/servicos/types/servico';
import { Orcamento } from '@/modules/orcamentos/types/orcamento';
import { ConversaPendente } from '@/modules/whatsapp/types/conversaPendente';
import { WhatsAppConfiguracao } from '@/modules/whatsapp/types/whatsappConfig';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const STORAGE_KEYS = {
  CLIENTES: 'erp-saas:clientes',
  PROJETOS: 'erp-saas:projetos',
  SERVICOS: 'erp-saas:servicos',
  ORCAMENTOS: 'erp-saas:orcamentos',
  CONVERSAS: 'erp-saas:conversas',
  WHATSAPP_CONFIG: 'erp-saas:whatsapp_config',
  AUTH: 'erp-saas:auth',
};

// Helper para obter o ID da organização do usuário atual
export function getCurrentOrganizationId(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.usuario?.tenantId) return parsed.usuario.tenantId;
    }
  } catch {
    // Ignore
  }
  return 'org_principal';
}

// Local storage helpers para fallback
function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Falha ao salvar no localStorage:', e);
  }
}

export function initializeLocalStorageIfEmpty() {
  if (!localStorage.getItem(STORAGE_KEYS.CLIENTES)) {
    setStored(STORAGE_KEYS.CLIENTES, INITIAL_CLIENTES);
  }
  if (!localStorage.getItem(STORAGE_KEYS.PROJETOS)) {
    setStored(STORAGE_KEYS.PROJETOS, INITIAL_PROJETOS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.SERVICOS)) {
    setStored(STORAGE_KEYS.SERVICOS, INITIAL_SERVICOS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.ORCAMENTOS)) {
    setStored(STORAGE_KEYS.ORCAMENTOS, INITIAL_ORCAMENTOS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CONVERSAS)) {
    setStored(STORAGE_KEYS.CONVERSAS, INITIAL_CONVERSAS_PENDENTES);
  }
  if (!localStorage.getItem(STORAGE_KEYS.WHATSAPP_CONFIG)) {
    setStored(STORAGE_KEYS.WHATSAPP_CONFIG, INITIAL_WHATSAPP_CONFIG);
  }
  if (!localStorage.getItem(STORAGE_KEYS.AUTH) && !isSupabaseConfigured) {
    setStored(STORAGE_KEYS.AUTH, {
      accessToken: 'demo-jwt-token-access',
      refreshToken: 'demo-refresh-token',
      usuario: INITIAL_USER,
    });
  }
}

// Local mock database methods
export const localDb = {
  getClientes: (): Cliente[] => getStored<Cliente[]>(STORAGE_KEYS.CLIENTES, INITIAL_CLIENTES),
  addCliente: (input: { nome: string; cpfCnpj?: string; email?: string; telefoneWhatsApp?: string; observacoes?: string; origem?: string }): Cliente => {
    const items = getStored<Cliente[]>(STORAGE_KEYS.CLIENTES, INITIAL_CLIENTES);
    const novo: Cliente = {
      id: `cli-${Date.now()}`,
      nome: input.nome,
      cpfCnpj: input.cpfCnpj,
      email: input.email,
      telefoneWhatsApp: input.telefoneWhatsApp,
      observacoes: input.observacoes,
      origem: input.origem || 'Manual',
      createdAtUtc: new Date().toISOString(),
    };
    items.unshift(novo);
    setStored(STORAGE_KEYS.CLIENTES, items);
    return novo;
  },
  getClienteById: (id: string): Cliente | undefined => {
    return localDb.getClientes().find((c) => c.id === id);
  },

  getProjetos: (): ProjetoMovelPlanejado[] => getStored<ProjetoMovelPlanejado[]>(STORAGE_KEYS.PROJETOS, INITIAL_PROJETOS),
  getProjetoById: (id: string): ProjetoMovelPlanejado | undefined => {
    return localDb.getProjetos().find((p) => p.id === id);
  },
  addProjeto: (projeto: ProjetoMovelPlanejado): ProjetoMovelPlanejado => {
    const items = localDb.getProjetos();
    items.unshift(projeto);
    setStored(STORAGE_KEYS.PROJETOS, items);
    return projeto;
  },
  updateProjetoStatus: (id: string, status: StatusProjeto): ProjetoMovelPlanejado | undefined => {
    const items = localDb.getProjetos();
    const item = items.find((p) => p.id === id);
    if (item) {
      item.status = status;
      setStored(STORAGE_KEYS.PROJETOS, items);
    }
    return item;
  },

  getServicos: (): Servico[] => getStored<Servico[]>(STORAGE_KEYS.SERVICOS, INITIAL_SERVICOS),
  getServicoById: (id: string): Servico | undefined => {
    return localDb.getServicos().find((s) => s.id === id);
  },
  addServico: (servico: Servico): Servico => {
    const items = localDb.getServicos();
    items.unshift(servico);
    setStored(STORAGE_KEYS.SERVICOS, items);
    return servico;
  },
  updateServico: (id: string, updates: { titulo?: string; escopo?: string; status?: StatusServico | string }): Servico | undefined => {
    const items = localDb.getServicos();
    const item = items.find((s) => s.id === id);
    if (item) {
      if (updates.titulo !== undefined) item.titulo = updates.titulo;
      if (updates.escopo !== undefined) item.escopo = updates.escopo;
      if (updates.status !== undefined) {
        if (typeof updates.status === 'number') {
          const keys = ['EmAndamento', 'EscopoDefinido', 'OrcamentoEnviado', 'Aprovado', 'Concluido', 'Cancelado'];
          item.status = keys[updates.status] || 'EmAndamento';
        } else {
          item.status = updates.status;
        }
      }
      setStored(STORAGE_KEYS.SERVICOS, items);
    }
    return item;
  },

  getOrcamentos: (): Orcamento[] => getStored<Orcamento[]>(STORAGE_KEYS.ORCAMENTOS, INITIAL_ORCAMENTOS),
  getOrcamentosPorServico: (servicoId: string): Orcamento[] => {
    return localDb.getOrcamentos().filter((o) => o.servicoId === servicoId);
  },
  getOrcamentoById: (id: string): Orcamento | undefined => {
    return localDb.getOrcamentos().find((o) => o.id === id);
  },
  addOrcamento: (servicoId: string, itens: { descricao: string; quantidade: number; valorUnitario: number }[], observacoesGerais?: string): Orcamento => {
    const items = localDb.getOrcamentos();
    const itensCalculados = itens.map((it) => ({
      ...it,
      valorTotal: it.quantidade * it.valorUnitario,
    }));
    const valorTotal = itensCalculados.reduce((sum, it) => sum + it.valorTotal, 0);
    const novo: Orcamento = {
      id: `orc-${Date.now()}`,
      servicoId,
      itens: itensCalculados,
      valorTotal,
      dataValidade: new Date(Date.now() + 15 * 86400000).toISOString(),
      observacoesGerais,
      status: 'Pendente',
      temPdfAssinado: false,
    };
    items.unshift(novo);
    setStored(STORAGE_KEYS.ORCAMENTOS, items);
    localDb.updateServico(servicoId, { status: 'OrcamentoEnviado' });
    return novo;
  },
  assinarOrcamento: (id: string, nomeAssinante: string): boolean => {
    const items = localDb.getOrcamentos();
    const orc = items.find((o) => o.id === id);
    if (orc) {
      orc.status = 'Assinado';
      orc.temPdfAssinado = true;
      orc.assinadoPorNome = nomeAssinante;
      orc.assinadoEmUtc = new Date().toISOString();
      setStored(STORAGE_KEYS.ORCAMENTOS, items);
      localDb.updateServico(orc.servicoId, { status: 'Aprovado' });
      return true;
    }
    return false;
  },

  getConversasPendentes: (status: string = 'Pendente'): ConversaPendente[] => {
    const items = getStored<ConversaPendente[]>(STORAGE_KEYS.CONVERSAS, INITIAL_CONVERSAS_PENDENTES);
    return items.filter((c) => c.status === status);
  },
  aprovarConversa: (id: string, nome?: string): { clienteId: string; servicoId: string } | null => {
    const items = getStored<ConversaPendente[]>(STORAGE_KEYS.CONVERSAS, INITIAL_CONVERSAS_PENDENTES);
    const conversa = items.find((c) => c.id === id);
    if (!conversa) return null;

    conversa.status = 'Aprovada';
    setStored(STORAGE_KEYS.CONVERSAS, items);

    const nomeFinal = nome && nome.trim().length > 0 ? nome.trim() : `Contato WhatsApp ${conversa.telefoneOrigemE164}`;
    const cliente = localDb.addCliente({
      nome: nomeFinal,
      telefoneWhatsApp: conversa.telefoneOrigemE164,
      origem: 'WhatsApp',
      observacoes: conversa.ultimaMensagemTexto ? `Mensagem inicial: "${conversa.ultimaMensagemTexto}"` : undefined,
    });

    const servico = localDb.addServico({
      id: `srv-${Date.now()}`,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      titulo: `Atendimento via WhatsApp`,
      escopo: conversa.ultimaMensagemTexto || 'Contato iniciado via WhatsApp.',
      status: 'EmAndamento',
      origem: 'WhatsApp',
      createdAtUtc: new Date().toISOString(),
    });

    return { clienteId: cliente.id, servicoId: servico.id };
  },
  ignorarConversa: (id: string): boolean => {
    const items = getStored<ConversaPendente[]>(STORAGE_KEYS.CONVERSAS, INITIAL_CONVERSAS_PENDENTES);
    const conversa = items.find((c) => c.id === id);
    if (!conversa) return false;
    conversa.status = 'Ignorada';
    setStored(STORAGE_KEYS.CONVERSAS, items);
    return true;
  },

  getWhatsAppConfig: (): WhatsAppConfiguracao => {
    return getStored<WhatsAppConfiguracao>(STORAGE_KEYS.WHATSAPP_CONFIG, INITIAL_WHATSAPP_CONFIG);
  },
  updateWhatsAppConfig: (input: { phoneNumberId: string; accessToken: string; businessAccountId?: string; numeroOrigem?: string; webhookVerifyToken: string }): WhatsAppConfiguracao => {
    const maskedPhone = input.phoneNumberId.length > 4 ? `••••••••${input.phoneNumberId.slice(-4)}` : input.phoneNumberId;
    const maskedAccount = input.businessAccountId && input.businessAccountId.length > 4 ? `••••••••${input.businessAccountId.slice(-4)}` : input.businessAccountId;
    const config: WhatsAppConfiguracao = {
      configurado: true,
      numeroOrigem: input.numeroOrigem || '+55 11 99988-7766',
      phoneNumberIdMascarado: maskedPhone,
      businessAccountIdMascarado: maskedAccount,
      configuradoEmUtc: new Date().toISOString(),
      webhookUrl: window.location.origin + '/api/whatsapp/webhook',
    };
    setStored(STORAGE_KEYS.WHATSAPP_CONFIG, config);
    return config;
  },
};

initializeLocalStorageIfEmpty();

function createMockResponse<T>(data: T): { data: T; status: number } {
  return {
    data,
    status: 200,
  };
}

// =========================================================================
// Camada de API que conecta diretamente ao Supabase Database com RLS
// =========================================================================

export const apiClient = {
  async get<T>(url: string, _config?: any): Promise<{ data: T; status: number }> {
    const orgId = getCurrentOrganizationId();

    if (isSupabaseConfigured) {
      try {
        // 1. Clientes
        if (url === '/clientes') {
          const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false });

          if (!error && data) {
            const clientes: Cliente[] = data.map((d: any) => ({
              id: d.id,
              nome: d.nome,
              cpfCnpj: d.cpf_cnpj,
              email: d.email,
              telefoneWhatsApp: d.telefone_whatsapp,
              observacoes: d.observacoes,
              origem: d.origem,
              createdAtUtc: d.created_at,
            }));
            return createMockResponse<T>({ succeeded: true, value: clientes, errors: [] } as any);
          }
        }

        if (url.startsWith('/clientes/')) {
          const id = url.replace('/clientes/', '');
          const { data, error } = await supabase
            .from('clientes')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (!error && data) {
            const cliente: Cliente = {
              id: data.id,
              nome: data.nome,
              cpfCnpj: data.cpf_cnpj,
              email: data.email,
              telefoneWhatsApp: data.telefone_whatsapp,
              observacoes: data.observacoes,
              origem: data.origem,
              createdAtUtc: data.created_at,
            };
            return createMockResponse<T>({ succeeded: true, value: cliente, errors: [] } as any);
          }
        }

        // 2. Projetos Móveis Planejados
        if (url === '/furniture/projetos') {
          const { data, error } = await supabase
            .from('projetos')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false });

          if (!error && data) {
            const items: ProjetoMovelPlanejado[] = data.map((d: any) => ({
              id: d.id,
              clienteId: d.cliente_id,
              titulo: d.titulo,
              status: d.status,
              dataMedicaoAgendada: d.data_medicao_agendada,
              dataPrevistaEntrega: d.data_prevista_entrega,
              valorTotalOrcamento: Number(d.valor_total_orcamento) || 0,
              observacoes: d.observacoes,
              ambientes: Array.isArray(d.ambientes) ? d.ambientes : [],
            }));
            const paginated: PaginatedResult<ProjetoMovelPlanejado> = {
              items,
              totalCount: items.length,
              pageNumber: 1,
              pageSize: 50,
            };
            return createMockResponse<T>({ succeeded: true, value: paginated, errors: [] } as any);
          }
        }

        if (url.startsWith('/furniture/projetos/')) {
          const id = url.replace('/furniture/projetos/', '');
          const { data, error } = await supabase
            .from('projetos')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (!error && data) {
            const projeto: ProjetoMovelPlanejado = {
              id: data.id,
              clienteId: data.cliente_id,
              titulo: data.titulo,
              status: data.status,
              dataMedicaoAgendada: data.data_medicao_agendada,
              dataPrevistaEntrega: data.data_prevista_entrega,
              valorTotalOrcamento: Number(data.valor_total_orcamento) || 0,
              observacoes: data.observacoes,
              ambientes: Array.isArray(data.ambientes) ? data.ambientes : [],
            };
            return createMockResponse<T>({ succeeded: true, value: projeto, errors: [] } as any);
          }
        }

        // 3. Serviços
        if (url === '/servicos') {
          const { data, error } = await supabase
            .from('servicos')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false });

          if (!error && data) {
            const servicos: Servico[] = data.map((d: any) => ({
              id: d.id,
              clienteId: d.cliente_id,
              clienteNome: d.cliente_nome,
              titulo: d.titulo,
              escopo: d.escopo,
              status: d.status,
              origem: d.origem,
              usuarioResponsavelId: d.usuario_responsavel_id,
              createdAtUtc: d.created_at,
            }));
            return createMockResponse<T>({ succeeded: true, value: servicos, errors: [] } as any);
          }
        }

        if (url.startsWith('/servicos/') && url.endsWith('/orcamentos')) {
          const servicoId = url.replace('/servicos/', '').replace('/orcamentos', '');
          const { data, error } = await supabase
            .from('orcamentos')
            .select('*')
            .eq('servico_id', servicoId)
            .order('created_at', { ascending: false });

          if (!error && data) {
            const orcamentos: Orcamento[] = data.map((d: any) => ({
              id: d.id,
              servicoId: d.servico_id,
              itens: Array.isArray(d.itens) ? d.itens : [],
              valorTotal: Number(d.valor_total) || 0,
              dataValidade: d.data_validade,
              observacoesGerais: d.observacoes_gerais,
              status: d.status,
              temPdfAssinado: Boolean(d.tem_pdf_assinado),
              assinadoPorNome: d.assinado_por_nome,
              assinadoEmUtc: d.assinado_em,
            }));
            return createMockResponse<T>({ succeeded: true, value: orcamentos, errors: [] } as any);
          }
        }

        if (url.startsWith('/servicos/')) {
          const id = url.replace('/servicos/', '');
          const { data, error } = await supabase
            .from('servicos')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (!error && data) {
            const servico: Servico = {
              id: data.id,
              clienteId: data.cliente_id,
              clienteNome: data.cliente_nome,
              titulo: data.titulo,
              escopo: data.escopo,
              status: data.status,
              origem: data.origem,
              usuarioResponsavelId: data.usuario_responsavel_id,
              createdAtUtc: data.created_at,
            };
            return createMockResponse<T>({ succeeded: true, value: servico, errors: [] } as any);
          }
        }

        // 4. Orçamento específico (Pode ser aberto publicamente via link)
        if (url.startsWith('/orcamentos/')) {
          const id = url.replace('/orcamentos/', '');
          const { data, error } = await supabase
            .from('orcamentos')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (!error && data) {
            const orcamento: Orcamento = {
              id: data.id,
              servicoId: data.servico_id,
              itens: Array.isArray(data.itens) ? data.itens : [],
              valorTotal: Number(data.valor_total) || 0,
              dataValidade: data.data_validade,
              observacoesGerais: data.observacoes_gerais,
              status: data.status,
              temPdfAssinado: Boolean(data.tem_pdf_assinado),
              assinadoPorNome: data.assinado_por_nome,
              assinadoEmUtc: data.assinado_em,
            };
            return createMockResponse<T>({ succeeded: true, value: orcamento, errors: [] } as any);
          }
        }

        // 5. WhatsApp
        if (url.startsWith('/whatsapp/conversas-pendentes')) {
          const { data, error } = await supabase
            .from('whatsapp_conversas')
            .select('*')
            .eq('organization_id', orgId)
            .eq('status', 'Pendente')
            .order('ultima_mensagem_em', { ascending: false });

          if (!error && data) {
            const conversas: ConversaPendente[] = data.map((d: any) => ({
              id: d.id,
              telefoneOrigemE164: d.telefone_origem_e164,
              ultimaMensagemTexto: d.ultima_mensagem_texto,
              primeiraMensagemEmUtc: d.primeira_mensagem_em,
              ultimaMensagemEmUtc: d.ultima_mensagem_em,
              quantidadeMensagens: d.quantidade_mensagens,
              status: d.status,
            }));
            return createMockResponse<T>({ succeeded: true, value: conversas, errors: [] } as any);
          }
        }

        if (url === '/whatsapp/configuracao') {
          const { data, error } = await supabase
            .from('whatsapp_config')
            .select('*')
            .eq('organization_id', orgId)
            .maybeSingle();

          if (!error && data) {
            const maskedPhone = data.phone_number_id?.length > 4 ? `••••••••${data.phone_number_id.slice(-4)}` : data.phone_number_id;
            const config: WhatsAppConfiguracao = {
              configurado: Boolean(data.configurado),
              numeroOrigem: data.numero_origem,
              phoneNumberIdMascarado: maskedPhone,
              businessAccountIdMascarado: data.business_account_id ? `••••••••${data.business_account_id.slice(-4)}` : undefined,
              configuradoEmUtc: data.updated_at,
              webhookUrl: window.location.origin + '/api/whatsapp/webhook',
            };
            return createMockResponse<T>({ succeeded: true, value: config, errors: [] } as any);
          }
        }
      } catch (err) {
        console.warn('Fallback para armazenamento local:', err);
      }
    }

    // Fallback Mock Local
    return handleMockGet<T>(url);
  },

  async post<T>(url: string, data?: any, _config?: any): Promise<{ data: T; status: number }> {
    const orgId = getCurrentOrganizationId();

    if (isSupabaseConfigured) {
      try {
        // Criar Cliente no Supabase
        if (url === '/clientes') {
          const { data: inserted, error } = await supabase
            .from('clientes')
            .insert({
              organization_id: orgId,
              nome: data.nome,
              cpf_cnpj: data.cpfCnpj || null,
              email: data.email || null,
              telefone_whatsapp: data.telefoneWhatsApp || null,
              observacoes: data.observacoes || null,
              origem: data.origem || 'Manual',
            })
            .select()
            .single();

          if (!error && inserted) {
            const cliente: Cliente = {
              id: inserted.id,
              nome: inserted.nome,
              cpfCnpj: inserted.cpf_cnpj,
              email: inserted.email,
              telefoneWhatsApp: inserted.telefone_whatsapp,
              observacoes: inserted.observacoes,
              origem: inserted.origem,
              createdAtUtc: inserted.created_at,
            };
            // Espelha no localDb
            localDb.addCliente(data);
            return createMockResponse<T>({ succeeded: true, value: cliente, errors: [] } as any);
          }
        }

        // Criar Orçamento no Supabase
        if (url.startsWith('/servicos/') && url.endsWith('/orcamentos')) {
          const servicoId = url.replace('/servicos/', '').replace('/orcamentos', '');
          const itensCalculados = (data.itens || []).map((it: any) => ({
            ...it,
            valorTotal: Number(it.quantidade) * Number(it.valorUnitario),
          }));
          const valorTotal = itensCalculados.reduce((s: number, i: any) => s + i.valorTotal, 0);

          const { data: inserted, error } = await supabase
            .from('orcamentos')
            .insert({
              organization_id: orgId,
              servico_id: servicoId,
              itens: itensCalculados,
              valor_total: valorTotal,
              data_validade: data.dataValidade || new Date(Date.now() + 15 * 86400000).toISOString(),
              observacoes_gerais: data.observacoesGerais || null,
              status: 'Pendente',
              tem_pdf_assinado: false,
            })
            .select()
            .single();

          if (!error && inserted) {
            // Atualiza status do serviço correspondente
            await supabase
              .from('servicos')
              .update({ status: 'OrcamentoEnviado' })
              .eq('id', servicoId);

            const orcamento: Orcamento = {
              id: inserted.id,
              servicoId: inserted.servico_id,
              itens: inserted.itens,
              valorTotal: Number(inserted.valor_total),
              dataValidade: inserted.data_validade,
              observacoesGerais: inserted.observacoes_gerais,
              status: inserted.status,
              temPdfAssinado: inserted.tem_pdf_assinado,
            };
            return createMockResponse<T>({ succeeded: true, value: orcamento, errors: [] } as any);
          }
        }

        // Assinar Orçamento (Público) no Supabase
        if (url.startsWith('/orcamentos/') && url.endsWith('/assinar')) {
          const id = url.replace('/orcamentos/', '').replace('/assinar', '');
          const { data: updated, error } = await supabase
            .from('orcamentos')
            .update({
              status: 'Assinado',
              tem_pdf_assinado: true,
              assinado_por_nome: data.nome,
              assinado_em: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

          if (!error && updated) {
            // Avança status do serviço para Aprovado
            if (updated.servico_id) {
              await supabase
                .from('servicos')
                .update({ status: 'Aprovado' })
                .eq('id', updated.servico_id);
            }
            localDb.assinarOrcamento(id, data.nome);
            return createMockResponse<T>({ succeeded: true, errors: [] } as any);
          }
        }

        // Aprovar Conversa do WhatsApp no Supabase
        if (url.startsWith('/whatsapp/conversas-pendentes/') && url.endsWith('/aprovar')) {
          const id = url.replace('/whatsapp/conversas-pendentes/', '').replace('/aprovar', '');
          const { data: conv } = await supabase
            .from('whatsapp_conversas')
            .select('*')
            .eq('id', id)
            .single();

          if (conv) {
            await supabase
              .from('whatsapp_conversas')
              .update({ status: 'Aprovada' })
              .eq('id', id);

            const nomeFinal = data?.nome?.trim() || `Contato WhatsApp ${conv.telefone_origem_e164}`;
            const { data: novoCli } = await supabase
              .from('clientes')
              .insert({
                organization_id: orgId,
                nome: nomeFinal,
                telefone_whatsapp: conv.telefone_origem_e164,
                origem: 'WhatsApp',
                observacoes: conv.ultima_mensagem_texto ? `Mensagem: "${conv.ultima_mensagem_texto}"` : null,
              })
              .select()
              .single();

            const { data: novoSrv } = await supabase
              .from('servicos')
              .insert({
                organization_id: orgId,
                cliente_id: novoCli?.id || null,
                cliente_nome: nomeFinal,
                titulo: 'Atendimento via WhatsApp',
                escopo: conv.ultima_mensagem_texto || 'Contato iniciado via WhatsApp.',
                status: 'EmAndamento',
                origem: 'WhatsApp',
              })
              .select()
              .single();

            localDb.aprovarConversa(id, data?.nome);
            return createMockResponse<T>({
              succeeded: true,
              value: { clienteId: novoCli?.id || '', servicoId: novoSrv?.id || '' },
              errors: [],
            } as any);
          }
        }

        // Ignorar Conversa
        if (url.startsWith('/whatsapp/conversas-pendentes/') && url.endsWith('/ignorar')) {
          const id = url.replace('/whatsapp/conversas-pendentes/', '').replace('/ignorar', '');
          await supabase
            .from('whatsapp_conversas')
            .update({ status: 'Ignorada' })
            .eq('id', id);
          localDb.ignorarConversa(id);
          return createMockResponse<T>({ succeeded: true, errors: [] } as any);
        }
      } catch (err) {
        console.warn('Fallback POST para mock local:', err);
      }
    }

    return handleMockPost<T>(url, data);
  },

  async put<T>(url: string, data?: any, _config?: any): Promise<{ data: T; status: number }> {
    const orgId = getCurrentOrganizationId();

    if (isSupabaseConfigured) {
      try {
        // Atualizar Serviço no Supabase
        if (url.startsWith('/servicos/')) {
          const id = url.replace('/servicos/', '');
          const updates: any = {};
          if (data.titulo !== undefined) updates.titulo = data.titulo;
          if (data.escopo !== undefined) updates.escopo = data.escopo;
          if (data.status !== undefined) {
            const keys = ['EmAndamento', 'EscopoDefinido', 'OrcamentoEnviado', 'Aprovado', 'Concluido', 'Cancelado'];
            updates.status = typeof data.status === 'number' ? keys[data.status] || 'EmAndamento' : data.status;
          }

          const { data: updated, error } = await supabase
            .from('servicos')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

          if (!error && updated) {
            const servico: Servico = {
              id: updated.id,
              clienteId: updated.cliente_id,
              clienteNome: updated.cliente_nome,
              titulo: updated.titulo,
              escopo: updated.escopo,
              status: updated.status,
              origem: updated.origem,
              usuarioResponsavelId: updated.usuario_responsavel_id,
              createdAtUtc: updated.created_at,
            };
            localDb.updateServico(id, data);
            return createMockResponse<T>({ succeeded: true, value: servico, errors: [] } as any);
          }
        }

        // Salvar Configuração WhatsApp no Supabase
        if (url === '/whatsapp/configuracao') {
          const { data: upserted, error } = await supabase
            .from('whatsapp_config')
            .upsert(
              {
                organization_id: orgId,
                phone_number_id: data.phoneNumberId,
                access_token: data.accessToken,
                business_account_id: data.businessAccountId || null,
                numero_origem: data.numeroOrigem || null,
                webhook_verify_token: data.webhookVerifyToken,
                configurado: true,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'organization_id' },
            )
            .select()
            .single();

          if (!error && upserted) {
            localDb.updateWhatsAppConfig(data);
            const maskedPhone = upserted.phone_number_id?.length > 4 ? `••••••••${upserted.phone_number_id.slice(-4)}` : upserted.phone_number_id;
            const config: WhatsAppConfiguracao = {
              configurado: true,
              numeroOrigem: upserted.numero_origem,
              phoneNumberIdMascarado: maskedPhone,
              businessAccountIdMascarado: upserted.business_account_id ? `••••••••${upserted.business_account_id.slice(-4)}` : undefined,
              configuradoEmUtc: upserted.updated_at,
              webhookUrl: window.location.origin + '/api/whatsapp/webhook',
            };
            return createMockResponse<T>({ succeeded: true, value: config, errors: [] } as any);
          }
        }
      } catch (err) {
        console.warn('Fallback PUT para mock local:', err);
      }
    }

    return handleMockPut<T>(url, data);
  },
};

// Handlers locais de mock
function handleMockGet<T>(url: string): { data: T; status: number } {
  if (url === '/clientes') {
    const clientes = localDb.getClientes();
    return createMockResponse<T>({ succeeded: true, value: clientes, errors: [] } as any);
  }
  if (url.startsWith('/clientes/')) {
    const id = url.replace('/clientes/', '');
    const cliente = localDb.getClienteById(id);
    return createMockResponse<T>({ succeeded: !!cliente, value: cliente, errors: cliente ? [] : ['Cliente não encontrado'] } as any);
  }
  if (url === '/furniture/projetos') {
    const items = localDb.getProjetos();
    const result: PaginatedResult<ProjetoMovelPlanejado> = {
      items,
      totalCount: items.length,
      pageNumber: 1,
      pageSize: 20,
    };
    return createMockResponse<T>({ succeeded: true, value: result, errors: [] } as any);
  }
  if (url.startsWith('/furniture/projetos/')) {
    const id = url.replace('/furniture/projetos/', '');
    const projeto = localDb.getProjetoById(id);
    return createMockResponse<T>({ succeeded: !!projeto, value: projeto, errors: projeto ? [] : ['Projeto não encontrado'] } as any);
  }
  if (url === '/servicos') {
    const servicos = localDb.getServicos();
    return createMockResponse<T>({ succeeded: true, value: servicos, errors: [] } as any);
  }
  if (url.startsWith('/servicos/') && url.endsWith('/orcamentos')) {
    const servicoId = url.replace('/servicos/', '').replace('/orcamentos', '');
    const orcamentos = localDb.getOrcamentosPorServico(servicoId);
    return createMockResponse<T>({ succeeded: true, value: orcamentos, errors: [] } as any);
  }
  if (url.startsWith('/servicos/')) {
    const id = url.replace('/servicos/', '');
    const servico = localDb.getServicoById(id);
    return createMockResponse<T>({ succeeded: !!servico, value: servico, errors: servico ? [] : ['Serviço não encontrado'] } as any);
  }
  if (url.startsWith('/orcamentos/')) {
    const id = url.replace('/orcamentos/', '');
    const orcamento = localDb.getOrcamentoById(id);
    return createMockResponse<T>({ succeeded: !!orcamento, value: orcamento, errors: orcamento ? [] : ['Orçamento não encontrado'] } as any);
  }
  if (url.startsWith('/whatsapp/conversas-pendentes')) {
    const conversas = localDb.getConversasPendentes();
    return createMockResponse<T>({ succeeded: true, value: conversas, errors: [] } as any);
  }
  if (url === '/whatsapp/configuracao') {
    const config = localDb.getWhatsAppConfig();
    return createMockResponse<T>({ succeeded: true, value: config, errors: [] } as any);
  }
  return createMockResponse<T>({ succeeded: true, value: null, errors: [] } as any);
}

function handleMockPost<T>(url: string, data?: any): { data: T; status: number } {
  if (url === '/auth/login') {
    const email = data?.email || 'admin@exemplo.com';
    const user: any = {
      accessToken: 'jwt-access-token-' + Date.now(),
      refreshToken: 'jwt-refresh-token-' + Date.now(),
      expiraEmUtc: new Date(Date.now() + 86400000).toISOString(),
      usuario: {
        usuarioId: 'usr-' + Date.now(),
        tenantId: 'tnt-01',
        nomeCompleto: email.split('@')[0].toUpperCase(),
        email: email,
        papel: 'AdministradorTenant',
        plano: 'Standard',
      },
    };
    return createMockResponse<T>({ succeeded: true, value: user, errors: [] } as any);
  }
  if (url === '/auth/register') {
    const user: any = {
      accessToken: 'jwt-access-token-' + Date.now(),
      refreshToken: 'jwt-refresh-token-' + Date.now(),
      expiraEmUtc: new Date(Date.now() + 86400000).toISOString(),
      usuario: {
        usuarioId: 'usr-' + Date.now(),
        tenantId: 'tnt-' + Date.now(),
        nomeCompleto: data?.nomeCompleto || 'Administrador',
        email: data?.email,
        papel: 'AdministradorTenant',
        plano: data?.plano === 2 ? 'Empresarial' : data?.plano === 1 ? 'Standard' : 'Free',
      },
    };
    return createMockResponse<T>({ succeeded: true, value: user, errors: [] } as any);
  }
  if (url === '/clientes') {
    const cliente = localDb.addCliente(data);
    return createMockResponse<T>({ succeeded: true, value: cliente, errors: [] } as any);
  }
  if (url.startsWith('/servicos/') && url.endsWith('/orcamentos')) {
    const servicoId = url.replace('/servicos/', '').replace('/orcamentos', '');
    const orcamento = localDb.addOrcamento(servicoId, data.itens, data.observacoesGerais);
    return createMockResponse<T>({ succeeded: true, value: orcamento, errors: [] } as any);
  }
  if (url.startsWith('/orcamentos/') && url.endsWith('/assinar')) {
    const id = url.replace('/orcamentos/', '').replace('/assinar', '');
    const success = localDb.assinarOrcamento(id, data?.nome || 'Cliente');
    return createMockResponse<T>({ succeeded: success, errors: success ? [] : ['Erro ao assinar'] } as any);
  }
  if (url.startsWith('/whatsapp/conversas-pendentes/') && url.endsWith('/aprovar')) {
    const id = url.replace('/whatsapp/conversas-pendentes/', '').replace('/aprovar', '');
    const res = localDb.aprovarConversa(id, data?.nome);
    return createMockResponse<T>({ succeeded: !!res, value: res, errors: res ? [] : ['Erro ao aprovar conversa'] } as any);
  }
  if (url.startsWith('/whatsapp/conversas-pendentes/') && url.endsWith('/ignorar')) {
    const id = url.replace('/whatsapp/conversas-pendentes/', '').replace('/ignorar', '');
    const res = localDb.ignorarConversa(id);
    return createMockResponse<T>({ succeeded: res, errors: res ? [] : ['Erro ao ignorar'] } as any);
  }
  return createMockResponse<T>({ succeeded: true, errors: [] } as any);
}

function handleMockPut<T>(url: string, data?: any): { data: T; status: number } {
  if (url.startsWith('/servicos/')) {
    const id = url.replace('/servicos/', '');
    const updated = localDb.updateServico(id, data);
    return createMockResponse<T>({ succeeded: !!updated, value: updated, errors: updated ? [] : ['Serviço não encontrado'] } as any);
  }
  if (url === '/whatsapp/configuracao') {
    const config = localDb.updateWhatsAppConfig(data);
    return createMockResponse<T>({ succeeded: true, value: config, errors: [] } as any);
  }
  return createMockResponse<T>({ succeeded: true, errors: [] } as any);
}
