BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS identificador_interno text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_identificador_interno_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_identificador_interno_check
  CHECK (identificador_interno IS NULL OR identificador_interno ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,39}$');

CREATE UNIQUE INDEX IF NOT EXISTS profiles_tenant_identificador_interno_uidx
  ON public.profiles (tenant_id, lower(identificador_interno))
  WHERE identificador_interno IS NOT NULL;

CREATE OR REPLACE FUNCTION private.operational_employee_json(p_user uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT jsonb_build_object('id',p.id,'nome',p.nome_completo,'email',p.email,'cargo',p.cargo,
    'identificador_interno',p.identificador_interno,'setor',p.setor,
    'status',CASE WHEN p.suspenso THEN 'suspenso' WHEN NOT p.ativo THEN 'inativo' WHEN NOT private.user_within_plan(p.id) THEN 'suspenso_plano' ELSE 'ativo' END,
    'created_at',p.created_at,'versao',p.acesso_versao,
    'ultimo_acesso',(SELECT max(last_seen_at) FROM private.login_devices WHERE user_id=p.id),
    'setores_adicionais',coalesce((SELECT jsonb_agg(setor ORDER BY setor) FROM private.employee_sector_grants WHERE user_id=p.id),'[]'::jsonb),
    'permissoes',coalesce((SELECT jsonb_agg(jsonb_build_object('modulo',modulo,'operacao',operacao,'escopo',escopo) ORDER BY modulo,operacao) FROM private.employee_permissions WHERE user_id=p.id),'[]'::jsonb))
  FROM public.profiles p WHERE p.id=p_user;
$$;

CREATE OR REPLACE FUNCTION public.funcionario_configurar(
  p_usuario_id uuid,p_nome text,p_cargo text,p_setor text,p_setores_adicionais text[],p_status text,
  p_permissoes jsonb,p_versao integer,p_identificador_interno text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; company uuid; normalized text;
BEGIN
  normalized:=nullif(trim(coalesce(p_identificador_interno,'')),'');
  IF normalized IS NOT NULL AND normalized !~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,39}$' THEN
    RAISE EXCEPTION 'Identificador interno inválido.' USING ERRCODE='22023';
  END IF;
  result:=public.funcionario_configurar(p_usuario_id,p_nome,p_cargo,p_setor,p_setores_adicionais,p_status,p_permissoes,p_versao);
  SELECT tenant_id INTO company FROM public.profiles WHERE id=p_usuario_id;
  IF company IS NULL OR NOT private.operational_owner(company) THEN
    RAISE EXCEPTION 'Funcionário não disponível nesta empresa.' USING ERRCODE='42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE tenant_id=company AND id<>p_usuario_id
    AND lower(identificador_interno)=lower(normalized)) THEN
    RAISE EXCEPTION 'Este identificador interno já está em uso nesta empresa.' USING ERRCODE='23505';
  END IF;
  UPDATE public.profiles SET identificador_interno=normalized WHERE id=p_usuario_id AND tenant_id=company;
  INSERT INTO public.audit_logs(tenant_id,actor_id,acao,tabela,registro_id,detalhes)
    VALUES(company,auth.uid(),'FUNCIONARIO_IDENTIFICADOR_ALTERADO','profiles',p_usuario_id::text,
      jsonb_build_object('identificador_interno',normalized,'resultado','sucesso'));
  RETURN private.operational_employee_json(p_usuario_id);
END $$;

REVOKE ALL ON FUNCTION public.funcionario_configurar(uuid,text,text,text,text[],text,jsonb,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.funcionario_configurar(uuid,text,text,text,text[],text,jsonb,integer,text) TO authenticated;

COMMIT;

