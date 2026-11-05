-- Suspended employees must fail the same server-side gate as inactive users.
CREATE OR REPLACE FUNCTION private.user_within_plan(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT coalesce((SELECT p.ativo
      AND NOT coalesce(p.suspenso, false)
      AND t.ativo
      AND (p.id=t.principal_usuario_id OR
        (SELECT count(*) FROM public.profiles other
         WHERE other.tenant_id=p.tenant_id
           AND other.ativo
           AND NOT coalesce(other.suspenso, false)
           AND other.id IS DISTINCT FROM t.principal_usuario_id
           AND (other.created_at,other.id)<=(p.created_at,p.id))<=lim.sublogins)
    FROM public.profiles p
    JOIN public.tenants t ON t.id=p.tenant_id
    CROSS JOIN LATERAL private.plan_access_limits(t.id) lim
    WHERE p.id=p_user),false);
$$;

REVOKE ALL ON FUNCTION private.user_within_plan(uuid) FROM PUBLIC, anon, authenticated;

