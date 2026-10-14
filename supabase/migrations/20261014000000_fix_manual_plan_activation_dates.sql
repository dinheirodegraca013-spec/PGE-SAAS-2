-- Keep the manual activation workflow aligned with the business rule:
-- paid-plan contract and usage dates start when Super Admin releases the plan.
CREATE OR REPLACE FUNCTION public.admin_ativar_plano_empresa(p_tenant_id uuid, p_plano_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_tenant public.tenants%ROWTYPE;
  v_plano public.saas_planos%ROWTYPE;
  v_assinatura public.saas_assinaturas%ROWTYPE;
  v_agora timestamptz := now();
  v_vencimento timestamptz;
  v_papel text;
  v_nova_ativacao boolean := true;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Sessão não autenticada.');
  END IF;

  SELECT papel INTO v_papel
  FROM public.saas_usuarios_internos
  WHERE user_id = v_uid AND ativo = true
  LIMIT 1;

  IF v_papel IS DISTINCT FROM 'SuperAdmin' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Somente o Super Admin pode ativar planos.');
  END IF;

  SELECT * INTO v_tenant FROM public.tenants WHERE id = p_tenant_id FOR UPDATE;
  IF NOT FOUND OR v_tenant.razao_social LIKE '[EXCLUÍDA] %' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Empresa não encontrada ou arquivada.');
  END IF;

  SELECT * INTO v_plano FROM public.saas_planos WHERE id = p_plano_id AND status = 'ativo';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Plano inexistente ou inativo.');
  END IF;

  v_vencimento := CASE lower(coalesce(v_plano.periodicidade, 'mensal'))
    WHEN 'trimestral' THEN v_agora + interval '3 months'
    WHEN 'semestral' THEN v_agora + interval '6 months'
    WHEN 'anual' THEN v_agora + interval '1 year'
    ELSE v_agora + interval '1 month'
  END;

  SELECT * INTO v_assinatura
  FROM public.saas_assinaturas
  WHERE tenant_id = p_tenant_id AND status IN ('ativa','pendente','suspensa')
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  v_nova_ativacao := NOT FOUND
    OR v_assinatura.status IS DISTINCT FROM 'ativa'
    OR v_assinatura.plano_id IS DISTINCT FROM v_plano.id;

  IF FOUND THEN
    UPDATE public.saas_assinaturas
    SET plano_id = v_plano.id,
        status = 'ativa',
        valor = v_plano.preco,
        periodicidade = v_plano.periodicidade,
        data_inicio = CASE WHEN v_nova_ativacao THEN v_agora ELSE v_assinatura.data_inicio END,
        data_proximo_vencimento = CASE WHEN v_nova_ativacao THEN v_vencimento ELSE v_assinatura.data_proximo_vencimento END,
        cancelada_em = NULL,
        motivo_cancelamento = NULL,
        updated_at = v_agora
    WHERE id = v_assinatura.id
    RETURNING * INTO v_assinatura;
  ELSE
    INSERT INTO public.saas_assinaturas
      (tenant_id, plano_id, status, valor, periodicidade, data_inicio, data_proximo_vencimento, created_at, updated_at)
    VALUES
      (p_tenant_id, v_plano.id, 'ativa', v_plano.preco, v_plano.periodicidade, v_agora, v_vencimento, v_agora, v_agora)
    RETURNING * INTO v_assinatura;
  END IF;

  UPDATE public.tenants
  SET plano = lower(v_plano.nome),
      ativo = true,
      plano_solicitado_id = NULL,
      data_contratacao = CASE WHEN v_nova_ativacao THEN v_agora ELSE COALESCE(data_contratacao, v_agora) END,
      inicio_utilizacao = CASE WHEN v_nova_ativacao THEN v_agora ELSE COALESCE(inicio_utilizacao, v_agora) END,
      updated_at = v_agora
  WHERE id = p_tenant_id;

  INSERT INTO public.saas_audit_logs
    (usuario_id, usuario_email, papel_operador, acao, modulo, registro_id, detalhes, created_at)
  VALUES
    (v_uid, (SELECT email FROM auth.users WHERE id = v_uid), 'SuperAdmin',
     'ATIVAR_PLANO_EMPRESA', 'Assinaturas', p_tenant_id::text,
     jsonb_build_object(
       'empresa', v_tenant.razao_social,
       'planoAnterior', v_tenant.plano,
       'planoAtivado', v_plano.nome,
       'valor', v_plano.preco,
       'periodicidade', v_plano.periodicidade,
       'dataAtivacao', v_agora,
       'dataContratacao', v_agora,
       'inicioUtilizacao', v_agora,
       'dataVencimento', v_assinatura.data_proximo_vencimento,
       'pagamentoConfirmadoManualmentePeloAdmin', true
     ), v_agora);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Plano ativado. A data de contratação e utilização foi registrada na data/hora desta ativação.',
    'data_ativacao', v_agora,
    'data_vencimento', v_assinatura.data_proximo_vencimento
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_ativar_plano_empresa(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_ativar_plano_empresa(uuid, text) TO authenticated;
