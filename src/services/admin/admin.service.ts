import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  SaaSUsuarioInterno,
  SaaSPlano,
  SaaSPlanoLink,
  SaaSAssinatura,
  SaaSCobranca,
  SaaSPagamento,
  SaaSEmpresaItem,
  SaaSAuditLog,
  SaaSGatewayConfig,
  SaaSPapelInterno,
} from "@/types/admin";
import type { ApiResult } from "@/types/api";

function getCurrentUserEmailAndId(): { email?: string; id?: string } {
  try {
    const raw = localStorage.getItem("erp-saas:auth");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        email: parsed.usuario?.email,
        id: parsed.usuario?.usuarioId,
      };
    }
  } catch {
    // Ignore
  }
  return {};
}

/**
 * Registra log de auditoria em saas_audit_logs
 */
export async function registrarSaaSAuditLog(
  modulo:
    | "Administracao"
    | "Financeiro"
    | "Planos"
    | "Assinaturas"
    | "Seguranca"
    | "Gateways",
  acao: string,
  registroId?: string,
  detalhes?: any,
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { email, id } = getCurrentUserEmailAndId();
    await supabase.from("saas_audit_logs").insert({
      usuario_id: id || null,
      usuario_email: email || "admin@sistema",
      papel_operador: "SuperAdmin/Financeiro",
      acao,
      modulo,
      registro_id: registroId || null,
      detalhes: detalhes || null,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Falha silenciosa ao registrar audit log do SaaS:", err);
  }
}

export const adminService = {
  // -------------------------------------------------------------------------
  // 1. EMPRESAS (TENANTS)
  // -------------------------------------------------------------------------
  async listarEmpresas(): Promise<ApiResult<SaaSEmpresaItem[]>> {
    if (!isSupabaseConfigured) {
      return { succeeded: false, errors: ["Supabase não configurado."] };
    }

    try {
      // 1. Busca todas as empresas
      const { data: tenantsData, error: tenantsErr } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });

      if (tenantsErr) return { succeeded: false, errors: [tenantsErr.message] };

      // 2. Busca contagem de perfis por tenant
      const { data: profilesData, error: profilesErr } = await supabase
        .from("profiles")
        .select("tenant_id");
      if (profilesErr)
        return { succeeded: false, errors: [profilesErr.message] };

      // 3. Assinaturas em ordem decrescente para escolher a mais recente de cada empresa.
      const { data: assinaturasData, error: assinaturasErr } = await supabase
        .from("saas_assinaturas")
        .select("*")
        .order("created_at", { ascending: false });
      if (assinaturasErr)
        return { succeeded: false, errors: [assinaturasErr.message] };

      const { data: planosData, error: planosErr } = await supabase
        .from("saas_planos")
        .select("id,nome,preco");
      if (planosErr) return { succeeded: false, errors: [planosErr.message] };

      const empresas: SaaSEmpresaItem[] = (tenantsData || [])
        // Empresas arquivadas por exclusão ficam fora do painel; o registro permanece no banco para auditoria.
        .filter(
          (t: any) => !String(t.razao_social || "").startsWith("[EXCLUÍDA] "),
        )
        .map((t: any) => {
          const totalUsers = (profilesData || []).filter(
            (p: any) => p.tenant_id === t.id,
          ).length;
          const assinatura = (assinaturasData || []).find(
            (a: any) => a.tenant_id === t.id,
          );

          return {
            id: t.id,
            razaoSocial: t.razao_social || "Empresa sem nome",
            nomeFantasia: t.nome_fantasia || undefined,
            documento: t.documento || undefined,
            plano:
              (planosData || []).find(
                (p: any) => p.id === t.plano_solicitado_id,
              )?.nome ||
              t.plano ||
              "Não informado",
            status: (t.ativo === false
              ? assinatura?.status === "cancelada"
                ? "cancelado"
                : "suspenso"
              : assinatura?.status === "cancelada"
                ? "cancelado"
                : assinatura?.status === "suspensa"
                  ? "suspenso"
                  : "ativo") as any,
            planoSolicitadoId: t.plano_solicitado_id || undefined,
            dataContratacao: t.data_contratacao || undefined,
            inicioUtilizacao: t.inicio_utilizacao || undefined,
            createdAt: t.created_at,
            totalUsuarios: totalUsers,
            totalProjetos: 0,
            assinaturaStatus:
              assinatura?.status ||
              (t.status === "ativo" ? "ativa" : "pendente"),
            valorAssinatura: assinatura
              ? Number(assinatura.valor)
              : Number(
                  (planosData || []).find(
                    (p: any) => p.id === t.plano_solicitado_id,
                  )?.preco || 0,
                ),
            dataVencimento: assinatura?.data_proximo_vencimento || undefined,
          };
        });

      return { succeeded: true, value: empresas, errors: [] };
    } catch (err: any) {
      return {
        succeeded: false,
        errors: [err.message || "Erro ao listar empresas."],
      };
    }
  },

  async alterarPlanoEmpresa(
    tenantId: string,
    planoId: string,
  ): Promise<ApiResult<void>> {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };
    try {
      const { data, error } = await supabase.rpc("admin_ativar_plano_empresa", {
        p_tenant_id: tenantId,
        p_plano_id: planoId,
      });
      if (error) return { succeeded: false, errors: [error.message] };
      if (!data?.success)
        return {
          succeeded: false,
          errors: [data?.message || "Não foi possível ativar o plano."],
        };
      return { succeeded: true, errors: [] };
    } catch (err: any) {
      return {
        succeeded: false,
        errors: [err.message || "Erro ao ativar o plano da empresa."],
      };
    }
  },

  async excluirEmpresa(
    id: string,
    confirmacao: string,
  ): Promise<ApiResult<void>> {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };
    try {
      const { data, error } = await supabase.rpc("admin_excluir_empresa", {
        p_tenant_id: id,
        p_confirmacao: confirmacao,
      });
      if (error) return { succeeded: false, errors: [error.message] };
      if (!data?.success)
        return {
          succeeded: false,
          errors: [
            data?.message || "Não foi possível excluir/arquivar a empresa.",
          ],
        };
      // A RPC já grava o log oficial da exclusão para evitar registros duplicados.
      return { succeeded: true, errors: [] };
    } catch (err: any) {
      return {
        succeeded: false,
        errors: [err.message || "Erro ao excluir empresa."],
      };
    }
  },

  async atualizarStatusEmpresa(
    tenantId: string,
    status: "ativo" | "suspenso" | "cancelado",
    motivo?: string,
  ): Promise<ApiResult<void>> {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };

    try {
      const { error } = await supabase
        .from("tenants")
        .update({ ativo: status === "ativo" })
        .eq("id", tenantId);

      if (error) return { succeeded: false, errors: [error.message] };

      // Atualiza status da assinatura vinculada
      const statusAssinaturaMap = {
        ativo: "ativa",
        suspenso: "suspensa",
        cancelado: "cancelada",
      };
      await supabase
        .from("saas_assinaturas")
        .update({
          status: statusAssinaturaMap[status],
          cancelada_em:
            status === "cancelado" ? new Date().toISOString() : null,
          motivo_cancelamento: motivo || null,
        })
        .eq("tenant_id", tenantId);

      await registrarSaaSAuditLog(
        "Administracao",
        `ALTERAR_STATUS_EMPRESA_${status.toUpperCase()}`,
        tenantId,
        {
          novoStatus: status,
          motivo,
        },
      );

      return { succeeded: true, errors: [] };
    } catch (err: any) {
      return { succeeded: false, errors: [err.message] };
    }
  },

  // -------------------------------------------------------------------------
  // 2. PLANOS DO SAAS
  // -------------------------------------------------------------------------
  async listarPlanos(): Promise<ApiResult<SaaSPlano[]>> {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };

    try {
      const { data, error } = await supabase
        .from("saas_planos")
        .select("*")
        .order("ordem", { ascending: true });

      if (error) {
        return { succeeded: false, errors: [error.message] };
      }
      if (!data || (data as any[]).length === 0) {
        return {
          succeeded: false,
          errors: [
            "Nenhum plano real cadastrado no Supabase. Cadastre os planos antes de configurar links ou iniciar novas assinaturas.",
          ],
        };
      }

      const planos: SaaSPlano[] = (data || []).map((d: any) => ({
        id: d.id,
        nome: d.nome,
        descricao: d.descricao || "",
        preco: Number(d.preco || 0),
        periodicidade: d.periodicidade || "mensal",
        status: d.status || "ativo",
        recursos: Array.isArray(d.recursos) ? d.recursos : [],
        ordem: d.ordem ?? 0,
        createdAt: d.created_at,
      }));

      return { succeeded: true, value: planos, errors: [] };
    } catch (err: any) {
      return { succeeded: false, errors: [err.message] };
    }
  },

  async excluirPlano(id: string): Promise<ApiResult<void>> {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };
    try {
      const { count, error: countError } = await supabase
        .from("saas_assinaturas")
        .select("id", { count: "exact", head: true })
        .eq("plano_id", id);
      if (countError) return { succeeded: false, errors: [countError.message] };
      if ((count || 0) > 0)
        return {
          succeeded: false,
          errors: [
            "Este plano está vinculado a assinaturas. Desative-o ou altere os vínculos antes de excluir.",
          ],
        };
      const { error } = await supabase
        .from("saas_planos")
        .delete()
        .eq("id", id);
      if (error) return { succeeded: false, errors: [error.message] };
      await registrarSaaSAuditLog("Planos", "EXCLUIR_PLANO", id);
      return { succeeded: true, errors: [] };
    } catch (err: any) {
      return {
        succeeded: false,
        errors: [err.message || "Erro ao excluir plano."],
      };
    }
  },

  async salvarPlano(plano: Partial<SaaSPlano>): Promise<ApiResult<SaaSPlano>> {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };

    try {
      const payload: any = {
        nome: plano.nome,
        descricao: plano.descricao || null,
        preco: plano.preco || 0,
        periodicidade: plano.periodicidade || "mensal",
        status: plano.status || "ativo",
        recursos: plano.recursos || [],
        ordem: plano.ordem ?? 0,
        updated_at: new Date().toISOString(),
      };

      let resultData;
      if (plano.id) {
        const { data, error } = await supabase
          .from("saas_planos")
          .update(payload)
          .eq("id", plano.id)
          .select()
          .single();
        if (error) return { succeeded: false, errors: [error.message] };
        resultData = data;
        await registrarSaaSAuditLog(
          "Planos",
          "ATUALIZAR_PLANO",
          plano.id,
          payload,
        );
      } else {
        payload.created_at = new Date().toISOString();
        const { data, error } = await supabase
          .from("saas_planos")
          .insert(payload)
          .select()
          .single();
        if (error) return { succeeded: false, errors: [error.message] };
        resultData = data;
        await registrarSaaSAuditLog(
          "Planos",
          "CRIAR_PLANO",
          resultData.id,
          payload,
        );
      }

      return {
        succeeded: true,
        value: {
          id: resultData.id,
          nome: resultData.nome,
          descricao: resultData.descricao,
          preco: Number(resultData.preco),
          periodicidade: resultData.periodicidade,
          status: resultData.status,
          recursos: resultData.recursos,
          ordem: resultData.ordem,
          createdAt: resultData.created_at,
        },
        errors: [],
      };
    } catch (err: any) {
      return { succeeded: false, errors: [err.message] };
    }
  },

  // -------------------------------------------------------------------------
  // 3. LINKS DE PAGAMENTO POR PLANO
  // -------------------------------------------------------------------------
  async listarLinksPagamento(): Promise<ApiResult<SaaSPlanoLink[]>> {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };

    try {
      const { data, error } = await supabase
        .from("saas_planos_links")
        .select("*, saas_planos(nome)")
        .order("created_at", { ascending: false });

      if (error && error.code !== "42P01") {
        return { succeeded: false, errors: [error.message] };
      }

      const links: SaaSPlanoLink[] = (data || []).map((d: any) => ({
        id: d.id,
        planoId: d.plano_id,
        planoNome: d.saas_planos?.nome || "Plano",
        provedor: d.provedor,
        urlCheckout: d.url_checkout,
        periodicidade: d.periodicidade || "mensal",
        status: d.status || "ativo",
        idExterno: d.id_externo || undefined,
        observacoes: d.observacoes || undefined,
        createdAt: d.created_at,
      }));

      return { succeeded: true, value: links, errors: [] };
    } catch (err: any) {
      return { succeeded: false, errors: [err.message] };
    }
  },

  async salvarLinkPagamento(
    link: Partial<SaaSPlanoLink>,
  ): Promise<ApiResult<void>> {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };

    if (!link.urlCheckout || !link.urlCheckout.startsWith("https://")) {
      return {
        succeeded: false,
        errors: ["A URL de checkout deve ser segura e começar com https://"],
      };
    }

    try {
      if (!link.planoId) {
        return {
          succeeded: false,
          errors: ["Selecione um plano válido para este link de pagamento."],
        };
      }

      const { data: planoExistente, error: planoError } = await supabase
        .from("saas_planos")
        .select("id")
        .eq("id", link.planoId)
        .maybeSingle();

      if (planoError) return { succeeded: false, errors: [planoError.message] };
      if (!planoExistente) {
        return {
          succeeded: false,
          errors: [
            "O plano selecionado não existe mais no banco de dados. Atualize a lista de planos e tente novamente.",
          ],
        };
      }

      const payload: any = {
        plano_id: link.planoId,
        provedor: link.provedor || "MercadoPago",
        url_checkout: link.urlCheckout.trim(),
        periodicidade: link.periodicidade || "mensal",
        status: link.status || "ativo",
        id_externo: link.idExterno || null,
        observacoes: link.observacoes || null,
        updated_at: new Date().toISOString(),
      };

      if (link.id) {
        const { error } = await supabase
          .from("saas_planos_links")
          .update(payload)
          .eq("id", link.id);
        if (error) return { succeeded: false, errors: [error.message] };
        await registrarSaaSAuditLog(
          "Planos",
          "ATUALIZAR_LINK_PAGAMENTO",
          link.id,
          payload,
        );
      } else {
        payload.created_at = new Date().toISOString();
        const { error } = await supabase
          .from("saas_planos_links")
          .insert(payload);
        if (error) return { succeeded: false, errors: [error.message] };
        await registrarSaaSAuditLog(
          "Planos",
          "CRIAR_LINK_PAGAMENTO",
          undefined,
          payload,
        );
      }

      return { succeeded: true, errors: [] };
    } catch (err: any) {
      return { succeeded: false, errors: [err.message] };
    }
  },

  async excluirLinkPagamento(id: string): Promise<ApiResult<void>> {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };
    try {
      const { error } = await supabase
        .from("saas_planos_links")
        .delete()
        .eq("id", id);
      if (error) return { succeeded: false, errors: [error.message] };
      await registrarSaaSAuditLog("Planos", "EXCLUIR_LINK_PAGAMENTO", id);
      return { succeeded: true, errors: [] };
    } catch (err: any) {
      return { succeeded: false, errors: [err.message] };
    }
  },

  // -------------------------------------------------------------------------
  // 4. ASSINATURAS DAS EMPRESAS
  // -------------------------------------------------------------------------
  async listarAssinaturas(): Promise<ApiResult<SaaSAssinatura[]>> {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };

    try {
      const { data, error } = await supabase
        .from("saas_assinaturas")
        .select("*, tenants(razao_social, plano), saas_planos(nome)")
        .order("created_at", { ascending: false });

      if (error && error.code !== "42P01") {
        return { succeeded: false, errors: [error.message] };
      }

      const assinaturas: SaaSAssinatura[] = (data || []).map((d: any) => ({
        id: d.id,
        tenantId: d.tenant_id,
        planoId: d.plano_id,
        status: d.status || "ativa",
        valor: Number(d.valor || 0),
        periodicidade: d.periodicidade || "mensal",
        dataInicio: d.data_inicio,
        dataProximoVencimento: d.data_proximo_vencimento,
        canceladaEm: d.cancelada_em || undefined,
        motivoCancelamento: d.motivo_cancelamento || undefined,
        tenantNome: d.tenants?.razao_social || "Empresa",
        tenantDocumento: d.tenants?.documento || undefined,
        planoNome: d.saas_planos?.nome || d.tenants?.plano || "Não informado",
      }));

      return { succeeded: true, value: assinaturas, errors: [] };
    } catch (err: any) {
      return { succeeded: false, errors: [err.message] };
    }
  },

  async excluirAssinatura(id: string): Promise<ApiResult<void>> {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };
    try {
      const { count, error: paymentError } = await supabase
        .from("saas_pagamentos")
        .select("id", { count: "exact", head: true })
        .eq("assinatura_id", id);
      if (paymentError)
        return { succeeded: false, errors: [paymentError.message] };
      if ((count || 0) > 0)
        return {
          succeeded: false,
          errors: [
            "Esta assinatura possui pagamentos vinculados; cancele-a para preservar o histórico financeiro.",
          ],
        };
      const { error } = await supabase
        .from("saas_assinaturas")
        .delete()
        .eq("id", id);
      if (error) return { succeeded: false, errors: [error.message] };
      await registrarSaaSAuditLog("Assinaturas", "EXCLUIR_ASSINATURA", id);
      return { succeeded: true, errors: [] };
    } catch (err: any) {
      return {
        succeeded: false,
        errors: [err.message || "Erro ao excluir assinatura."],
      };
    }
  },

  async alterarStatusAssinatura(
    id: string,
    status: "ativa" | "suspensa" | "cancelada" | "pendente",
    motivo?: string,
  ): Promise<ApiResult<void>> {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };

    try {
      const updates: any = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (status === "cancelada") {
        updates.cancelada_em = new Date().toISOString();
        updates.motivo_cancelamento = motivo || "Cancelamento solicitado";
      }

      const { error } = await supabase
        .from("saas_assinaturas")
        .update(updates)
        .eq("id", id);
      if (error) return { succeeded: false, errors: [error.message] };

      await registrarSaaSAuditLog(
        "Assinaturas",
        `ALTERAR_STATUS_ASSINATURA_${status.toUpperCase()}`,
        id,
        {
          novoStatus: status,
          motivo,
        },
      );

      return { succeeded: true, errors: [] };
    } catch (err: any) {
      return { succeeded: false, errors: [err.message] };
    }
  },

  // -------------------------------------------------------------------------
  // 5. COBRANÇAS / FATURAS
  // -------------------------------------------------------------------------
  async listarCobrancas(): Promise<ApiResult<SaaSCobranca[]>> {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };

    try {
      const { data, error } = await supabase
        .from("saas_cobrancas")
        .select("*, tenants(razao_social)")
        .order("data_vencimento", { ascending: false });

      if (error && error.code !== "42P01") {
        return { succeeded: false, errors: [error.message] };
      }

      const cobrancas: SaaSCobranca[] = (data || []).map((d: any) => ({
        id: d.id,
        tenantId: d.tenant_id,
        tenantNome: d.tenants?.razao_social || "Empresa",
        assinaturaId: d.assinatura_id || undefined,
        valor: Number(d.valor || 0),
        dataVencimento: d.data_vencimento,
        status: d.status || "pendente",
        linkPagamentoUtilizado: d.link_pagamento_utilizado || undefined,
        provedor: d.provedor || "Manual",
        descricao: d.descricao || "Mensalidade SaaS",
        observacoes: d.observacoes || undefined,
        createdAt: d.created_at,
      }));

      return { succeeded: true, value: cobrancas, errors: [] };
    } catch (err: any) {
      return { succeeded: false, errors: [err.message] };
    }
  },

  async criarCobranca(
    dados: Partial<SaaSCobranca>,
  ): Promise<ApiResult<SaaSCobranca>> {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };

    try {
      const payload: any = {
        tenant_id: dados.tenantId,
        assinatura_id: dados.assinaturaId || null,
        valor: dados.valor || 0,
        data_vencimento: dados.dataVencimento,
        status: dados.status || "pendente",
        link_pagamento_utilizado: dados.linkPagamentoUtilizado || null,
        provedor: dados.provedor || "Manual",
        descricao: dados.descricao || "Cobrança Avulsa / Mensalidade",
        observacoes: dados.observacoes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("saas_cobrancas")
        .insert(payload)
        .select()
        .single();

      if (error) return { succeeded: false, errors: [error.message] };

      await registrarSaaSAuditLog("Financeiro", "CRIAR_COBRANCA", data.id, {
        valor: data.valor,
        tenantId: data.tenant_id,
      });

      return {
        succeeded: true,
        value: {
          id: data.id,
          tenantId: data.tenant_id,
          valor: Number(data.valor),
          dataVencimento: data.data_vencimento,
          status: data.status,
          descricao: data.descricao,
          createdAt: data.created_at,
        },
        errors: [],
      };
    } catch (err: any) {
      return { succeeded: false, errors: [err.message] };
    }
  },

  // -------------------------------------------------------------------------
  // 6. PAGAMENTOS & CONCILIAÇÃO MANUAL
  // -------------------------------------------------------------------------
  async listarPagamentos(): Promise<ApiResult<SaaSPagamento[]>> {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };

    try {
      const { data, error } = await supabase
        .from("saas_pagamentos")
        .select("*, tenants(razao_social)")
        .order("data_pagamento", { ascending: false });

      if (error && error.code !== "42P01") {
        return { succeeded: false, errors: [error.message] };
      }

      const pagamentos: SaaSPagamento[] = (data || []).map((d: any) => ({
        id: d.id,
        cobrancaId: d.cobranca_id || undefined,
        tenantId: d.tenant_id,
        tenantNome: d.tenants?.razao_social || "Empresa",
        assinaturaId: d.assinatura_id || undefined,
        valor: Number(d.valor || 0),
        dataPagamento: d.data_pagamento,
        formaPagamento: d.forma_pagamento || "PIX",
        status: d.status || "confirmado",
        comprovanteReferencia: d.comprovante_referencia || undefined,
        descontoAjuste: Number(d.desconto_ajuste || 0),
        registradoPor: d.registrado_por || undefined,
        conferidoManualmente: Boolean(d.conferido_manualmente),
        conferidoPor: d.conferido_por || undefined,
        conferidoEm: d.conferido_em || undefined,
        idTransacaoGateway: d.id_transacao_gateway || undefined,
        provedor: d.provedor || "Manual",
        createdAt: d.created_at,
      }));

      return { succeeded: true, value: pagamentos, errors: [] };
    } catch (err: any) {
      return { succeeded: false, errors: [err.message] };
    }
  },

  async registrarPagamentoManual(dados: {
    cobrancaId?: string;
    tenantId: string;
    assinaturaId?: string;
    valor: number;
    dataPagamento: string;
    formaPagamento:
      "PIX" | "Boleto" | "Cartao" | "Transferencia" | "Dinheiro" | "Outro";
    comprovanteReferencia?: string;
    descontoAjuste?: number;
    conferidoManualmente?: boolean;
  }): Promise<ApiResult<SaaSPagamento>> {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };

    try {
      const { id: operadorId, email: operadorEmail } =
        getCurrentUserEmailAndId();

      const payload: any = {
        cobranca_id: dados.cobrancaId || null,
        tenant_id: dados.tenantId,
        assinatura_id: dados.assinaturaId || null,
        valor: dados.valor,
        data_pagamento: dados.dataPagamento || new Date().toISOString(),
        forma_pagamento: dados.formaPagamento || "PIX",
        status: "confirmado",
        comprovante_referencia: dados.comprovanteReferencia || null,
        desconto_ajuste: dados.descontoAjuste || 0,
        registrado_por: operadorId || null,
        conferido_manualmente: dados.conferidoManualmente ?? true,
        conferido_por: operadorId || null,
        conferido_em: new Date().toISOString(),
        provedor: "Manual",
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("saas_pagamentos")
        .insert(payload)
        .select()
        .single();

      if (error) return { succeeded: false, errors: [error.message] };

      // Se havia cobrança vinculada, atualiza para 'paga'
      if (dados.cobrancaId) {
        await supabase
          .from("saas_cobrancas")
          .update({ status: "paga", updated_at: new Date().toISOString() })
          .eq("id", dados.cobrancaId);
      }

      // Se havia assinatura vinculada, renova o vencimento em 30 dias e marca como 'ativa'
      if (dados.assinaturaId || dados.tenantId) {
        const query = dados.assinaturaId
          ? supabase
              .from("saas_assinaturas")
              .update({
                status: "ativa",
                data_proximo_vencimento: new Date(
                  Date.now() + 30 * 86400000,
                ).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", dados.assinaturaId)
          : supabase
              .from("saas_assinaturas")
              .update({
                status: "ativa",
                data_proximo_vencimento: new Date(
                  Date.now() + 30 * 86400000,
                ).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("tenant_id", dados.tenantId);

        await query;
      }

      await registrarSaaSAuditLog(
        "Financeiro",
        "REGISTRAR_PAGAMENTO_MANUAL",
        data.id,
        {
          valor: dados.valor,
          tenantId: dados.tenantId,
          operadorEmail,
        },
      );

      return {
        succeeded: true,
        value: {
          id: data.id,
          cobrancaId: data.cobranca_id,
          tenantId: data.tenant_id,
          valor: Number(data.valor),
          dataPagamento: data.data_pagamento,
          formaPagamento: data.forma_pagamento,
          status: data.status,
          descontoAjuste: Number(data.desconto_ajuste),
          conferidoManualmente: Boolean(data.conferido_manualmente),
          createdAt: data.created_at,
        },
        errors: [],
      };
    } catch (err: any) {
      return { succeeded: false, errors: [err.message] };
    }
  },

  async alternarConferenciaPagamento(
    id: string,
    conferido: boolean,
  ): Promise<ApiResult<void>> {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };
    try {
      const { id: operadorId } = getCurrentUserEmailAndId();
      const { error } = await supabase
        .from("saas_pagamentos")
        .update({
          conferido_manualmente: conferido,
          conferido_por: conferido ? operadorId || null : null,
          conferido_em: conferido ? new Date().toISOString() : null,
        })
        .eq("id", id);

      if (error) return { succeeded: false, errors: [error.message] };
      await registrarSaaSAuditLog(
        "Financeiro",
        conferido ? "CONFERIR_PAGAMENTO" : "DESMARCAR_CONFERENCIA",
        id,
      );
      return { succeeded: true, errors: [] };
    } catch (err: any) {
      return { succeeded: false, errors: [err.message] };
    }
  },

  async estornarPagamento(
    id: string,
    motivo: string,
  ): Promise<ApiResult<void>> {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };
    try {
      const { error } = await supabase
        .from("saas_pagamentos")
        .update({ status: "estornado" })
        .eq("id", id);

      if (error) return { succeeded: false, errors: [error.message] };
      await registrarSaaSAuditLog("Financeiro", "ESTORNAR_PAGAMENTO", id, {
        motivo,
      });
      return { succeeded: true, errors: [] };
    } catch (err: any) {
      return { succeeded: false, errors: [err.message] };
    }
  },

  // -------------------------------------------------------------------------
  // 7. EQUIPE INTERNA & ACESSOS DO SAAS
  // -------------------------------------------------------------------------
  async listarUsuariosInternos(): Promise<ApiResult<SaaSUsuarioInterno[]>> {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };

    try {
      const { data, error } = await supabase
        .from("saas_usuarios_internos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error && error.code !== "42P01") {
        return { succeeded: false, errors: [error.message] };
      }

      const usuarios: SaaSUsuarioInterno[] = (data || []).map((d: any) => ({
        id: d.id,
        userId: d.user_id,
        email: d.email,
        nome: d.nome,
        papel: d.papel as SaaSPapelInterno,
        ativo: Boolean(d.ativo),
        permissoes: d.permissoes || {
          acessoAdmin: d.papel === "SuperAdmin",
          acessoFinanceiro:
            d.papel === "SuperAdmin" || d.papel === "SaaSFinanceiro",
          leituraApenas: d.papel === "SaaSConsulta",
        },
        concedidoPor: d.concedido_por || undefined,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));

      return { succeeded: true, value: usuarios, errors: [] };
    } catch (err: any) {
      return { succeeded: false, errors: [err.message] };
    }
  },

  async salvarUsuarioInterno(dados: {
    userId?: string;
    email: string;
    nome: string;
    papel: SaaSPapelInterno;
    ativo?: boolean;
  }): Promise<ApiResult<void>> {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };

    try {
      const { id: operadorId } = getCurrentUserEmailAndId();

      const permissoes = {
        acessoAdmin: dados.papel === "SuperAdmin",
        acessoFinanceiro:
          dados.papel === "SuperAdmin" || dados.papel === "SaaSFinanceiro",
        leituraApenas: dados.papel === "SaaSConsulta",
      };

      // Tenta localizar user_id caso não tenha sido fornecido
      let targetUserId = dados.userId;
      if (!targetUserId) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", dados.email.trim())
          .maybeSingle();
        targetUserId = prof?.id || "00000000-0000-0000-0000-000000000000";
      }

      const payload: any = {
        user_id: targetUserId,
        email: dados.email.trim(),
        nome: dados.nome.trim(),
        papel: dados.papel,
        ativo: dados.ativo ?? true,
        permissoes,
        concedido_por: operadorId || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("saas_usuarios_internos")
        .upsert(payload, { onConflict: "user_id" });

      if (error) return { succeeded: false, errors: [error.message] };

      await registrarSaaSAuditLog(
        "Seguranca",
        "CONCEDER_ACESSO_INTERNO",
        targetUserId,
        {
          email: dados.email,
          papel: dados.papel,
        },
      );

      return { succeeded: true, errors: [] };
    } catch (err: any) {
      return { succeeded: false, errors: [err.message] };
    }
  },

  async excluirUsuarioInterno(id: string): Promise<ApiResult<void>> {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };
    try {
      const { data: target, error: targetError } = await supabase
        .from("saas_usuarios_internos")
        .select("id,user_id,email,papel,ativo")
        .eq("id", id)
        .single();
      if (targetError)
        return { succeeded: false, errors: [targetError.message] };
      const current = getCurrentUserEmailAndId();
      if (
        target.user_id === current.id ||
        (target.email || "").toLowerCase() ===
          (current.email || "").toLowerCase()
      )
        return {
          succeeded: false,
          errors: [
            "Por segurança, não é permitido excluir o próprio acesso por esta tela.",
          ],
        };
      if (target.papel === "SuperAdmin" && target.ativo) {
        const { count, error } = await supabase
          .from("saas_usuarios_internos")
          .select("id", { count: "exact", head: true })
          .eq("papel", "SuperAdmin")
          .eq("ativo", true);
        if (error) return { succeeded: false, errors: [error.message] };
        if ((count || 0) <= 1)
          return {
            succeeded: false,
            errors: ["Não é possível excluir o último Super Admin ativo."],
          };
      }
      const { error } = await supabase
        .from("saas_usuarios_internos")
        .delete()
        .eq("id", id);
      if (error) return { succeeded: false, errors: [error.message] };
      await registrarSaaSAuditLog("Seguranca", "EXCLUIR_USUARIO_INTERNO", id, {
        email: target.email,
        papel: target.papel,
      });
      return { succeeded: true, errors: [] };
    } catch (err: any) {
      return {
        succeeded: false,
        errors: [err.message || "Erro ao excluir usuário interno."],
      };
    }
  },

  async desativarUsuarioInterno(id: string): Promise<ApiResult<void>> {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };

    try {
      const { error } = await supabase
        .from("saas_usuarios_internos")
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) return { succeeded: false, errors: [error.message] };
      await registrarSaaSAuditLog("Seguranca", "REVOGAR_ACESSO_INTERNO", id);
      return { succeeded: true, errors: [] };
    } catch (err: any) {
      return { succeeded: false, errors: [err.message] };
    }
  },

  // -------------------------------------------------------------------------
  // 8. MÉTRICAS E INDICADORES GLOBAIS DO SAAS (Calculados a partir dos dados reais)
  // -------------------------------------------------------------------------
  async obterMetricasGerais(): Promise<
    ApiResult<{
      totalEmpresas: number;
      empresasAtivas: number;
      empresasSuspensas: number;
      empresasCanceladas: number;
      totalUsuarios: number;
      assinaturasAtivas: number;
      assinaturasPendentes: number;
      assinaturasVencidas: number;
      assinaturasCanceladas: number;
      mrrEstimado: number;
      receitaRecebidaPeriodo: number;
      valoresPendentes: number;
      inadimplenciaValor: number;
      distribuicaoPlanos: Record<string, number>;
      precosPlanos: Record<string, number | null>;
      recentAuditLogs: SaaSAuditLog[];
    }>
  > {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };

    try {
      // Todas as métricas vêm de consultas reais. Falha de consulta não vira zero nem estimativa inventada.
      const [
        tenantsRes,
        profilesRes,
        assinaturasRes,
        cobrancasRes,
        pagamentosRes,
        logsRes,
        planosRes,
      ] = await Promise.all([
        supabase.from("tenants").select("id, razao_social, ativo, plano"),
        supabase.from("profiles").select("id, tenant_id"),
        supabase.from("saas_assinaturas").select("*"),
        supabase.from("saas_cobrancas").select("*"),
        supabase.from("saas_pagamentos").select("*"),
        supabase
          .from("saas_audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("saas_planos")
          .select("nome, preco")
          .eq("status", "ativo"),
      ]);
      const queryErrors = [
        tenantsRes.error,
        profilesRes.error,
        assinaturasRes.error,
        cobrancasRes.error,
        pagamentosRes.error,
        logsRes.error,
        planosRes.error,
      ].filter(Boolean);
      if (queryErrors.length) {
        return {
          succeeded: false,
          errors: queryErrors.map(
            (e: any) =>
              e.message ||
              "Falha ao consultar dados reais do painel financeiro.",
          ),
        };
      }

      const tenants = (tenantsRes.data || []).filter(
        (t: any) => !String(t.razao_social || "").startsWith("[EXCLUÍDA] "),
      );
      const profiles = profilesRes.data || [];
      const assinaturas = assinaturasRes.data || [];
      const cobrancas = cobrancasRes.data || [];
      const pagamentos = pagamentosRes.data || [];
      const logs = logsRes.data || [];
      const precosPlanos: Record<string, number | null> = {
        Básico: null,
        Profissional: null,
        "Premium/Plus": null,
      };
      (planosRes.data || []).forEach((plano: any) => {
        const nome = String(plano.nome || "")
          .trim()
          .toLowerCase();
        const chave = ["premium", "premium/plus", "empresarial"].includes(nome)
          ? "Premium/Plus"
          : ["profissional", "standard"].includes(nome)
            ? "Profissional"
            : ["basico", "básico", "free"].includes(nome)
              ? "Básico"
              : null;
        if (chave) {
          const preco = Number(plano.preco);
          precosPlanos[chave] =
            Number.isFinite(preco) && preco >= 0 ? preco : null;
        }
      });

      const totalEmpresas = tenants.length;
      const empresasAtivas = tenants.filter(
        (t: any) => t.ativo === true,
      ).length;
      const empresasSuspensas = tenants.filter(
        (t: any) => t.ativo === false,
      ).length;
      const empresasCanceladas = assinaturas.filter(
        (a: any) => a.status === "cancelada",
      ).length;
      const tenantIdsAtivos = new Set(
        tenants.filter((t: any) => t.ativo === true).map((t: any) => t.id),
      );
      const totalUsuarios = profiles.filter((p: any) =>
        tenantIdsAtivos.has(p.tenant_id),
      ).length;

      const assinaturasAtivas = assinaturas.filter(
        (a: any) => a.status === "ativa",
      ).length;
      const assinaturasPendentes = assinaturas.filter(
        (a: any) => a.status === "pendente",
      ).length;
      const assinaturasVencidas = assinaturas.filter(
        (a: any) => a.status === "vencida",
      ).length;
      const assinaturasCanceladas = assinaturas.filter(
        (a: any) => a.status === "cancelada",
      ).length;

      // MRR: normaliza somente assinaturas ativas para equivalente mensal; sem fallback por preço presumido.
      const mrrEstimado = assinaturas
        .filter((a: any) => a.status === "ativa")
        .reduce((sum: number, a: any) => {
          const valor = Number(a.valor || 0);
          const fatorMensal: Record<string, number> = {
            mensal: 1,
            trimestral: 1 / 3,
            semestral: 1 / 6,
            anual: 1 / 12,
          };
          return (
            sum +
            valor *
              (fatorMensal[String(a.periodicidade || "mensal").toLowerCase()] ||
                1)
          );
        }, 0);

      // Receita confirmada nos últimos 30 dias; pagamentos não confirmados ou fora da janela não entram.
      const inicioPeriodo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const receitaRecebidaPeriodo = pagamentos
        .filter(
          (p: any) =>
            p.status === "confirmado" &&
            p.data_pagamento &&
            new Date(p.data_pagamento).getTime() >= inicioPeriodo,
        )
        .reduce((sum: number, p: any) => sum + Number(p.valor || 0), 0);

      const valoresPendentes = cobrancas
        .filter((c: any) => c.status === "pendente")
        .reduce((sum: number, c: any) => sum + Number(c.valor || 0), 0);

      const inadimplenciaValor = cobrancas
        .filter((c: any) => c.status === "vencida")
        .reduce((sum: number, c: any) => sum + Number(c.valor || 0), 0);

      const distribuicaoPlanos: Record<string, number> = {
        Básico: 0,
        Profissional: 0,
        "Premium/Plus": 0,
      };
      tenants.forEach((t: any) => {
        const nome = String(t.plano || "free").toLowerCase();
        const chave = ["premium", "premium/plus", "empresarial"].includes(nome)
          ? "Premium/Plus"
          : ["profissional", "standard"].includes(nome)
            ? "Profissional"
            : ["basico", "básico", "free"].includes(nome)
              ? "Básico"
              : nome;
        distribuicaoPlanos[chave] = (distribuicaoPlanos[chave] || 0) + 1;
      });

      const recentAuditLogs: SaaSAuditLog[] = (logs || []).map((l: any) => ({
        id: l.id,
        usuarioId: l.usuario_id,
        usuarioEmail: l.usuario_email,
        papelOperador: l.papel_operador,
        acao: l.acao,
        modulo: l.modulo,
        registroId: l.registro_id,
        detalhes: l.detalhes,
        createdAt: l.created_at,
      }));

      return {
        succeeded: true,
        value: {
          totalEmpresas,
          empresasAtivas,
          empresasSuspensas,
          empresasCanceladas,
          totalUsuarios,
          assinaturasAtivas,
          assinaturasPendentes,
          assinaturasVencidas,
          assinaturasCanceladas,
          mrrEstimado,
          receitaRecebidaPeriodo,
          valoresPendentes,
          inadimplenciaValor,
          distribuicaoPlanos,
          precosPlanos,
          recentAuditLogs,
        },
        errors: [],
      };
    } catch (err: any) {
      return { succeeded: false, errors: [err.message] };
    }
  },

  // -------------------------------------------------------------------------
  // 9. CONFIGURAÇÃO DE GATEWAYS
  // -------------------------------------------------------------------------
  async obterGatewayConfigs(): Promise<ApiResult<SaaSGatewayConfig[]>> {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };

    try {
      const { data, error } = await supabase
        .from("saas_gateway_configs")
        .select("*");

      if (error && error.code !== "42P01") {
        return { succeeded: false, errors: [error.message] };
      }

      // Exibir exclusivamente gateways cadastrados no banco. Não inventar IDs,
      // URLs de webhook ou configurações que ainda não foram salvas.
      const configs: SaaSGatewayConfig[] = (data || []).map((d: any) => ({
        id: d.id,
        provedor: d.provedor,
        ativo: Boolean(d.ativo),
        modoAmbiente: d.modo_ambiente || "sandbox",
        publicKey: d.public_key || undefined,
        accessTokenMascarado: d.access_token_mascarado || undefined,
        webhookSecretMascarado: d.webhook_secret_mascarado || undefined,
        webhookUrl: d.webhook_url || undefined,
        updatedAt: d.updated_at || undefined,
      }));

      return { succeeded: true, value: configs, errors: [] };
    } catch (err: any) {
      return { succeeded: false, errors: [err.message] };
    }
  },

  async salvarGatewayConfig(
    config: Partial<SaaSGatewayConfig>,
  ): Promise<ApiResult<void>> {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };

    try {
      const payload: any = {
        provedor: config.provedor,
        ativo: config.ativo ?? false,
        modo_ambiente: config.modoAmbiente || "sandbox",
        public_key: config.publicKey || null,
        access_token_mascarado: config.accessTokenMascarado || null,
        webhook_secret_mascarado: config.webhookSecretMascarado || null,
        webhook_url: config.webhookUrl || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("saas_gateway_configs")
        .upsert(payload, { onConflict: "provedor" });

      if (error) return { succeeded: false, errors: [error.message] };

      await registrarSaaSAuditLog(
        "Gateways",
        "SALVAR_CONFIG_GATEWAY",
        undefined,
        { provedor: config.provedor },
      );

      return { succeeded: true, errors: [] };
    } catch (err: any) {
      return { succeeded: false, errors: [err.message] };
    }
  },

  // -------------------------------------------------------------------------
  // 10. AUDIT LOGS
  // -------------------------------------------------------------------------
  async listarAuditLogs(
    modulo?: string,
    limite = 50,
  ): Promise<ApiResult<SaaSAuditLog[]>> {
    if (!isSupabaseConfigured)
      return { succeeded: false, errors: ["Supabase não configurado."] };

    try {
      let query = supabase.from("saas_audit_logs").select("*");
      if (modulo) query = query.eq("modulo", modulo);
      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(limite);

      if (error && error.code !== "42P01") {
        return { succeeded: false, errors: [error.message] };
      }

      const logs: SaaSAuditLog[] = (data || []).map((l: any) => ({
        id: l.id,
        usuarioId: l.usuario_id,
        usuarioEmail: l.usuario_email,
        papelOperador: l.papel_operador,
        acao: l.acao,
        modulo: l.modulo,
        registroId: l.registro_id,
        detalhes: l.detalhes,
        createdAt: l.created_at,
      }));

      return { succeeded: true, value: logs, errors: [] };
    } catch (err: any) {
      return { succeeded: false, errors: [err.message] };
    }
  },
};

