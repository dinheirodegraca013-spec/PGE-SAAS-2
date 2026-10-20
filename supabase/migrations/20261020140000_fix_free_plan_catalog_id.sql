-- Resolve o plano Free pelo catálogo, nunca por um ID presumido.
-- O ID do plano é gerado pelo ambiente e pode ser UUID.
CREATE OR REPLACE FUNCTION public.migrar_para_plano_free()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tenant_id uuid;
  v_role text;
  v_free_plano_id text;
  v_plano_antigo text;
  v_agora timestamptz := timezone('utc'::text, now());
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado.');
  END IF;

  SELECT p.tenant_id, p.papel INTO v_tenant_id, v_role
  FROM public.profiles p
  WHERE p.id = v_uid AND p.ativo = true;

  IF v_tenant_id IS NULL OR v_role NOT IN ('AdministradorTenant', 'SuperAdmin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permissão insuficiente.');
  END IF;

  SELECT t.plano INTO v_plano_antigo FROM public.tenants t WHERE t.id = v_tenant_id;
  SELECT sp.id INTO v_free_plano_id
  FROM public.saas_planos sp
  WHERE lower(trim(sp.nome)) = 'free' AND sp.status = 'ativo'
  ORDER BY sp.ordem NULLS LAST, sp.id
  LIMIT 1;

  IF v_free_plano_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plano Free ativo não encontrado no catálogo.');
  END IF;

  PERFORM set_config('pge.allow_system_plan_update', 'true', true);
  UPDATE public.tenants SET plano = 'Free', plano_solicitado_id = NULL, updated_at = v_agora WHERE id = v_tenant_id;

  UPDATE public.saas_assinaturas
  SET plano_id = v_free_plano_id, status = 'ativa', valor = 0, periodicidade = 'mensal',
      data_proximo_vencimento = v_agora + interval '100 years', updated_at = v_agora
  WHERE tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    INSERT INTO public.saas_assinaturas (tenant_id, plano_id, status, valor, periodicidade, data_inicio, data_proximo_vencimento)
    VALUES (v_tenant_id, v_free_plano_id, 'ativa', 0, 'mensal', v_agora, v_agora + interval '100 years');
  END IF;

  INSERT INTO public.saas_audit_logs (usuario_id, usuario_email, papel_operador, acao, modulo, registro_id, detalhes)
  VALUES (v_uid, (SELECT email FROM public.profiles WHERE id = v_uid), v_role, 'MUDANCA_PLANO_FREE', 'Assinaturas',
    v_tenant_id::text, jsonb_build_object('plano_antigo', v_plano_antigo, 'novo_plano', 'Free', 'valor', 0));

  RETURN jsonb_build_object('success', true, 'plano', 'Free');
END;
$$;

REVOKE ALL ON FUNCTION public.migrar_para_plano_free() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.migrar_para_plano_free() TO authenticated;
