-- Catálogo comercial oficial do projeto PGE II.
-- Os IDs existentes são preservados para não quebrar links de checkout.
UPDATE public.saas_planos
SET nome = 'Básico',
    descricao = 'Para microempresas que querem substituir planilhas manuais.',
    preco = 39.90,
    recursos = '["Gestão de Estoque e Insumos"]'::jsonb,
    ordem = 0,
    updated_at = now()
WHERE lower(trim(nome)) IN ('free', 'básico', 'basico') OR ordem = 0;

UPDATE public.saas_planos
SET nome = 'Profissional',
    descricao = 'Para empresas com rotina ativa de produção.',
    preco = 79.90,
    recursos = '["Estoque e Insumos", "Pedidos", "Produção", "Financeiro integrados"]'::jsonb,
    ordem = 1,
    updated_at = now()
WHERE lower(trim(nome)) IN ('standard', 'profissional') OR ordem = 1;

UPDATE public.saas_planos
SET nome = 'Premium/Plus',
    descricao = 'Para empresas com maior demanda operacional e gerencial.',
    preco = 129.90,
    recursos = '["Todas as funcionalidades", "Suporte prioritário", "Relatórios avançados"]'::jsonb,
    ordem = 2,
    updated_at = now()
WHERE lower(trim(nome)) IN ('empresarial', 'premium', 'premium/plus') OR ordem = 2;

-- O código persistido é estável e sem acentos; o nome comercial fica no catálogo.
UPDATE public.tenants SET plano = CASE lower(trim(plano))
  WHEN 'free' THEN 'basico'
  WHEN 'standard' THEN 'profissional'
  WHEN 'empresarial' THEN 'premium'
  WHEN 'básico' THEN 'basico'
  WHEN 'profissional' THEN 'profissional'
  WHEN 'premium/plus' THEN 'premium'
  ELSE lower(trim(plano))
END,
updated_at = now();

ALTER TABLE public.tenants ALTER COLUMN plano SET DEFAULT 'basico';

-- Ativação manual aceita os três planos pagos oficiais e inicia o ciclo na ativação.
CREATE OR REPLACE FUNCTION public.admin_ativar_plano_empresa(p_tenant_id uuid, p_plano_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_tenant public.tenants%ROWTYPE;
  v_plano public.saas_planos%ROWTYPE;
  v_now timestamptz := now();
  v_vencimento timestamptz;
  v_assinatura_id text;
  v_email text;
  v_codigo text;
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_saas_super_admin() THEN
    RAISE EXCEPTION 'Somente Super Admin pode ativar planos';
  END IF;
  SELECT * INTO v_tenant FROM public.tenants WHERE id = p_tenant_id FOR UPDATE;
  IF NOT FOUND OR v_tenant.razao_social LIKE '[EXCLUÍDA] %' THEN
    RAISE EXCEPTION 'Empresa inexistente ou arquivada';
  END IF;
  SELECT * INTO v_plano FROM public.saas_planos WHERE id = p_plano_id AND status = 'ativo';
  v_codigo := CASE lower(trim(v_plano.nome))
    WHEN 'básico' THEN 'basico' WHEN 'basico' THEN 'basico'
    WHEN 'profissional' THEN 'profissional'
    WHEN 'premium' THEN 'premium' WHEN 'premium/plus' THEN 'premium'
    ELSE NULL END;
  IF NOT FOUND OR v_codigo IS NULL THEN
    RAISE EXCEPTION 'Plano inválido ou indisponível';
  END IF;
  v_vencimento := CASE v_plano.periodicidade
    WHEN 'mensal' THEN v_now + interval '1 month'
    WHEN 'trimestral' THEN v_now + interval '3 months'
    WHEN 'semestral' THEN v_now + interval '6 months'
    WHEN 'anual' THEN v_now + interval '1 year'
    ELSE NULL END;
  IF v_vencimento IS NULL THEN RAISE EXCEPTION 'Periodicidade inválida'; END IF;

  SELECT id INTO v_assinatura_id FROM public.saas_assinaturas
  WHERE tenant_id = p_tenant_id AND plano_id = p_plano_id AND status = 'ativa'
  ORDER BY created_at DESC LIMIT 1;
  IF v_assinatura_id IS NOT NULL AND v_tenant.plano = v_codigo THEN
    RETURN jsonb_build_object('success', true, 'message', 'Plano já ativo; datas preservadas', 'assinatura_id', v_assinatura_id);
  END IF;

  UPDATE public.saas_assinaturas SET status = 'cancelada', cancelada_em = v_now,
    motivo_cancelamento = 'Substituída por ativação administrativa de outro plano', updated_at = v_now
  WHERE tenant_id = p_tenant_id AND status IN ('ativa', 'pendente', 'suspensa', 'vencida');
  INSERT INTO public.saas_assinaturas (tenant_id, plano_id, status, valor, periodicidade, data_inicio, data_proximo_vencimento)
  VALUES (p_tenant_id, p_plano_id, 'ativa', v_plano.preco, v_plano.periodicidade, v_now, v_vencimento)
  RETURNING id INTO v_assinatura_id;
  UPDATE public.tenants SET plano = v_codigo, ativo = true, plano_solicitado_id = NULL,
    data_contratacao = v_now, inicio_utilizacao = v_now, updated_at = v_now WHERE id = p_tenant_id;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.saas_audit_logs (usuario_id, usuario_email, papel_operador, acao, modulo, registro_id, detalhes)
  VALUES (auth.uid(), v_email, 'SuperAdmin', 'ATIVAR_PLANO_MANUAL', 'Assinaturas', p_tenant_id::text,
    jsonb_build_object('plano_id', p_plano_id, 'plano_anterior', v_tenant.plano, 'assinatura_id', v_assinatura_id,
      'ativado_em', v_now, 'proximo_vencimento', v_vencimento, 'pagamento', 'conferido manualmente pelo operador'));
  RETURN jsonb_build_object('success', true, 'assinatura_id', v_assinatura_id, 'ativado_em', v_now, 'proximo_vencimento', v_vencimento);
END; $$;

REVOKE ALL ON FUNCTION public.admin_ativar_plano_empresa(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_ativar_plano_empresa(uuid, text) TO authenticated;
