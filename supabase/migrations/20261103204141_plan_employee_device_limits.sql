BEGIN;

ALTER TABLE public.saas_planos
  ADD COLUMN limite_sublogins integer NOT NULL DEFAULT 2 CHECK (limite_sublogins >= 0),
  ADD COLUMN limite_dispositivos integer NOT NULL DEFAULT 1 CHECK (limite_dispositivos > 0);
UPDATE public.saas_planos SET limite_sublogins=5,limite_dispositivos=2 WHERE nome='Profissional';
UPDATE public.saas_planos SET limite_sublogins=15,limite_dispositivos=3 WHERE nome='Premium/Plus';
ALTER TABLE public.tenants ADD COLUMN principal_usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
UPDATE public.tenants t SET principal_usuario_id=(
  SELECT p.id FROM public.profiles p WHERE p.tenant_id=t.id AND p.papel='AdministradorTenant' AND p.setor IS NULL
  ORDER BY p.created_at,p.id LIMIT 1
);

CREATE TABLE private.access_settings (id boolean PRIMARY KEY DEFAULT true CHECK(id),devices_enabled boolean NOT NULL DEFAULT false);
INSERT INTO private.access_settings DEFAULT VALUES;
CREATE TABLE private.access_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id uuid, actor_id uuid, subject_id uuid, action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE private.login_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_key uuid NOT NULL,label text NOT NULL CHECK(length(label) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz, UNIQUE(user_id,device_key)
);
CREATE INDEX ON private.login_devices(user_id,created_at,id) WHERE revoked_at IS NULL;
CREATE TABLE private.login_sessions (
  session_id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES private.login_devices(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.access_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.access_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.login_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.login_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.access_settings,private.access_audit,private.login_devices,private.login_sessions FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.plan_access_limits(p_tenant uuid)
RETURNS TABLE(sublogins integer,devices integer,plan_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT sp.limite_sublogins,sp.limite_dispositivos,sp.nome
  FROM public.tenants t JOIN public.saas_planos sp ON sp.nome=CASE lower(trim(t.plano))
    WHEN 'free' THEN 'Básico' WHEN '0' THEN 'Básico' WHEN 'basico' THEN 'Básico' WHEN 'básico' THEN 'Básico'
    WHEN 'standard' THEN 'Profissional' WHEN '1' THEN 'Profissional' WHEN 'profissional' THEN 'Profissional'
    WHEN 'empresarial' THEN 'Premium/Plus' WHEN '2' THEN 'Premium/Plus' WHEN 'premium' THEN 'Premium/Plus' WHEN 'premium/plus' THEN 'Premium/Plus'
    ELSE (SELECT nome FROM public.saas_planos WHERE id=t.plano) END
  WHERE t.id=p_tenant ORDER BY sp.ordem,sp.id LIMIT 1;
$$;
CREATE FUNCTION private.user_within_plan(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT coalesce((SELECT p.ativo AND t.ativo AND (p.id=t.principal_usuario_id OR
    (SELECT count(*) FROM public.profiles other WHERE other.tenant_id=p.tenant_id AND other.ativo
      AND other.id IS DISTINCT FROM t.principal_usuario_id AND (other.created_at,other.id)<=(p.created_at,p.id))<=lim.sublogins)
    FROM public.profiles p JOIN public.tenants t ON t.id=p.tenant_id
    CROSS JOIN LATERAL private.plan_access_limits(t.id) lim WHERE p.id=p_user),false);
$$;
CREATE FUNCTION private.user_session_allowed(p_user uuid,p_session uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT private.user_within_plan(p_user) AND (
    NOT coalesce((SELECT devices_enabled FROM private.access_settings WHERE id),true) OR EXISTS(
      SELECT 1 FROM private.login_sessions s JOIN private.login_devices d ON d.id=s.device_id AND d.user_id=s.user_id
      JOIN public.profiles p ON p.id=s.user_id CROSS JOIN LATERAL private.plan_access_limits(p.tenant_id) lim
      WHERE s.user_id=p_user AND s.session_id=p_session AND d.revoked_at IS NULL
        AND (SELECT count(*) FROM private.login_devices older WHERE older.user_id=p_user AND older.revoked_at IS NULL
          AND (older.created_at,older.id)<=(d.created_at,d.id))<=lim.devices
    ));
$$;
CREATE FUNCTION private.device_session_allowed() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT private.user_session_allowed(auth.uid(),nullif(auth.jwt()->>'session_id','')::uuid);
$$;
CREATE FUNCTION private.require_authorized_session() RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF private.device_session_allowed() IS NOT TRUE THEN
    RAISE EXCEPTION 'Acesso suspenso ou dispositivo não autorizado. Gerencie seus dispositivos ou fale com o administrador.' USING ERRCODE='42501';
  END IF;
END $$;
CREATE FUNCTION public.sessao_autorizada() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT private.device_session_allowed(); $$;
REVOKE ALL ON FUNCTION public.sessao_autorizada() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sessao_autorizada() TO authenticated;
CREATE FUNCTION public.validar_sessao_servico(p_usuario_id uuid,p_sessao_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT private.user_session_allowed(p_usuario_id,p_sessao_id); $$;
REVOKE ALL ON FUNCTION public.validar_sessao_servico(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.validar_sessao_servico(uuid,uuid) TO service_role;

-- Serialize account activation and creation on the company row. The count is made
-- inside the same transaction as Auth's deferred employee profile assignment.
CREATE FUNCTION private.enforce_sublogin_limit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner_id uuid; quota integer; used integer;
BEGIN
  IF NEW.tenant_id IS NULL THEN RETURN NEW; END IF;
  SELECT principal_usuario_id INTO owner_id FROM public.tenants WHERE id=NEW.tenant_id FOR UPDATE;
  IF owner_id IS NULL AND NEW.papel='AdministradorTenant' AND NEW.setor IS NULL THEN
    UPDATE public.tenants SET principal_usuario_id=NEW.id WHERE id=NEW.tenant_id;
    owner_id:=NEW.id;
  END IF;
  IF TG_OP='UPDATE' THEN
    IF NEW.tenant_id IS NOT DISTINCT FROM OLD.tenant_id AND NEW.ativo IS NOT DISTINCT FROM OLD.ativo THEN RETURN NEW; END IF;
  END IF;
  IF NEW.ativo AND NEW.id IS DISTINCT FROM owner_id THEN
    SELECT sublogins INTO quota FROM private.plan_access_limits(NEW.tenant_id);
    SELECT count(*) INTO used FROM public.profiles WHERE tenant_id=NEW.tenant_id AND ativo AND id<>NEW.id AND id IS DISTINCT FROM owner_id;
    IF quota IS NULL OR used>=quota THEN RAISE EXCEPTION 'Limite de sublogins do plano atingido. Desative um funcionário ou faça upgrade.' USING ERRCODE='P0001'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER enforce_sublogin_limit BEFORE INSERT OR UPDATE OF tenant_id,ativo ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.enforce_sublogin_limit();

CREATE FUNCTION private.audit_profile_access() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    INSERT INTO private.access_audit(tenant_id,actor_id,subject_id,action,details)
    VALUES(NEW.tenant_id,auth.uid(),NEW.id,'account_created',jsonb_build_object('sector',NEW.setor,'active',NEW.ativo));
  ELSIF (NEW.nome_completo,NEW.setor,NEW.ativo,NEW.papel,NEW.tenant_id) IS DISTINCT FROM (OLD.nome_completo,OLD.setor,OLD.ativo,OLD.papel,OLD.tenant_id) THEN
    INSERT INTO private.access_audit(tenant_id,actor_id,subject_id,action,details)
    VALUES(NEW.tenant_id,auth.uid(),NEW.id,'account_changed',jsonb_build_object('sector_before',OLD.setor,'sector_after',NEW.setor,'active_before',OLD.ativo,'active_after',NEW.ativo));
    IF OLD.ativo AND NOT NEW.ativo THEN
      WITH revoked AS (UPDATE private.login_devices SET revoked_at=now() WHERE user_id=NEW.id AND revoked_at IS NULL RETURNING id)
      INSERT INTO private.access_audit(tenant_id,actor_id,subject_id,action,details)
        SELECT NEW.tenant_id,auth.uid(),NEW.id,'device_revoked',jsonb_build_object('device_id',id,'reason','account_disabled') FROM revoked;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER audit_profile_access AFTER INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.audit_profile_access();

CREATE FUNCTION public.autorizar_dispositivo(p_chave uuid,p_nome text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); sid uuid:=nullif(auth.jwt()->>'session_id','')::uuid;
  profile public.profiles%ROWTYPE; dev private.login_devices%ROWTYPE; quota integer; used integer;
BEGIN
  SELECT * INTO profile FROM public.profiles WHERE id=uid;
  IF uid IS NULL OR sid IS NULL OR p_chave IS NULL THEN RAISE EXCEPTION 'Faça login novamente.'; END IF;
  PERFORM 1 FROM public.tenants WHERE id=profile.tenant_id FOR UPDATE;
  IF NOT private.user_within_plan(uid) THEN RAISE EXCEPTION 'Conta suspensa ou limite de sublogins atingido. Fale com o administrador.' USING ERRCODE='42501'; END IF;
  IF length(trim(coalesce(p_nome,''))) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Nome de dispositivo inválido.'; END IF;
  SELECT devices INTO quota FROM private.plan_access_limits(profile.tenant_id);
  SELECT * INTO dev FROM private.login_devices WHERE user_id=uid AND device_key=p_chave;
  IF FOUND THEN
    IF dev.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'Este dispositivo foi revogado. Autorize o navegador novamente.' USING ERRCODE='42501'; END IF;
    SELECT count(*) INTO used FROM private.login_devices WHERE user_id=uid AND revoked_at IS NULL AND (created_at,id)<=(dev.created_at,dev.id);
    IF used>quota THEN RAISE EXCEPTION 'Dispositivo suspenso pelo limite do plano. Desvincule outro dispositivo ou faça upgrade.' USING ERRCODE='42501'; END IF;
    UPDATE private.login_devices SET last_seen_at=now() WHERE id=dev.id;
  ELSE
    SELECT count(*) INTO used FROM private.login_devices WHERE user_id=uid AND revoked_at IS NULL;
    IF used>=quota THEN RAISE EXCEPTION 'Limite de dispositivos atingido. Desvincule um dispositivo ou faça upgrade.' USING ERRCODE='42501'; END IF;
    INSERT INTO private.login_devices(user_id,device_key,label) VALUES(uid,p_chave,trim(p_nome)) RETURNING * INTO dev;
    INSERT INTO private.access_audit(tenant_id,actor_id,subject_id,action,details)
      VALUES(profile.tenant_id,uid,uid,'device_authorized',jsonb_build_object('device_id',dev.id));
  END IF;
  INSERT INTO private.login_sessions(session_id,user_id,device_id) VALUES(sid,uid,dev.id)
    ON CONFLICT(session_id) DO UPDATE SET device_id=excluded.device_id WHERE login_sessions.user_id=uid;
  RETURN jsonb_build_object('authorized',true,'device_id',dev.id,'limit',quota);
END $$;

-- Self-service device management remains available to a verified login even when
-- its new device is blocked, so it can release an old authorization.
CREATE FUNCTION public.listar_dispositivos(p_usuario_id uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); target uuid:=coalesce(p_usuario_id,auth.uid()); caller public.profiles%ROWTYPE; quota integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Faça login novamente.'; END IF;
  SELECT * INTO caller FROM public.profiles WHERE id=uid;
  IF target<>uid THEN
    PERFORM private.require_authorized_session();
    IF NOT EXISTS(SELECT 1 FROM public.tenants t JOIN public.profiles p ON p.tenant_id=t.id WHERE t.principal_usuario_id=uid AND p.id=target AND t.id=caller.tenant_id) THEN RAISE EXCEPTION 'Acesso negado.' USING ERRCODE='42501'; END IF;
  END IF;
  SELECT lim.devices INTO quota FROM public.profiles p CROSS JOIN LATERAL private.plan_access_limits(p.tenant_id) lim WHERE p.id=target;
  RETURN jsonb_build_object('limit',quota,'devices',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'id',d.id,'name',d.label,'created_at',d.created_at,'last_seen_at',d.last_seen_at,'revoked_at',d.revoked_at,
    'suspended',d.revoked_at IS NULL AND (SELECT count(*) FROM private.login_devices older WHERE older.user_id=target AND older.revoked_at IS NULL AND (older.created_at,older.id)<=(d.created_at,d.id))>quota,
    'current',EXISTS(SELECT 1 FROM private.login_sessions s WHERE s.device_id=d.id AND s.session_id=nullif(auth.jwt()->>'session_id','')::uuid)) ORDER BY d.created_at,d.id)
    FROM private.login_devices d WHERE d.user_id=target),'[]'::jsonb));
END $$;
CREATE FUNCTION public.revogar_dispositivo(p_dispositivo_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); dev private.login_devices%ROWTYPE; company uuid;
BEGIN
  SELECT d.* INTO dev FROM private.login_devices d WHERE d.id=p_dispositivo_id FOR UPDATE;
  IF uid IS NULL OR NOT FOUND THEN RAISE EXCEPTION 'Dispositivo não disponível.'; END IF;
  SELECT tenant_id INTO company FROM public.profiles WHERE id=dev.user_id;
  IF dev.user_id<>uid THEN
    PERFORM private.require_authorized_session();
    IF NOT EXISTS(SELECT 1 FROM public.tenants WHERE id=company AND principal_usuario_id=uid) THEN RAISE EXCEPTION 'Acesso negado.' USING ERRCODE='42501'; END IF;
  END IF;
  UPDATE private.login_devices SET revoked_at=now() WHERE id=dev.id AND revoked_at IS NULL;
  IF FOUND THEN INSERT INTO private.access_audit(tenant_id,actor_id,subject_id,action,details)
    VALUES(company,uid,dev.user_id,'device_revoked',jsonb_build_object('device_id',dev.id)); END IF;
END $$;
CREATE FUNCTION public.limites_acesso() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.profiles%ROWTYPE; t public.tenants%ROWTYPE; lim record; used integer;
BEGIN
  PERFORM private.require_authorized_session();
  SELECT * INTO p FROM public.profiles WHERE id=auth.uid();
  SELECT * INTO t FROM public.tenants WHERE id=p.tenant_id;
  SELECT * INTO lim FROM private.plan_access_limits(t.id);
  SELECT count(*) INTO used FROM public.profiles WHERE tenant_id=t.id AND ativo AND id IS DISTINCT FROM t.principal_usuario_id;
  RETURN jsonb_build_object('plan',lim.plan_name,'sublogin_limit',lim.sublogins,'device_limit',lim.devices,
    'sublogins_active',used,'sublogins_available',greatest(0,lim.sublogins-used),'sublogins_suspended',greatest(0,used-lim.sublogins),'owner_id',t.principal_usuario_id,
    'suspended_ids',CASE WHEN t.principal_usuario_id=auth.uid() THEN coalesce((SELECT jsonb_agg(id) FROM public.profiles WHERE tenant_id=t.id AND ativo AND NOT private.user_within_plan(id)),'[]'::jsonb) ELSE '[]'::jsonb END);
END $$;
CREATE FUNCTION public.gerenciar_funcionario(p_usuario_id uuid,p_nome text,p_setor text,p_ativo boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE company uuid; oldrole text;
BEGIN
  PERFORM private.require_authorized_session();
  SELECT t.id INTO company FROM public.tenants t JOIN public.profiles p ON p.tenant_id=t.id AND p.id=auth.uid()
    WHERE t.principal_usuario_id=auth.uid() AND t.ativo AND p.ativo AND p.papel='AdministradorTenant' AND p.setor IS NULL FOR UPDATE OF t;
  IF company IS NULL OR p_usuario_id=auth.uid() OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_usuario_id AND tenant_id=company) THEN RAISE EXCEPTION 'Funcionário não disponível nesta empresa.' USING ERRCODE='42501'; END IF;
  IF length(trim(coalesce(p_nome,''))) NOT BETWEEN 2 AND 120 OR p_ativo IS NULL OR p_setor IS NULL OR p_setor NOT IN ('corte','montagem','acabamento','instalacao','estoque','financeiro') THEN RAISE EXCEPTION 'Informe nome, setor e situação válidos.'; END IF;
  oldrole:=current_setting('request.jwt.claim.role',true);
  PERFORM set_config('request.jwt.claim.role','service_role',true);
  UPDATE public.profiles SET nome_completo=trim(p_nome),setor=p_setor,ativo=p_ativo,
    papel=CASE p_setor WHEN 'estoque' THEN 'Estoque' WHEN 'financeiro' THEN 'Financeiro' ELSE 'Instalador' END
    WHERE id=p_usuario_id AND tenant_id=company;
  PERFORM set_config('request.jwt.claim.role',coalesce(oldrole,''),true);
END $$;
CREATE FUNCTION public.historico_acessos() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE company uuid;
BEGIN
  PERFORM private.require_authorized_session();
  SELECT id INTO company FROM public.tenants WHERE principal_usuario_id=auth.uid();
  IF company IS NULL THEN RAISE EXCEPTION 'Somente o administrador pode consultar o histórico.'; END IF;
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(a)) FROM (SELECT id,actor_id,subject_id,action,details,created_at FROM private.access_audit WHERE tenant_id=company ORDER BY id DESC LIMIT 100) a),'[]'::jsonb);
END $$;

