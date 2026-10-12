import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
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

const STORAGE_KEYS = {
  CLIENTES: 'erp-saas:clientes',
  PROJETOS: 'erp-saas:projetos',
  SERVICOS: 'erp-saas:servicos',
  ORCAMENTOS: 'erp-saas:orcamentos',
  CONVERSAS: 'erp-saas:conversas',
  WHATSAPP_CONFIG: 'erp-saas:whatsapp_config',
  AUTH: 'erp-saas:auth',
};

// Local storage helpers
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
    console.error('Failed to save to localStorage:', e);
  }
}

// Initialize mock database in browser localStorage
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
  if (!localStorage.getItem(STORAGE_KEYS.AUTH)) {
    setStored(STORAGE_KEYS.AUTH, {
      accessToken: 'demo-jwt-token-access',
      refreshToken: 'demo-refresh-token',
      usuario: INITIAL_USER,
    });
  }
}

// Local mock database methods
export const localDb = {
  // Clientes
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

  // Projetos
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

  // Serviços
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

  // Orçamentos
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

    // Atualiza status do serviço correspondente
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

      // Atualiza status do serviço
      localDb.updateServico(orc.servicoId, { status: 'Aprovado' });
      return true;
    }
    return false;
  },

  // WhatsApp Conversas Pendentes
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

    // Cria cliente
    const nomeFinal = nome && nome.trim().length > 0 ? nome.trim() : `Contato WhatsApp ${conversa.telefoneOrigemE164}`;
    const cliente = localDb.addCliente({
      nome: nomeFinal,
      telefoneWhatsApp: conversa.telefoneOrigemE164,
      origem: 'WhatsApp',
      observacoes: conversa.ultimaMensagemTexto ? `Mensagem inicial: "${conversa.ultimaMensagemTexto}"` : undefined,
    });

    // Abre serviço correspondente
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

  // WhatsApp Configuração
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

// Initialize right away
initializeLocalStorageIfEmpty();

/**
 * Instância central do Axios com proxy para backend real ou armazenamento inteligente offline.
 */
const rawAxios = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 3000,
});

// Interceptor para injetar Bearer token
rawAxios.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.accessToken) {
        config.headers.Authorization = `Bearer ${parsed.accessToken}`;
      }
    }
  } catch {
    // Ignore
  }
  return config;
});

/**
 * apiClient que faz chamadas à API real e transparentemente atende do localDb caso
 * a API C# não esteja em execução (conforme documentado no repositório original do GitHub).
 */
export const apiClient = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    try {
      if (import.meta.env.VITE_API_BASE_URL) {
        return await rawAxios.get<T>(url, config);
      }
    } catch {
      // Fallback para mock local
    }

    // Mock local handling
    return handleMockGet<T>(url, config);
  },

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    try {
      if (import.meta.env.VITE_API_BASE_URL) {
        return await rawAxios.post<T>(url, data, config);
      }
    } catch {
      // Fallback para mock local
    }

    return handleMockPost<T>(url, data, config);
  },

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    try {
      if (import.meta.env.VITE_API_BASE_URL) {
        return await rawAxios.put<T>(url, data, config);
      }
    } catch {
      // Fallback para mock local
    }

    return handleMockPut<T>(url, data, config);
  },
};

function createMockResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: {} } as any,
  };
}

function handleMockGet<T>(url: string, config?: AxiosRequestConfig): AxiosResponse<T> {
  // Clientes
  if (url === '/clientes') {
    const clientes = localDb.getClientes();
    return createMockResponse<T>({ succeeded: true, value: clientes, errors: [] } as any);
  }
  if (url.startsWith('/clientes/')) {
    const id = url.replace('/clientes/', '');
    const cliente = localDb.getClienteById(id);
    return createMockResponse<T>({ succeeded: !!cliente, value: cliente, errors: cliente ? [] : ['Cliente não encontrado'] } as any);
  }

  // Projetos
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

  // Serviços
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

  // Orçamentos
  if (url.startsWith('/orcamentos/')) {
    const id = url.replace('/orcamentos/', '');
    const orcamento = localDb.getOrcamentoById(id);
    return createMockResponse<T>({ succeeded: !!orcamento, value: orcamento, errors: orcamento ? [] : ['Orçamento não encontrado'] } as any);
  }

  // WhatsApp
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

function handleMockPost<T>(url: string, data?: any, _config?: AxiosRequestConfig): AxiosResponse<T> {
  // Auth Login
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

  // Auth Register
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

  // Clientes
  if (url === '/clientes') {
    const cliente = localDb.addCliente(data);
    return createMockResponse<T>({ succeeded: true, value: cliente, errors: [] } as any);
  }

  // Orçamentos
  if (url.startsWith('/servicos/') && url.endsWith('/orcamentos')) {
    const servicoId = url.replace('/servicos/', '').replace('/orcamentos', '');
    const orcamento = localDb.addOrcamento(servicoId, data.itens, data.observacoesGerais);
    return createMockResponse<T>({ succeeded: true, value: orcamento, errors: [] } as any);
  }

  // Assinar orçamento
  if (url.startsWith('/orcamentos/') && url.endsWith('/assinar')) {
    const id = url.replace('/orcamentos/', '').replace('/assinar', '');
    const success = localDb.assinarOrcamento(id, data?.nome || 'Cliente');
    return createMockResponse<T>({ succeeded: success, errors: success ? [] : ['Erro ao assinar'] } as any);
  }

  // WhatsApp
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
  if (url === '/whatsapp/enviar-texto') {
    return createMockResponse<T>({ succeeded: true, errors: [] } as any);
  }
  if (url.includes('/enviar-orcamento-whatsapp')) {
    return createMockResponse<T>({ succeeded: true, errors: [] } as any);
  }

  return createMockResponse<T>({ succeeded: true, errors: [] } as any);
}

function handleMockPut<T>(url: string, data?: any, _config?: AxiosRequestConfig): AxiosResponse<T> {
  // Atualizar Serviço
  if (url.startsWith('/servicos/')) {
    const id = url.replace('/servicos/', '');
    const updated = localDb.updateServico(id, data);
    return createMockResponse<T>({ succeeded: !!updated, value: updated, errors: updated ? [] : ['Serviço não encontrado'] } as any);
  }

  // WhatsApp Configuração
  if (url === '/whatsapp/configuracao') {
    const config = localDb.updateWhatsAppConfig(data);
    return createMockResponse<T>({ succeeded: true, value: config, errors: [] } as any);
  }

  return createMockResponse<T>({ succeeded: true, errors: [] } as any);
}
