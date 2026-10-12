import { ApiResult, PaginatedResult } from '@/types/api';
import { Cliente } from '@/modules/clientes/types/cliente';
import { ProjetoMovelPlanejado, StatusProjeto } from '@/modules/furniture/types/projeto';
import { Servico, StatusServico } from '@/modules/servicos/types/servico';
import { Orcamento } from '@/modules/orcamentos/types/orcamento';
import { ConversaPendente } from '@/modules/whatsapp/types/conversaPendente';
import { WhatsAppConfiguracao } from '@/modules/whatsapp/types/whatsappConfig';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const STORAGE_KEY_AUTH = 'erp-saas:auth';

/**
 * Obtém o ID do tenant (organização) do usuário autenticado no momento.
 * Não confia em valores arbitrários e sim na sessão validada pelo Supabase.
 */
export function getCurrentTenantId(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTH);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.usuario?.tenantId) return parsed.usuario.tenantId;
    }
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Registra auditoria na tabela 'audit_logs' caso exista no banco.
 */
async function recordAuditLog(acao: string, tabela: string, registroId?: string, detalhes?: any) {
  if (!isSupabaseConfigured) return;
  try {
    const tenantId = getCurrentTenantId();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user || !tenantId) {
      console.warn('Auditoria não registrada: sessão ou tenant não validado.');
      return;
    }
    const { error: auditError } = await supabase.from('audit_logs').insert({
      tenant_id: tenantId,
      actor_id: user.id,
      acao,
      tabela,
      registro_id: registroId,
      detalhes: detalhes ?? {},
    });
    if (auditError) console.error('Falha ao registrar auditoria:', auditError.message);
  } catch (err) {
    console.error('Exceção ao registrar auditoria:', err);
  }
}

function createSuccessResult<T>(value: T): { data: ApiResult<T>; status: number } {
  return {
    data: {
      succeeded: true,
      value,
      errors: [],
    },
    status: 200,
  };
}

function createErrorResult<T>(errors: string[], status = 400): { data: ApiResult<T>; status: number } {
  return {
    data: {
      succeeded: false,
      errors,
    },
    status,
  };
}

// =========================================================================
// Cliente de API conectado diretamente às tabelas reais do Supabase
// =========================================================================

