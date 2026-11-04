BEGIN;
-- The legacy normalizer downgraded the display name Premium/Plus to free.
-- Reconcile only contracts already marked active; do not activate pending sales.
WITH contracted AS (
  SELECT DISTINCT ON (a.tenant_id) a.tenant_id,sp.nome
  FROM public.saas_assinaturas a JOIN public.saas_planos sp ON sp.id=a.plano_id
  WHERE a.status='ativa' AND sp.nome IN ('Básico','Profissional','Premium/Plus')
  ORDER BY a.tenant_id,a.created_at DESC,a.id DESC
)
UPDATE public.tenants t SET plano=CASE c.nome WHEN 'Premium/Plus' THEN 'empresarial' WHEN 'Profissional' THEN 'standard' ELSE 'free' END,updated_at=now()
FROM contracted c WHERE t.id=c.tenant_id AND t.ativo AND t.plano_solicitado_id IS NULL
AND t.plano IS DISTINCT FROM CASE c.nome WHEN 'Premium/Plus' THEN 'empresarial' WHEN 'Profissional' THEN 'standard' ELSE 'free' END;

-- Enable only after the compatible frontend and backend have been deployed.
UPDATE private.access_settings SET devices_enabled=true WHERE id;
INSERT INTO private.access_audit(tenant_id,action,details)
SELECT id,'plan_limits_changed','{"device_control_enabled":true,"downgrade_order":"created_at,id"}'::jsonb
FROM public.tenants WHERE principal_usuario_id IS NOT NULL AND ativo;
COMMIT;
