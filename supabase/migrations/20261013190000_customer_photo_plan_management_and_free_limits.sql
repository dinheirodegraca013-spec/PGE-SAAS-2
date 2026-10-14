-- =========================================================================
-- PGE SAAS 2 — MIGRAÇÃO: FOTO DO CLIENTE, GESTÃO DE PLANOS & LIMITES FREE
-- Versão: 20261013190000
-- =========================================================================

BEGIN;

-- 1. ADICIONA avatar_url EM profiles E logo_url EM tenants
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Concede privilégio de UPDATE nestas colunas para usuários autenticados
GRANT UPDATE (avatar_url) ON public.profiles TO authenticated;
GRANT UPDATE (logo_url) ON public.tenants TO authenticated;

-- 2. POPULA PLANOS PADRÃO DO SAAS SE AINDA NÃO EXISTIREM
INSERT INTO public.saas_planos (id, nome, descricao, preco, periodicidade, status, recursos, ordem)
VALUES
  (
    'plano_free',
    'Free',
    'Para testar o sistema e pequenos negócios.',
    0.00,
    'mensal',
    'ativo',
    '["Até 10 clientes cadastrados", "1 usuário na equipe", "Até 5 projetos de marcenaria", "Módulo de Móveis Planejados", "Suporte por e-mail"]'::jsonb,
    0
  ),
  (
    'plano_standard',
    'Standard',
    'Para marcenarias em operação, com equipe.',
    89.90,
    'mensal',
    'ativo',
    '["Clientes ilimitados", "Até 5 usuários", "Projetos de móveis ilimitados", "Integração oficial WhatsApp", "Relatórios e orçamentos em PDF", "Suporte prioritário"]'::jsonb,
    1
  ),
  (
    'plano_empresarial',
    'Empresarial',
    'Para operações maiores com múltiplas equipes.',
    199.90,
    'mensal',
    'ativo',
    '["Tudo do plano Standard", "Usuários ilimitados", "Múltiplos módulos de negócio", "Controle avançado de permissões", "Suporte dedicado 24/7"]'::jsonb,
    2
  )
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  preco = EXCLUDED.preco,
  periodicidade = EXCLUDED.periodicidade,
  status = EXCLUDED.status,
  recursos = EXCLUDED.recursos,
  ordem = EXCLUDED.ordem;

-- 3. CONFIGURA BUCKET DE AVATARES NO SUPABASE STORAGE SE O ESQUEMA STORAGE EXISTIR
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    -- Cria o bucket avatars
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'avatars',
      'avatars',
      true,
      5242880,
      ARRAY['image/jpeg', 'image/png', 'image/webp']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = true,
      file_size_limit = 5242880,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

    -- Políticas de segurança no storage.objects
    DROP POLICY IF EXISTS "avatars_public_select" ON storage.objects;
    CREATE POLICY "avatars_public_select" ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = 'avatars');

    DROP POLICY IF EXISTS "avatars_authenticated_insert" ON storage.objects;
    CREATE POLICY "avatars_authenticated_insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'avatars');

    DROP POLICY IF EXISTS "avatars_authenticated_update" ON storage.objects;
    CREATE POLICY "avatars_authenticated_update" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

    DROP POLICY IF EXISTS "avatars_authenticated_delete" ON storage.objects;
    CREATE POLICY "avatars_authenticated_delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
  END IF;
END $$;

-- 4. ATUALIZA A TRIGGER DE PROTEÇÃO DO TENANT PARA PERMITIR MUDANÇAS CONTROLADAS VIA FUNÇÃO AUTORIZADA
CREATE OR REPLACE FUNCTION private.protect_tenant_privilege_self_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.is_saas_super_admin()
     AND current_setting('pge.allow_system_plan_update', true) IS DISTINCT FROM 'true'
     AND (
       NEW.id IS DISTINCT FROM OLD.id OR
       NEW.plano IS DISTINCT FROM OLD.plano OR
       NEW.status IS DISTINCT FROM OLD.status OR
       NEW.ativo IS DISTINCT FROM OLD.ativo OR
       NEW.created_at IS DISTINCT FROM OLD.created_at
     )
  THEN
    RAISE EXCEPTION 'Não é permitido alterar identificador, plano ou status da assinatura da empresa.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- 5. ATUALIZA handle_new_pge_user PARA VINCULAR AUTOMATICAMENTE ASSINATURA FREE NO CADASTRO
