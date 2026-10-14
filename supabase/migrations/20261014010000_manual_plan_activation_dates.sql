-- Início e vencimento da assinatura são definidos no momento da ativação manual.
CREATE OR REPLACE FUNCTION public.admin_ativar_plano_empresa(p_tenant_id uuid, p_plano_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_tenant public.tenants%rowtype;
  v_plano public.saas_planos%rowtype;
  v_assinatura_id text;
  v_agora timestamptz := now();
  v_vencimento timestamptz;
  v_operador_email text;
  v_operador_papel text;
BEGIN
  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.saas_usuarios_internos sui
    WHERE sui.user_id = v_user_id AND sui.ativo = true AND lower(trim(sui.papel)) = 'superadmin'
  ) THEN RAISE EXCEPTION 'Apenas o Super Admin pode ativar planos.'; END IF;

  SELECT * INTO v_tenant FROM public.tenants WHERE id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Empresa não encontrada.'; END IF;
  IF left(coalesce(v_tenant.razao_social,''), 10) = '[EXCLUÍDA]' THEN RAISE EXCEPTION 'Não é possível ativar uma empresa arquivada.'; END IF;

  SELECT * INTO v_plano FROM public.saas_planos WHERE id = p_plano_id AND status = 'ativo';
  IF NOT FOUND THEN RAISE EXCEPTION 'Plano ativo não encontrado.'; END IF;

  v_vencimento := CASE v_plano.periodicidade
    WHEN 'trimestral' THEN v_agora + interval '3 months'
    WHEN 'semestral' THEN v_agora + interval '6 months'
    WHEN 'anual' THEN v_agora + interval '1 year'
    ELSE v_agora + interval '1 month'
  END;

  SELECT id INTO v_assinatura_id FROM public.saas_assinaturas
  WHERE tenant_id = p_tenant_id ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

  IF v_assinatura_id IS NULL THEN
    INSERT INTO public.saas_assinaturas
      (tenant_id, plano_id, status, valor, periodicidade, data_inicio, data_proximo_vencimento, created_at, updated_at)
    VALUES
      (p_tenant_id, v_plano.id, 'ativa', v_plano.preco, v_plano.periodicidade, v_agora, v_vencimento, v_agora, v_agora)
    RETURNING id INTO v_assinatura_id;
  ELSE
    UPDATE public.saas_assinaturas
    SET plano_id = v_plano.id, status = 'ativa', valor = v_plano.preco,
        periodicidade = v_plano.periodicidade, data_inicio = v_agora,
        data_proximo_vencimento = v_vencimento, cancelada_em = NULL,
        motivo_cancelamento = NULL, updated_at = v_agora
    WHERE id = v_assinatura_id;
  END IF;

  UPDATE public.tenants
  SET plano = lower(trim(v_plano.nome)), ativo = true, plano_solicitado_id = NULL,
      data_contratacao = v_agora, inicio_utilizacao = v_agora
  WHERE id = p_tenant_id;

  SELECT email, papel INTO v_operador_email, v_operador_papel
  FROM public.saas_usuarios_internos WHERE user_id = v_user_id AND ativo = true LIMIT 1;

  INSERT INTO public.saas_audit_logs
    (usuario_id, usuario_email, papel_operador, acao, modulo, registro_id, detalhes, created_at)
  VALUES (
    v_user_id, v_operador_email, coalesce(v_operador_papel, 'SuperAdmin'),
    'ATIVAR_PLANO_MANUAL', 'Administracao', p_tenant_id::text,
    jsonb_build_object('empresa', v_tenant.razao_social, 'plano', v_plano.nome,
      'valor', v_plano.preco, 'periodicidade', v_plano.periodicidade,
      'data_contratacao', v_agora, 'inicio_utilizacao', v_agora,
      'assinatura_id', v_assinatura_id,
      'observacao', 'Ativação manual pelo Super Admin; pagamento conferido fora do sistema.'),
    v_agora
  );

  RETURN jsonb_build_object('success', true, 'assinatura_id', v_assinatura_id,
    'data_contratacao', v_agora, 'inicio_utilizacao', v_agora,
    'data_proximo_vencimento', v_vencimento);
END;
$function$;
