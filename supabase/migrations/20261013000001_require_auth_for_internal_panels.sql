-- Hardening adicional para os painéis internos do PGE SaaS.
-- A autenticação exige sessão Supabase; as permissões administrativas vêm
-- exclusivamente da tabela saas_usuarios_internos e são verificadas por RLS.

DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename LIKE 'saas_%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon', t.tablename);
  END LOOP;
END $$;

-- O acesso anônimo fica restrito à leitura dos planos públicos ativos.
GRANT SELECT ON TABLE public.saas_planos, public.saas_planos_links TO anon;

-- Usuário pode consultar seu próprio registro para carregar a permissão,
-- mas só Super Admin pode criar/alterar/excluir permissões internas.
DROP POLICY IF EXISTS saas_usuarios_internos_admin ON public.saas_usuarios_internos;
CREATE POLICY saas_usuarios_internos_admin
ON public.saas_usuarios_internos
FOR ALL
TO authenticated
USING (
  private.is_saas_super_admin()
  OR user_id = (SELECT auth.uid())
)
WITH CHECK (private.is_saas_super_admin());