CREATE OR REPLACE FUNCTION private.handle_new_pge_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id uuid;
  v_email text;
  v_name text;
  v_razao text;
  v_fantasia text;
  v_plano text;
  v_free_plano_id text;
BEGIN
  v_email := coalesce(new.email, '');
  v_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'nome_completo', '')), '');
  if v_name is null then
    v_name := coalesce(nullif(split_part(v_email, '@', 1), ''), 'Administrador');
  end if;

  v_razao := nullif(trim(coalesce(new.raw_user_meta_data ->> 'razao_social', '')), '');
  if v_razao is null then
    v_razao := coalesce(nullif(split_part(v_email, '@', 1), ''), 'Empresa');
  end if;

  v_fantasia := nullif(trim(coalesce(new.raw_user_meta_data ->> 'nome_fantasia', '')), '');
  v_plano := lower(coalesce(new.raw_user_meta_data ->> 'plano', 'free'));
  if v_plano not in ('free','standard','empresarial') then
    v_plano := 'free';
  end if;

  -- Formata nome canônico
  IF v_plano = 'free' THEN
    v_plano := 'Free';
  ELSIF v_plano = 'empresarial' THEN
    v_plano := 'Empresarial';
  ELSE
    v_plano := 'Standard';
  END IF;

  INSERT INTO public.tenants (razao_social, nome_fantasia, plano)
  VALUES (v_razao, v_fantasia, v_plano)
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.profiles (id, tenant_id, nome_completo, email, papel, ativo)
  VALUES (new.id, v_tenant_id, v_name, v_email, 'AdministradorTenant', true);

  -- Se o cadastro for no plano Free, vincula automaticamente a assinatura ativa gratuita
  IF v_plano = 'Free' THEN
    SELECT id INTO v_free_plano_id
    FROM public.saas_planos
    WHERE lower(nome) = 'free' OR preco = 0
    LIMIT 1;

    IF v_free_plano_id IS NULL THEN
      v_free_plano_id := 'plano_free';
    END IF;

    INSERT INTO public.saas_assinaturas (
      tenant_id,
      plano_id,
      status,
      valor,
      periodicidade,
      data_inicio,
      data_proximo_vencimento
    )
    VALUES (
      v_tenant_id,
      v_free_plano_id,
      'ativa',
      0.00,
      'mensal',
      timezone('utc'::text, now()),
      timezone('utc'::text, now() + interval '100 years')
    );
  END IF;

  RETURN new;
END;
$$;

