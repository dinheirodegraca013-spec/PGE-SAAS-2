BEGIN;

ALTER TABLE public.profiles ADD COLUMN setor text;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_setor_check CHECK (
  setor IS NULL OR setor IN ('corte','montagem','acabamento','instalacao','estoque','financeiro')
);
-- Existing accounts keep their current access. Newly provisioned employees always have a sector.
ALTER TABLE public.profiles ADD CONSTRAINT profiles_setor_papel_check CHECK (
  setor IS NULL OR papel = CASE setor WHEN 'estoque' THEN 'Estoque' WHEN 'financeiro' THEN 'Financeiro' ELSE 'Instalador' END
);

CREATE FUNCTION private.current_employee_sector() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT setor FROM public.profiles WHERE id = auth.uid() AND ativo = true;
$$;
REVOKE ALL ON FUNCTION private.current_employee_sector() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_employee_sector() TO authenticated;

-- Restrictive policies compose with existing tenant policies: a broad permissive policy
-- cannot accidentally reopen business data to sector accounts.
CREATE FUNCTION private.employee_table_access(p_table text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND ativo = true) THEN false
    WHEN private.current_employee_sector() IS NULL THEN true
    WHEN p_table = 'profiles' THEN true
    WHEN private.current_employee_sector() = 'estoque' THEN p_table IN ('estoque_itens','estoque_movimentacoes')
    WHEN private.current_employee_sector() = 'financeiro' THEN p_table IN ('financeiro_lancamentos','financeiro_baixas','projetos_marcenaria')
    ELSE false END;
$$;
REVOKE ALL ON FUNCTION private.employee_table_access(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.employee_table_access(text) TO authenticated;

DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT c.relname FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid AND a.attname='tenant_id' AND NOT a.attisdropped
    WHERE n.nspname='public' AND c.relkind='r'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.relname);
    EXECUTE format('CREATE POLICY employee_sector_boundary ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (private.employee_table_access(%L)) WITH CHECK (private.employee_table_access(%L))',t.relname,t.relname,t.relname);
  END LOOP;
END $$;

-- Only the caller's own profile is readable by a sector account, even if legacy
-- policies later grant additional same-tenant profile access.
CREATE POLICY employee_own_profile ON public.profiles AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (private.current_employee_sector() IS NULL OR id = auth.uid())
  WITH CHECK (private.current_employee_sector() IS NULL OR id = auth.uid());

CREATE FUNCTION private.protect_employee_sector() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.setor IS DISTINCT FROM OLD.setor AND auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'O setor deve ser alterado pelo serviço administrativo.' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_employee_sector BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.protect_employee_sector();
REVOKE ALL ON FUNCTION private.protect_employee_sector() FROM PUBLIC, anon, authenticated;

-- Preserve the latest owner-signup implementation, including plan provisioning.
-- Insert an early employee branch using server-only app_metadata, never user_metadata.
DO $$ DECLARE definition text; BEGIN
  SELECT pg_get_functiondef('private.handle_new_pge_user()'::regprocedure) INTO definition;
  IF position('gestio_employee' IN definition) > 0 THEN
    RAISE EXCEPTION 'Employee provisioning branch already exists; review migration state.';
  END IF;
  definition := regexp_replace(definition, '\mBEGIN\M', $branch$
BEGIN
  IF NEW.raw_app_meta_data ->> 'gestio_employee' = 'true' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles p JOIN public.tenants t ON t.id = p.tenant_id
      WHERE p.id::text = NEW.raw_app_meta_data ->> 'gestio_criado_por'
        AND p.tenant_id::text = NEW.raw_app_meta_data ->> 'gestio_tenant_id'
        AND p.ativo = true AND p.papel = 'AdministradorTenant' AND p.setor IS NULL AND t.ativo = true
    ) OR coalesce(NEW.raw_app_meta_data ->> 'gestio_setor','') NOT IN ('corte','montagem','acabamento','instalacao','estoque','financeiro') THEN
      RAISE EXCEPTION 'Provisionamento de funcionário não autorizado.' USING ERRCODE='42501';
    END IF;
    INSERT INTO public.profiles(id,tenant_id,nome_completo,email,papel,ativo,setor)
      SELECT NEW.id, p.tenant_id, NEW.raw_user_meta_data ->> 'nome_completo', NEW.email,
        CASE NEW.raw_app_meta_data ->> 'gestio_setor' WHEN 'estoque' THEN 'Estoque' WHEN 'financeiro' THEN 'Financeiro' ELSE 'Instalador' END,
        true, NEW.raw_app_meta_data ->> 'gestio_setor'
      FROM public.profiles p WHERE p.id::text = NEW.raw_app_meta_data ->> 'gestio_criado_por';
    RETURN NEW;
  END IF;