CREATE FUNCTION private.audit_plan_access() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NEW.principal_usuario_id IS DISTINCT FROM OLD.principal_usuario_id AND auth.role()='authenticated' THEN RAISE EXCEPTION 'Alteração da conta principal não permitida.' USING ERRCODE='42501'; END IF;
  IF NEW.plano IS DISTINCT FROM OLD.plano THEN
    IF auth.role()='authenticated' AND NOT private.is_saas_super_admin() THEN RAISE EXCEPTION 'Alteração de plano não autorizada.' USING ERRCODE='42501'; END IF;
    INSERT INTO private.access_audit(tenant_id,actor_id,action,details) VALUES(NEW.id,auth.uid(),'plan_changed',jsonb_build_object('before',OLD.plano,'after',NEW.plano));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER audit_plan_access BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION private.audit_plan_access();
CREATE FUNCTION private.audit_plan_limits() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF (NEW.limite_sublogins,NEW.limite_dispositivos) IS DISTINCT FROM (OLD.limite_sublogins,OLD.limite_dispositivos) THEN
    INSERT INTO private.access_audit(tenant_id,actor_id,action,details)
    SELECT t.id,auth.uid(),'plan_limits_changed',jsonb_build_object('sublogins_before',OLD.limite_sublogins,'sublogins_after',NEW.limite_sublogins,'devices_before',OLD.limite_dispositivos,'devices_after',NEW.limite_dispositivos)
    FROM public.tenants t CROSS JOIN LATERAL private.plan_access_limits(t.id) lim WHERE lim.plan_name=NEW.nome;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER audit_plan_limits AFTER UPDATE OF limite_sublogins,limite_dispositivos ON public.saas_planos FOR EACH ROW EXECUTE FUNCTION private.audit_plan_limits();