-- 6. FUNÇÃO SEGURA: MIGRAR / RETORNAR PARA O PLANO FREE (R$ 0)
CREATE OR REPLACE FUNCTION public.migrar_para_plano_free()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID;
  v_tenant_id UUID;
  v_role TEXT;
  v_free_plano_id TEXT;
  v_plano_antigo TEXT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado.');
  END IF;

  SELECT p.tenant_id, p.papel INTO v_tenant_id, v_role
  FROM public.profiles p
  WHERE p.id = v_uid AND p.ativo = true
  LIMIT 1;

  IF v_tenant_id IS NULL OR v_role NOT IN ('AdministradorTenant', 'SuperAdmin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permissão insuficiente. Apenas administradores do tenant podem alterar o plano.');
  END IF;

  SELECT plano INTO v_plano_antigo
  FROM public.tenants
  WHERE id = v_tenant_id;

  -- Busca ID do plano Free
  SELECT id INTO v_free_plano_id
  FROM public.saas_planos
  WHERE lower(nome) = 'free' OR preco = 0
  ORDER BY preco ASC
  LIMIT 1;

  IF v_free_plano_id IS NULL THEN
    v_free_plano_id := 'plano_free';
  END IF;

  -- Habilita flag de migração permitida durante a transação
  PERFORM set_config('pge.allow_system_plan_update', 'true', true);

  -- Atualiza o tenant para Free
  UPDATE public.tenants
  SET plano = 'Free'
  WHERE id = v_tenant_id;

  -- Atualiza assinatura existente ou insere uma nova
  UPDATE public.saas_assinaturas
  SET
    plano_id = v_free_plano_id,
    status = 'ativa',
    valor = 0.00,
    periodicidade = 'mensal',
    data_proximo_vencimento = timezone('utc'::text, now() + interval '100 years'),
    updated_at = timezone('utc'::text, now())
  WHERE tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    INSERT INTO public.saas_assinaturas (
      tenant_id,
      plano_id,
      status,
      valor,
      periodicidade,
      data_inicio,
      data_proximo_vencimento
    )
    VALUES (
      v_tenant_id,
      v_free_plano_id,
      'ativa',
      0.00,
      'mensal',
      timezone('utc'::text, now()),
      timezone('utc'::text, now() + interval '100 years')
    );
  END IF;

  -- Registra auditoria
  INSERT INTO public.saas_audit_logs (
    usuario_id,
    usuario_email,
    papel_operador,
    acao,
    modulo,
    registro_id,
    detalhes
  )
  VALUES (
    v_uid,
    (SELECT email FROM public.profiles WHERE id = v_uid),
    v_role,
    'MUDANCA_PLANO_FREE',
    'Assinaturas',
    v_tenant_id::text,
    jsonb_build_object('plano_antigo', v_plano_antigo, 'novo_plano', 'Free', 'valor', 0.00)
  );

  RETURN jsonb_build_object('success', true, 'plano', 'Free');
END;
$$;

GRANT EXECUTE ON FUNCTION public.migrar_para_plano_free() TO authenticated;

-- 7. FUNÇÃO SEGURA: SOLICITAR CONTRATAÇÃO / UPGRADE DE PLANO PAGO
CREATE OR REPLACE FUNCTION public.solicitar_upgrade_plano(
  p_novo_plano_id TEXT,
  p_observacoes TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID;
  v_tenant_id UUID;
  v_role TEXT;
  v_plano_nome TEXT;
  v_plano_preco NUMERIC;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado.');
  END IF;

  SELECT p.tenant_id, p.papel INTO v_tenant_id, v_role
  FROM public.profiles p
  WHERE p.id = v_uid AND p.ativo = true
  LIMIT 1;

  IF v_tenant_id IS NULL OR v_role NOT IN ('AdministradorTenant', 'SuperAdmin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permissão insuficiente. Apenas administradores do tenant podem solicitar mudança.');
  END IF;

  SELECT nome, preco INTO v_plano_nome, v_plano_preco
  FROM public.saas_planos
  WHERE id = p_novo_plano_id;

  IF v_plano_nome IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plano solicitado não encontrado.');
  END IF;

  -- Registra no histórico de auditoria
  INSERT INTO public.saas_audit_logs (
    usuario_id,
    usuario_email,
    papel_operador,
    acao,
    modulo,
    registro_id,
    detalhes
  )
  VALUES (
    v_uid,
    (SELECT email FROM public.profiles WHERE id = v_uid),
    v_role,
    'SOLICITACAO_UPGRADE_PLANO',
    'Planos',
    v_tenant_id::text,
    jsonb_build_object(
      'plano_solicitado', v_plano_nome,
      'plano_id', p_novo_plano_id,
      'preco', v_plano_preco,
      'observacoes', p_observacoes
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'plano', v_plano_nome,
    'preco', v_plano_preco,
    'mensagem', 'Solicitação de contratação registrada com sucesso.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.solicitar_upgrade_plano(TEXT, TEXT) TO authenticated;

COMMIT;