$branch$, 'i');
  EXECUTE definition;
END $$;

-- Explicit routing avoids exposing budgets, customer contact details or all projects
-- to production workers. IDs use text so this works with UUID and legacy text IDs.
CREATE TABLE public.projetos_setores (
  projeto_id text PRIMARY KEY,
  tenant_id text NOT NULL,
  setor text NOT NULL CHECK (setor IN ('corte','montagem','acabamento','instalacao','estoque','financeiro')),
  encaminhado_por uuid NOT NULL REFERENCES auth.users(id),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.projetos_setores ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.projetos_setores FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.encaminhar_projeto_setor(p_projeto_id text, p_setor text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE administrador public.profiles%ROWTYPE;
BEGIN
  SELECT p.* INTO administrador FROM public.profiles p JOIN public.tenants t ON t.id=p.tenant_id
    WHERE p.id=auth.uid() AND p.ativo AND t.ativo AND p.papel='AdministradorTenant' AND p.setor IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Somente o administrador da empresa pode encaminhar projetos.' USING ERRCODE='42501'; END IF;
  IF p_setor NOT IN ('corte','montagem','acabamento','instalacao','estoque','financeiro') OR p_setor IS NULL THEN RAISE EXCEPTION 'Setor inválido.'; END IF;
  PERFORM 1 FROM public.projetos_marcenaria WHERE id::text=p_projeto_id AND tenant_id=administrador.tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Projeto não disponível nesta empresa.' USING ERRCODE='42501'; END IF;
  INSERT INTO public.projetos_setores(projeto_id,tenant_id,setor,encaminhado_por)
    VALUES(p_projeto_id,administrador.tenant_id::text,p_setor,administrador.id)
    ON CONFLICT(projeto_id) DO UPDATE SET setor=excluded.setor,encaminhado_por=excluded.encaminhado_por,atualizado_em=now()
      WHERE projetos_setores.tenant_id=excluded.tenant_id;
END $$;

CREATE FUNCTION public.meu_setor_projetos() RETURNS TABLE(id text,titulo text,prazo text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT projeto.id::text, coalesce(projeto.titulo,to_jsonb(projeto)->>'nome'), left(coalesce(to_jsonb(projeto)->>'data_prevista_entrega',to_jsonb(projeto)->>'data_entrega',to_jsonb(projeto)->>'prazo'),10)
  FROM public.profiles perfil JOIN public.tenants empresa ON empresa.id=perfil.tenant_id
  JOIN public.projetos_setores destino ON destino.tenant_id=perfil.tenant_id::text AND destino.setor=perfil.setor
  JOIN public.projetos_marcenaria projeto ON projeto.id::text=destino.projeto_id AND projeto.tenant_id=perfil.tenant_id
  WHERE perfil.id=auth.uid() AND perfil.ativo AND empresa.ativo
  ORDER BY destino.atualizado_em DESC;
$$;
REVOKE ALL ON FUNCTION public.encaminhar_projeto_setor(text,text), public.meu_setor_projetos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.encaminhar_projeto_setor(text,text), public.meu_setor_projetos() TO authenticated;

COMMIT;
