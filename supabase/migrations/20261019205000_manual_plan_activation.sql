-- Ativação manual: o checkout nunca libera plano pago.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS plano_solicitado_id text REFERENCES public.saas_planos(id),
  ADD COLUMN IF NOT EXISTS data_contratacao timestamptz,
  ADD COLUMN IF NOT EXISTS inicio_utilizacao timestamptz;

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
BEGIN
  IF auth.uid() IS NULL OR NOT private.is_saas_super_admin() THEN
    RAISE EXCEPTION 'Somente Super Admin pode ativar planos';
  END IF;
  SELECT * INTO v_tenant FROM public.tenants WHERE id = p_tenant_id FOR UPDATE;
  IF NOT FOUND OR v_tenant.razao_social LIKE '[EXCLUÍDA] %' THEN
    RAISE EXCEPTION 'Empresa inexistente ou arquivada';
  END IF;
  SELECT * INTO v_plano FROM public.saas_planos WHERE id = p_plano_id AND status = 'ativo';
  IF NOT FOUND OR lower(trim(v_plano.nome)) NOT IN ('free','standard','empresarial') THEN
    RAISE EXCEPTION 'Plano inválido ou indisponível';
  END IF;
  IF lower(trim(v_plano.nome)) = 'free' THEN
    RAISE EXCEPTION 'Plano Free não exige ativação de assinatura paga';
  END IF;
  v_vencimento := CASE v_plano.periodicidade
    WHEN 'mensal' THEN v_now + interval '1 month'
    WHEN 'trimestral' THEN v_now + interval '3 months'
    WHEN 'semestral' THEN v_now + interval '6 months'
    WHEN 'anual' THEN v_now + interval '1 year'
    ELSE NULL END;
  IF v_vencimento IS NULL THEN RAISE EXCEPTION 'Periodicidade inválida'; END IF;

  -- Repetir a mesma ativação não reinicia o ciclo.
  SELECT id INTO v_assinatura_id FROM public.saas_assinaturas
  WHERE tenant_id=p_tenant_id AND plano_id=p_plano_id AND status='ativa'
  ORDER BY created_at DESC LIMIT 1;
  IF v_assinatura_id IS NOT NULL AND v_tenant.plano=lower(trim(v_plano.nome)) THEN
    RETURN jsonb_build_object('success',true,'message','Plano já ativo; datas preservadas','assinatura_id',v_assinatura_id);
  END IF;

  UPDATE public.saas_assinaturas SET status='cancelada',cancelada_em=v_now,
    motivo_cancelamento='Substituída por ativação administrativa de outro plano',updated_at=v_now
  WHERE tenant_id=p_tenant_id AND status IN ('ativa','pendente','suspensa','vencida');

  INSERT INTO public.saas_assinaturas
    (tenant_id,plano_id,status,valor,periodicidade,data_inicio,data_proximo_vencimento)
  VALUES (p_tenant_id,p_plano_id,'ativa',v_plano.preco,v_plano.periodicidade,v_now,v_vencimento)
  RETURNING id INTO v_assinatura_id;

  UPDATE public.tenants SET plano=lower(trim(v_plano.nome)),ativo=true,
    plano_solicitado_id=NULL,
    data_contratacao=COALESCE(data_contratacao,v_now),
    inicio_utilizacao=COALESCE(inicio_utilizacao,v_now),
    updated_at=v_now
  WHERE id=p_tenant_id;

  SELECT email INTO v_email FROM auth.users WHERE id=auth.uid();
  INSERT INTO public.saas_audit_logs
    (usuario_id,usuario_email,papel_operador,acao,modulo,registro_id,detalhes)
  VALUES (auth.uid(),v_email,'SuperAdmin','ATIVAR_PLANO_MANUAL','Assinaturas',p_tenant_id::text,
    jsonb_build_object('plano_id',p_plano_id,'plano_anterior',v_tenant.plano,
      'assinatura_id',v_assinatura_id,'ativado_em',v_now,
      'proximo_vencimento',v_vencimento,'pagamento','conferido manualmente pelo operador'));
  RETURN jsonb_build_object('success',true,'assinatura_id',v_assinatura_id,
    'ativado_em',v_now,'proximo_vencimento',v_vencimento);
END; $$;
REVOKE ALL ON FUNCTION public.admin_ativar_plano_empresa(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_ativar_plano_empresa(uuid,text) TO authenticated;