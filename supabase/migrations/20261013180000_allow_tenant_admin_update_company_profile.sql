-- Migration: Permitir que administradores de tenant atualizem os dados cadastrais da empresa
-- (razao_social, nome_fantasia, documento) sem alterar campos críticos do SaaS (plano, ativo, status).

BEGIN;

-- 1. Garante que authenticated possui privilégio de UPDATE em colunas cadastrais da tabela tenants
GRANT UPDATE (razao_social, nome_fantasia, documento) ON public.tenants TO authenticated;

-- 2. Política RLS permitindo que o administrador do próprio tenant atualize sua empresa
DROP POLICY IF EXISTS tenant_members_update_own_tenant ON public.tenants;
CREATE POLICY tenant_members_update_own_tenant ON public.tenants
  FOR UPDATE TO authenticated
  USING (
    id = (SELECT private.current_tenant_id())
    AND (SELECT private.current_user_role()) IN ('AdministradorTenant', 'SuperAdmin')
  )
  WITH CHECK (
    id = (SELECT private.current_tenant_id())
    AND (SELECT private.current_user_role()) IN ('AdministradorTenant', 'SuperAdmin')
  );

-- 3. Trigger protetor contra alteração indevida de campos protegidos do tenant (plano, status, ativo)
CREATE OR REPLACE FUNCTION private.protect_tenant_privilege_self_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.is_saas_super_admin() AND (
    NEW.id IS DISTINCT FROM OLD.id OR
    NEW.plano IS DISTINCT FROM OLD.plano OR
    NEW.status IS DISTINCT FROM OLD.status OR
    NEW.ativo IS DISTINCT FROM OLD.ativo OR
    NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Não é permitido alterar identificador, plano ou status da assinatura da empresa.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.protect_tenant_privilege_self_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_tenant_privilege_self_change ON public.tenants;
CREATE TRIGGER protect_tenant_privilege_self_change
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION private.protect_tenant_privilege_self_change();

COMMIT;