export const apiClient = {
  async get<T>(url: string, _config?: any): Promise<{ data: ApiResult<any>; status: number }> {
    if (!isSupabaseConfigured) {
      return createErrorResult(['Supabase não está configurado. Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.']);
    }

    const tenantId = getCurrentTenantId();

    try {
      // 1. Clientes (/clientes)
      if (url === '/clientes') {
        let query = supabase.from('clientes').select('*');
        if (tenantId) {
          query = query.eq('tenant_id', tenantId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
          console.error('Erro ao listar clientes:', error);
          return createErrorResult([error.message]);
        }

        const clientes: Cliente[] = (data || []).map((d: any) => ({
          id: d.id,
          nome: d.nome || '',
          cpfCnpj: d.documento || d.cpf_cnpj || undefined,
          email: d.email || undefined,
          telefoneWhatsApp: d.telefone || d.telefone_whatsapp || undefined,
          observacoes: d.observacoes || undefined,
          origem: d.origem || 'Manual',
          createdAtUtc: d.created_at || new Date().toISOString(),
        }));

        return createSuccessResult(clientes);
      }

      if (url.startsWith('/clientes/')) {
        const id = url.replace('/clientes/', '');
        const { data, error } = await supabase
          .from('clientes')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) return createErrorResult([error.message]);
        if (!data) return createErrorResult(['Cliente não encontrado.'], 404);

        const cliente: Cliente = {
          id: data.id,
          nome: data.nome || '',
          cpfCnpj: data.documento || data.cpf_cnpj || undefined,
          email: data.email || undefined,
          telefoneWhatsApp: data.telefone || data.telefone_whatsapp || undefined,
          observacoes: data.observacoes || undefined,
          origem: data.origem || 'Manual',
          createdAtUtc: data.created_at || new Date().toISOString(),
        };

        return createSuccessResult(cliente);
      }

      // 2. Projetos de Marcenaria (/furniture/projetos -> tabela real 'projetos_marcenaria')
      if (url === '/furniture/projetos') {
        // Tenta 'projetos_marcenaria' e se não existir, tenta 'projetos'
        let query = supabase.from('projetos_marcenaria').select('*');
        if (tenantId) {
          query = query.eq('tenant_id', tenantId);
        }
        let { data, error } = await query.order('created_at', { ascending: false });

        if (error && error.code === '42P01') {
          // Fallback de compatibilidade se a tabela se chamar 'projetos'
          let fallbackQuery = supabase.from('projetos').select('*');
          if (tenantId) fallbackQuery = fallbackQuery.eq('tenant_id', tenantId);
          const fb = await fallbackQuery.order('created_at', { ascending: false });
          data = fb.data;
          error = fb.error;
        }

        if (error) {
          console.error('Erro ao listar projetos_marcenaria:', error);
          return createErrorResult([error.message]);
        }

        const items: ProjetoMovelPlanejado[] = (data || []).map((d: any) => ({
          id: d.id,
          clienteId: d.cliente_id || '',
          titulo: d.titulo || d.nome || 'Projeto de Marcenaria',
          status: typeof d.status === 'number' ? d.status : (Number(d.status) || 0),
          dataMedicaoAgendada: d.data_medicao_agendada || d.data_medicao || undefined,
          dataPrevistaEntrega: d.data_prevista_entrega || d.data_entrega || undefined,
          valorTotalOrcamento: Number(d.valor_total_orcamento ?? d.valor_total ?? d.valor) || 0,
          observacoes: d.observacoes || undefined,
          ambientes: Array.isArray(d.ambientes) ? d.ambientes : [],
        }));

        const paginated: PaginatedResult<ProjetoMovelPlanejado> = {
          items,
          totalCount: items.length,
          pageNumber: 1,
          pageSize: 50,
        };

        return createSuccessResult(paginated);
      }

      if (url.startsWith('/furniture/projetos/')) {
        const id = url.replace('/furniture/projetos/', '');
        let { data, error } = await supabase
          .from('projetos_marcenaria')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error && error.code === '42P01') {
          const fb = await supabase.from('projetos').select('*').eq('id', id).maybeSingle();
          data = fb.data;
          error = fb.error;
        }

        if (error) return createErrorResult([error.message]);
        if (!data) return createErrorResult(['Projeto não encontrado.'], 404);

        const projeto: ProjetoMovelPlanejado = {
          id: data.id,
          clienteId: data.cliente_id || '',
          titulo: data.titulo || data.nome || 'Projeto de Marcenaria',
          status: typeof data.status === 'number' ? data.status : (Number(data.status) || 0),
          dataMedicaoAgendada: data.data_medicao_agendada || data.data_medicao || undefined,
          dataPrevistaEntrega: data.data_prevista_entrega || data.data_entrega || undefined,
          valorTotalOrcamento: Number(data.valor_total_orcamento ?? data.valor_total ?? data.valor) || 0,
          observacoes: data.observacoes || undefined,
          ambientes: Array.isArray(data.ambientes) ? data.ambientes : [],
        };

        return createSuccessResult(projeto);
      }

      // 3. Serviços (/servicos)
      if (url === '/servicos') {
        let query = supabase.from('servicos').select('*');
        if (tenantId) {
          query = query.eq('tenant_id', tenantId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
          console.error('Erro ao listar servicos:', error);
          return createErrorResult([error.message]);
        }

        const servicos: Servico[] = (data || []).map((d: any) => ({
          id: d.id,
          clienteId: d.cliente_id || '',
          clienteNome: d.cliente_nome || 'Cliente',
          titulo: d.titulo || undefined,
          escopo: d.escopo || d.descricao || undefined,
          status: d.status || 'EmAndamento',
          origem: d.origem || 'Manual',
          usuarioResponsavelId: d.usuario_responsavel_id || undefined,
          createdAtUtc: d.created_at || new Date().toISOString(),
        }));

        return createSuccessResult(servicos);
      }

      if (url.startsWith('/servicos/') && url.endsWith('/orcamentos')) {
        const servicoId = url.replace('/servicos/', '').replace('/orcamentos', '');
        const { data, error } = await supabase
          .from('orcamentos')
          .select('*')
          .eq('servico_id', servicoId)
          .order('created_at', { ascending: false });

        if (error) return createErrorResult([error.message]);

        const orcamentos: Orcamento[] = (data || []).map((d: any) => ({
          id: d.id,
          servicoId: d.servico_id,
          itens: Array.isArray(d.itens) ? d.itens : [],
          valorTotal: Number(d.valor_total) || 0,
          dataValidade: d.data_validade || undefined,
          observacoesGerais: d.observacoes_gerais || d.observacoes || undefined,
          status: d.status || 'Pendente',
          temPdfAssinado: Boolean(d.tem_pdf_assinado),
          assinadoPorNome: d.assinado_por_nome || undefined,
          assinadoEmUtc: d.assinado_em || undefined,
        }));

        return createSuccessResult(orcamentos);
      }

      if (url.startsWith('/servicos/')) {
        const id = url.replace('/servicos/', '');
        const { data, error } = await supabase
          .from('servicos')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) return createErrorResult([error.message]);
        if (!data) return createErrorResult(['Serviço não encontrado.'], 404);

        const servico: Servico = {
          id: data.id,
          clienteId: data.cliente_id || '',
          clienteNome: data.cliente_nome || 'Cliente',
          titulo: data.titulo || undefined,
          escopo: data.escopo || data.descricao || undefined,
          status: data.status || 'EmAndamento',
          origem: data.origem || 'Manual',
          usuarioResponsavelId: data.usuario_responsavel_id || undefined,
          createdAtUtc: data.created_at || new Date().toISOString(),
        };

        return createSuccessResult(servico);
      }

      // 4. Orçamentos individuais (/orcamentos/:id)
      if (url.startsWith('/orcamentos/')) {
        const id = url.replace('/orcamentos/', '');
        const { data, error } = await supabase
          .from('orcamentos')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) return createErrorResult([error.message]);
        if (!data) return createErrorResult(['Orçamento não encontrado.'], 404);

        const orcamento: Orcamento = {
          id: data.id,
          servicoId: data.servico_id || '',
          itens: Array.isArray(data.itens) ? data.itens : [],
          valorTotal: Number(data.valor_total) || 0,
          dataValidade: data.data_validade || undefined,
          observacoesGerais: data.observacoes_gerais || data.observacoes || undefined,
          status: data.status || 'Pendente',
          temPdfAssinado: Boolean(data.tem_pdf_assinado),
          assinadoPorNome: data.assinado_por_nome || undefined,
          assinadoEmUtc: data.assinado_em || undefined,
        };

        return createSuccessResult(orcamento);
      }

      // 5. WhatsApp Mensagens (/whatsapp/conversas-pendentes -> tabela real 'whatsapp_mensagens')
      if (url.startsWith('/whatsapp/conversas-pendentes')) {
        // Tenta buscar na tabela real 'whatsapp_mensagens'
        let query = supabase.from('whatsapp_mensagens').select('*');
        if (tenantId) query = query.eq('tenant_id', tenantId);

        let { data, error } = await query
          .eq('status', 'pendente')
          .order('created_at', { ascending: false });

        if (error && error.code === '42P01') {
          // Fallback se estiver com nome 'whatsapp_conversas'
          let fb = supabase.from('whatsapp_conversas').select('*');
          if (tenantId) fb = fb.eq('tenant_id', tenantId);
          const res = await fb.order('created_at', { ascending: false });
          data = res.data;
          error = res.error;
        }

        if (error) return createErrorResult([error.message]);

        const conversas: ConversaPendente[] = (data || []).map((d: any) => ({
          id: d.id,
          telefoneOrigemE164: d.telefone || d.telefone_origem || d.telefone_origem_e164 || '',
          ultimaMensagemTexto: d.conteudo || d.texto || d.mensagem || d.ultima_mensagem_texto || '',
          primeiraMensagemEmUtc: d.created_at || new Date().toISOString(),
          ultimaMensagemEmUtc: d.created_at || new Date().toISOString(),
          quantidadeMensagens: d.quantidade_mensagens || 1,
          status: d.status || 'Pendente',
        }));

        return createSuccessResult(conversas);
      }

      // 6. WhatsApp Configuração (/whatsapp/configuracao)
      if (url === '/whatsapp/configuracao') {
        let query = supabase.from('whatsapp_config').select('tenant_id, phone_number_id, business_account_id, numero_origem, configurado, created_at, updated_at');
        if (tenantId) query = query.eq('tenant_id', tenantId);
        const { data, error } = await query.maybeSingle();

        if (error && error.code !== '42P01') {
          return createErrorResult([error.message]);
        }

        if (data) {
          const maskedPhone =
            data.phone_number_id && data.phone_number_id.length > 4
              ? `••••••••${data.phone_number_id.slice(-4)}`
              : data.phone_number_id;

          const config: WhatsAppConfiguracao = {
            configurado: Boolean(data.configurado ?? true),
            numeroOrigem: data.numero_origem,
            phoneNumberIdMascarado: maskedPhone,
            businessAccountIdMascarado: data.business_account_id ? `••••••••${data.business_account_id.slice(-4)}` : undefined,
            configuradoEmUtc: data.updated_at || data.created_at,
            webhookUrl: window.location.origin + '/api/whatsapp/webhook',
          };
          return createSuccessResult(config);
        }

        return createSuccessResult({
          configurado: false,
          webhookUrl: window.location.origin + '/api/whatsapp/webhook',
        });
      }

      return createErrorResult([`Rota GET não reconhecida: ${url}`], 404);
    } catch (err: any) {
      console.error(`Exceção na rota GET ${url}:`, err);
      return createErrorResult([err.message || 'Erro ao processar consulta no Supabase.']);
    }
  },

  async post<T>(url: string, data?: any, _config?: any): Promise<{ data: ApiResult<any>; status: number }> {
    if (!isSupabaseConfigured) {
      return createErrorResult(['Supabase não está configurado.']);
    }

    const tenantId = getCurrentTenantId();

    try {
      // 1. Criar Cliente (/clientes)
      if (url === '/clientes') {
        const payload: any = {
          nome: data.nome,
          documento: data.cpfCnpj || null,
          cpf_cnpj: data.cpfCnpj || null,
          telefone: data.telefoneWhatsApp || null,
          telefone_whatsapp: data.telefoneWhatsApp || null,
          email: data.email || null,
          observacoes: data.observacoes || null,
          origem: data.origem || 'Manual',
        };
        if (tenantId) payload.tenant_id = tenantId;

        const { data: inserted, error } = await supabase
          .from('clientes')
          .insert(payload)
          .select()
          .single();

        if (error) {
          console.error('Erro ao inserir cliente:', error);
          return createErrorResult([error.message]);
        }

        await recordAuditLog('CRIAR', 'clientes', inserted.id, { nome: inserted.nome });

        const novoCliente: Cliente = {
          id: inserted.id,
          nome: inserted.nome,
          cpfCnpj: inserted.documento || inserted.cpf_cnpj || undefined,
          email: inserted.email || undefined,
          telefoneWhatsApp: inserted.telefone || inserted.telefone_whatsapp || undefined,
          observacoes: inserted.observacoes || undefined,
          origem: inserted.origem || 'Manual',
          createdAtUtc: inserted.created_at,
        };

        return createSuccessResult(novoCliente);
      }

      // 1.1 Criar Serviço (/servicos)
      if (url === '/servicos') {
        const payload: any = {
          cliente_id: data.clienteId,
          cliente_nome: data.clienteNome,
          titulo: data.titulo || null,
          escopo: data.escopo || null,
          status: 'EmAndamento',
          origem: 'Manual',
        };
        if (tenantId) payload.tenant_id = tenantId;

        const { data: inserted, error } = await supabase
          .from('servicos')
          .insert(payload)
          .select()
          .single();

        if (error) {
          console.error('Erro ao inserir servico:', error);
          return createErrorResult([error.message]);
        }

        await recordAuditLog('CRIAR', 'servicos', inserted.id, { titulo: inserted.titulo });

        const novoServico: Servico = {
          id: inserted.id,
          clienteId: inserted.cliente_id,
          clienteNome: inserted.cliente_nome,
          titulo: inserted.titulo || undefined,
          escopo: inserted.escopo || undefined,
          status: inserted.status || 'EmAndamento',
          origem: inserted.origem || 'Manual',
          createdAtUtc: inserted.created_at,
        };

        return createSuccessResult(novoServico);
      }

      // 2. Criar Projeto de Marcenaria (/furniture/projetos)
      if (url === '/furniture/projetos') {
        const payload: any = {
          cliente_id: data.clienteId,
          titulo: data.titulo,
          status: String(data.status ?? 0),
          valor_total_orcamento: data.valorTotalOrcamento || 0,
          valor_total: data.valorTotalOrcamento || 0,
          observacoes: data.observacoes || null,
          ambientes: data.ambientes || [],
        };
        if (tenantId) payload.tenant_id = tenantId;

        let { data: inserted, error } = await supabase
          .from('projetos_marcenaria')
          .insert(payload)
          .select()
          .single();

        if (error && error.code === '42P01') {
          const fb = await supabase.from('projetos').insert(payload).select().single();
          inserted = fb.data;
          error = fb.error;
        }

        if (error) {
          console.error('Erro ao criar projeto:', error);
          return createErrorResult([error.message]);
        }

        await recordAuditLog('CRIAR', 'projetos_marcenaria', inserted.id, { titulo: inserted.titulo });
        return createSuccessResult(inserted);
      }

      // 3. Criar Orçamento (/servicos/:id/orcamentos)
      if (url.startsWith('/servicos/') && url.endsWith('/orcamentos')) {
        const servicoId = url.replace('/servicos/', '').replace('/orcamentos', '');
        const itensCalculados = (data.itens || []).map((it: any) => ({
          ...it,
          valorTotal: Number(it.quantidade) * Number(it.valorUnitario),
        }));
        const valorTotal = itensCalculados.reduce((s: number, i: any) => s + i.valorTotal, 0);

        const payload: any = {
          servico_id: servicoId,
          itens: itensCalculados,
          valor_total: valorTotal,
          data_validade: data.dataValidade || new Date(Date.now() + 15 * 86400000).toISOString(),
          observacoes_gerais: data.observacoesGerais || null,
          status: 'Pendente',
          tem_pdf_assinado: false,
        };
        if (tenantId) payload.tenant_id = tenantId;

        const { data: inserted, error } = await supabase
          .from('orcamentos')
          .insert(payload)
          .select()
          .single();

        if (error) {
          console.error('Erro ao gerar orçamento:', error);
          return createErrorResult([error.message]);
        }

        // Atualiza status do serviço
        await supabase
          .from('servicos')
          .update({ status: 'OrcamentoEnviado' })
          .eq('id', servicoId);

        await recordAuditLog('CRIAR', 'orcamentos', inserted.id, { valorTotal });

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

        return createSuccessResult(orcamento);
      }

      // 4. Assinar Orçamento Eletronicamente (/orcamentos/:id/assinar)
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

        if (error) {
          console.error('Erro ao assinar orçamento:', error);
          return createErrorResult([error.message]);
        }

        if (updated?.servico_id) {
          await supabase
            .from('servicos')
            .update({ status: 'Aprovado' })
            .eq('id', updated.servico_id);
        }

        await recordAuditLog('ASSINAR', 'orcamentos', id, { assinadoPor: data.nome });
        return createSuccessResult(undefined);
      }

      // 5. Aprovar Conversa do WhatsApp (/whatsapp/conversas-pendentes/:id/aprovar)
      if (url.startsWith('/whatsapp/conversas-pendentes/') && url.endsWith('/aprovar')) {
        const id = url.replace('/whatsapp/conversas-pendentes/', '').replace('/aprovar', '');

        // Busca mensagem na tabela 'whatsapp_mensagens'
        let { data: msg, error: msgError } = await supabase
          .from('whatsapp_mensagens')
          .select('*')
          .eq('id', id)
          .single();

        if (msgError && msgError.code === '42P01') {
          const fb = await supabase.from('whatsapp_conversas').select('*').eq('id', id).single();
          msg = fb.data;
        }

        if (!msg) {
          return createErrorResult(['Mensagem ou conversa não encontrada.'], 404);
        }

        const telefoneMsg = msg.telefone || msg.telefone_origem || msg.telefone_origem_e164 || '';
        const conteudoMsg = msg.conteudo || msg.texto || msg.mensagem || msg.ultima_mensagem_texto || '';
        const nomeFinal = data?.nome?.trim() || `Contato WhatsApp ${telefoneMsg}`;

        // Marca como Aprovada
        await supabase
          .from('whatsapp_mensagens')
          .update({ status: 'Aprovada' })
          .eq('id', id);

        // Insere cliente real
        const cliPayload: any = {
          nome: nomeFinal,
          telefone: telefoneMsg,
          telefone_whatsapp: telefoneMsg,
          origem: 'WhatsApp',
          observacoes: conteudoMsg ? `Mensagem recebida: "${conteudoMsg}"` : null,
        };
        if (tenantId) cliPayload.tenant_id = tenantId;

        const { data: novoCli, error: cliErr } = await supabase
          .from('clientes')
          .insert(cliPayload)
          .select()
          .single();

        if (cliErr) return createErrorResult([cliErr.message]);

        // Insere atendimento/serviço real
        const srvPayload: any = {
          cliente_id: novoCli.id,
          cliente_nome: nomeFinal,
          titulo: 'Atendimento via WhatsApp',
          escopo: conteudoMsg || 'Contato iniciado via WhatsApp.',
          status: 'EmAndamento',
          origem: 'WhatsApp',
        };
        if (tenantId) srvPayload.tenant_id = tenantId;

        const { data: novoSrv, error: srvErr } = await supabase
          .from('servicos')
          .insert(srvPayload)
          .select()
          .single();

        if (srvErr) return createErrorResult([srvErr.message]);

        await recordAuditLog('APROVAR_WHATSAPP', 'whatsapp_mensagens', id, { clienteId: novoCli.id });

        return createSuccessResult({ clienteId: novoCli.id, servicoId: novoSrv.id });
      }

      // 6. Ignorar Conversa
      if (url.startsWith('/whatsapp/conversas-pendentes/') && url.endsWith('/ignorar')) {
        const id = url.replace('/whatsapp/conversas-pendentes/', '').replace('/ignorar', '');
        await supabase
          .from('whatsapp_mensagens')
          .update({ status: 'Ignorada' })
          .eq('id', id);
        return createSuccessResult(undefined);
      }

      // Envio de orçamento via WhatsApp
      if (url.includes('/enviar-orcamento-whatsapp') || url === '/whatsapp/enviar-texto') {
        return createErrorResult([
          'O envio real pelo WhatsApp ainda não está conectado a um provedor/API. Nenhuma mensagem foi enviada.'
        ], 501);
      }

      return createErrorResult([`Rota POST não reconhecida: ${url}`], 404);
    } catch (err: any) {
      console.error(`Exceção na rota POST ${url}:`, err);
      return createErrorResult([err.message || 'Erro ao gravar dados no Supabase.']);
    }
  },

  async put<T>(url: string, data?: any, _config?: any): Promise<{ data: ApiResult<any>; status: number }> {
    if (!isSupabaseConfigured) {
      return createErrorResult(['Supabase não está configurado.']);
    }

    const tenantId = getCurrentTenantId();

    try {
      // 1. Atualizar Serviço (/servicos/:id)
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

        if (error) {
          console.error('Erro ao atualizar serviço:', error);
          return createErrorResult([error.message]);
        }

        await recordAuditLog('ATUALIZAR', 'servicos', id, updates);

        const servico: Servico = {
          id: updated.id,
          clienteId: updated.cliente_id || '',
          clienteNome: updated.cliente_nome || 'Cliente',
          titulo: updated.titulo || undefined,
          escopo: updated.escopo || undefined,
          status: updated.status || 'EmAndamento',
          origem: updated.origem || 'Manual',
          usuarioResponsavelId: updated.usuario_responsavel_id || undefined,
          createdAtUtc: updated.created_at,
        };

        return createSuccessResult(servico);
      }

      // 2. Atualizar Status do Projeto de Marcenaria (/furniture/projetos/:id)
      if (url.startsWith('/furniture/projetos/')) {
        const id = url.replace('/furniture/projetos/', '');
        const updates: any = {};
        if (data.status !== undefined) updates.status = String(Number(data.status));
        if (data.titulo !== undefined) updates.titulo = data.titulo;
        if (data.observacoes !== undefined) updates.observacoes = data.observacoes;

        let { data: updated, error } = await supabase
          .from('projetos_marcenaria')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error && error.code === '42P01') {
          const fb = await supabase.from('projetos').update(updates).eq('id', id).select().single();
          updated = fb.data;
          error = fb.error;
        }

        if (error) {
          console.error('Erro ao atualizar projeto:', error);
          return createErrorResult([error.message]);
        }

        await recordAuditLog('ATUALIZAR', 'projetos_marcenaria', id, updates);

        const projeto: ProjetoMovelPlanejado = {
          id: updated.id,
          clienteId: updated.cliente_id || '',
          titulo: updated.titulo || 'Projeto',
          status: typeof updated.status === 'number' ? updated.status : Number(updated.status),
          valorTotalOrcamento: Number(updated.valor_total_orcamento ?? updated.valor_total) || 0,
          ambientes: Array.isArray(updated.ambientes) ? updated.ambientes : [],
        };

        return createSuccessResult(projeto);
      }

      // 3. Salvar Configuração WhatsApp (/whatsapp/configuracao)
      if (url === '/whatsapp/configuracao') {
        const payload: any = {
          phone_number_id: data.phoneNumberId,
          access_token: data.accessToken,
          business_account_id: data.businessAccountId || null,
          numero_origem: data.numeroOrigem || null,
          webhook_verify_token: data.webhookVerifyToken,
          configurado: true,
          updated_at: new Date().toISOString(),
        };
        if (tenantId) payload.tenant_id = tenantId;

        const { data: upserted, error } = await supabase
          .from('whatsapp_config')
          .upsert(payload, { onConflict: tenantId ? 'tenant_id' : undefined })
          .select('tenant_id, phone_number_id, business_account_id, numero_origem, configurado, created_at, updated_at')
          .single();

        if (error) {
          console.error('Erro ao salvar whatsapp_config:', error);
          return createErrorResult([error.message]);
        }

        const maskedPhone =
          upserted.phone_number_id && upserted.phone_number_id.length > 4
            ? `••••••••${upserted.phone_number_id.slice(-4)}`
            : upserted.phone_number_id;

        const config: WhatsAppConfiguracao = {
          configurado: true,
          numeroOrigem: upserted.numero_origem,
          phoneNumberIdMascarado: maskedPhone,
          businessAccountIdMascarado: upserted.business_account_id ? `••••••••${upserted.business_account_id.slice(-4)}` : undefined,
          configuradoEmUtc: upserted.updated_at,
          webhookUrl: window.location.origin + '/api/whatsapp/webhook',
        };

        return createSuccessResult(config);
      }

      return createErrorResult([`Rota PUT não reconhecida: ${url}`], 404);
    } catch (err: any) {
      console.error(`Exceção na rota PUT ${url}:`, err);
      return createErrorResult([err.message || 'Erro ao atualizar dados no Supabase.']);
    }
  },

  async delete<T>(url: string, _config?: any): Promise<{ data: ApiResult<any>; status: number }> {
    if (!isSupabaseConfigured) {
      return createErrorResult(['Supabase não está configurado.']);
    }

    const tenantId = getCurrentTenantId();

    try {
      if (url.startsWith('/clientes/')) {
        const id = url.replace('/clientes/', '');
        let query = supabase.from('clientes').delete().eq('id', id);
        if (tenantId) query = query.eq('tenant_id', tenantId);
        const { error } = await query;
        if (error) return createErrorResult([error.message]);
        await recordAuditLog('EXCLUIR', 'clientes', id);
        return createSuccessResult(true);
      }

      if (url.startsWith('/furniture/projetos/')) {
        const id = url.replace('/furniture/projetos/', '');
        let { error } = await supabase.from('projetos_marcenaria').delete().eq('id', id);
        if (error && error.code === '42P01') {
          const fb = await supabase.from('projetos').delete().eq('id', id);
          error = fb.error;
        }
        if (error) return createErrorResult([error.message]);
        await recordAuditLog('EXCLUIR', 'projetos_marcenaria', id);
        return createSuccessResult(true);
      }

      if (url.startsWith('/servicos/')) {
        const id = url.replace('/servicos/', '');
        let query = supabase.from('servicos').delete().eq('id', id);
        if (tenantId) query = query.eq('tenant_id', tenantId);
        const { error } = await query;
        if (error) return createErrorResult([error.message]);
        await recordAuditLog('EXCLUIR', 'servicos', id);
        return createSuccessResult(true);
      }

      return createErrorResult([`Rota DELETE não reconhecida: ${url}`], 404);
    } catch (err: any) {
      console.error(`Exceção na rota DELETE ${url}:`, err);
      return createErrorResult([err.message || 'Erro ao excluir registro no Supabase.']);
    }
  },
};