REVOKE ALL ON FUNCTION private.audit_plan_limits() FROM PUBLIC,anon,authenticated;

-- Apply the device gate to all authenticated business-table policies, including
-- legacy permissive policies. Bootstrap/device RPCs deliberately use private reads.
DO $$ DECLARE tab record; BEGIN
  FOR tab IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_attribute a ON a.attrelid=c.oid AND a.attname='tenant_id' AND NOT a.attisdropped
    WHERE n.nspname='public' AND c.relkind='r'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',tab.relname);
    EXECUTE format('CREATE POLICY authorized_login_session ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT private.device_session_allowed())) WITH CHECK ((SELECT private.device_session_allowed()))',tab.relname);
  END LOOP;
END $$;
CREATE POLICY authorized_login_session ON public.tenants AS RESTRICTIVE FOR ALL TO authenticated
USING ((SELECT private.device_session_allowed())) WITH CHECK ((SELECT private.device_session_allowed()));
CREATE POLICY authorized_login_session ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
USING ((SELECT private.device_session_allowed())) WITH CHECK ((SELECT private.device_session_allowed()));

-- SECURITY DEFINER APIs bypass RLS, so guard their entry explicitly as well.
DO $$ DECLARE fn record; definition text; BEGIN
  FOR fn IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('admin_ativar_plano_empresa','admin_excluir_empresa','encaminhar_projeto_setor','estoque_cadastrar_item','estoque_registrar_movimento','financeiro_criar_lancamento','financeiro_registrar_baixa')
  LOOP
    SELECT pg_get_functiondef(fn.oid) INTO definition;
    IF fn.proname='admin_ativar_plano_empresa' THEN
      definition:=replace(definition,'plano = lower(trim(v_plano.nome)),',
        'plano = CASE v_plano.nome WHEN ''Premium/Plus'' THEN ''empresarial'' WHEN ''Profissional'' THEN ''standard'' WHEN ''Básico'' THEN ''free'' ELSE lower(trim(v_plano.nome)) END,');
    END IF;
    definition:=regexp_replace(definition,'\mBEGIN\M',E'BEGIN\n  PERFORM private.require_authorized_session();','i');
    EXECUTE definition;
  END LOOP;
  SELECT pg_get_functiondef('public.meu_setor_projetos()'::regprocedure) INTO definition;
  definition:=replace(definition,'WHERE perfil.id=auth.uid()','WHERE private.device_session_allowed() AND perfil.id=auth.uid()');
  EXECUTE definition;
END $$;

REVOKE ALL ON FUNCTION private.plan_access_limits(uuid),private.user_within_plan(uuid),private.user_session_allowed(uuid,uuid),private.device_session_allowed(),private.require_authorized_session(),private.enforce_sublogin_limit(),private.audit_profile_access(),private.audit_plan_access() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.device_session_allowed() TO authenticated;
REVOKE ALL ON FUNCTION public.autorizar_dispositivo(uuid,text),public.listar_dispositivos(uuid),public.revogar_dispositivo(uuid),public.limites_acesso(),public.gerenciar_funcionario(uuid,text,text,boolean),public.historico_acessos() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.autorizar_dispositivo(uuid,text),public.listar_dispositivos(uuid),public.revogar_dispositivo(uuid),public.limites_acesso(),public.gerenciar_funcionario(uuid,text,text,boolean),public.historico_acessos() TO authenticated;

COMMIT;
