ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS data_contratacao timestamptz, ADD COLUMN IF NOT EXISTS inicio_utilizacao timestamptz;
COMMENT ON COLUMN public.tenants.data_contratacao IS 'Data da contratação confirmada manualmente pelo Super Admin.';
COMMENT ON COLUMN public.tenants.inicio_utilizacao IS 'Data de liberação de acesso pelo Super Admin.';

CREATE OR REPLACE FUNCTION public.admin_ativar_plano_empresa(p_tenant_id uuid, p_plano_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 v_now timestamptz := now(); v_tenant public.tenants%ROWTYPE; v_plano public.saas_planos%ROWTYPE;
 v_assinatura public.saas_assinaturas%ROWTYPE; v_vencimento timestamptz; v_email text;
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_saas_super_admin() THEN RAISE EXCEPTION 'Apenas o Super Admin pode ativar planos.'; END IF;
 SELECT * INTO v_tenant FROM public.tenants WHERE id=p_tenant_id AND coalesce(razao_social,'') NOT LIKE '[EXCLUÍDA] %' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Empresa não encontrada ou arquivada.'; END IF;
 SELECT * INTO v_plano FROM public.saas_planos WHERE id=p_plano_id AND status='ativo';
 IF NOT FOUND THEN RAISE EXCEPTION 'Plano não encontrado ou inativo.'; END IF;
 IF lower(trim(v_plano.nome)) NOT IN ('free','standard','empresarial') THEN RAISE EXCEPTION 'Nome de plano incompatível.'; END IF;
 v_vencimento := CASE lower(coalesce(v_plano.periodicidade,'mensal')) WHEN 'trimestral' THEN v_now+interval '3 months' WHEN 'semestral' THEN v_now+interval '6 months' WHEN 'anual' THEN v_now+interval '1 year' ELSE v_now+interval '1 month' END;
 UPDATE public.tenants SET plano=lower(trim(v_plano.nome)), ativo=true, data_contratacao=coalesce(data_contratacao,v_now), inicio_utilizacao=coalesce(inicio_utilizacao,v_now), updated_at=v_now WHERE id=p_tenant_id;
 SELECT * INTO v_assinatura FROM public.saas_assinaturas WHERE tenant_id=p_tenant_id AND status IN ('ativa','pendente','suspensa') ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF FOUND THEN
  UPDATE public.saas_assinaturas SET plano_id=v_plano.id,status='ativa',valor=v_plano.preco,periodicidade=v_plano.periodicidade,
   data_inicio=CASE WHEN v_assinatura.status='ativa' AND v_assinatura.plano_id=v_plano.id THEN v_assinatura.data_inicio ELSE v_now END,
   data_proximo_vencimento=CASE WHEN v_assinatura.status='ativa' AND v_assinatura.plano_id=v_plano.id THEN v_assinatura.data_proximo_vencimento ELSE v_vencimento END,
   cancelada_em=NULL,motivo_cancelamento=NULL,updated_at=v_now WHERE id=v_assinatura.id RETURNING * INTO v_assinatura;
 ELSE
  INSERT INTO public.saas_assinaturas(tenant_id,plano_id,status,valor,periodicidade,data_inicio,data_proximo_vencimento,created_at,updated_at)
  VALUES(p_tenant_id,v_plano.id,'ativa',v_plano.preco,v_plano.periodicidade,v_now,v_vencimento,v_now,v_now) RETURNING * INTO v_assinatura;
 END IF;
 SELECT email INTO v_email FROM auth.users WHERE id=auth.uid();
 INSERT INTO public.saas_audit_logs(usuario_id,usuario_email,papel_operador,acao,modulo,registro_id,detalhes,created_at)
 VALUES(auth.uid(),v_email,'SuperAdmin','ATIVAR_PLANO_EMPRESA','Assinaturas',p_tenant_id::text,
  jsonb_build_object('empresa',v_tenant.razao_social,'plano_anterior',v_tenant.plano,'plano_novo',v_plano.nome,'valor',v_plano.preco,'periodicidade',v_plano.periodicidade,'data_contratacao',coalesce(v_tenant.data_contratacao,v_now),'inicio_utilizacao',coalesce(v_tenant.inicio_utilizacao,v_now),'assinatura_id',v_assinatura.id,'nota','Ativação manual; pagamento deve ser conferido separadamente.'),v_now);
 RETURN jsonb_build_object('success',true,'message','Plano ativado e datas registradas.','assinatura_id',v_assinatura.id,'data_contratacao',coalesce(v_tenant.data_contratacao,v_now),'inicio_utilizacao',coalesce(v_tenant.inicio_utilizacao,v_now),'data_proximo_vencimento',v_assinatura.data_proximo_vencimento);
END; $$;
REVOKE ALL ON FUNCTION public.admin_ativar_plano_empresa(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_ativar_plano_empresa(uuid,text) TO authenticated;
