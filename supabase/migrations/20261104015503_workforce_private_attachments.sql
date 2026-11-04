BEGIN;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  VALUES('workforce-private','workforce-private',false,10485760,ARRAY['image/jpeg','image/png','image/webp','application/pdf']);
CREATE TABLE private.workforce_attachments(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  servico_id uuid NOT NULL,
  setor text NOT NULL,
  enviado_por uuid NOT NULL,
  nome text NOT NULL CHECK(length(nome) BETWEEN 1 AND 180),
  tipo text NOT NULL CHECK(tipo IN ('image/jpeg','image/png','image/webp','application/pdf')),
  tamanho bigint NOT NULL CHECK(tamanho BETWEEN 1 AND 10485760),
  caminho text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente','validado')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  validado_em timestamptz,
  FOREIGN KEY(tenant_id,enviado_por) REFERENCES public.profiles(tenant_id,id),
  FOREIGN KEY(servico_id,setor) REFERENCES private.workforce_service_sheets(servico_id,setor)
);
ALTER TABLE private.workforce_attachments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.workforce_attachments FROM PUBLIC,anon,authenticated;
CREATE INDEX workforce_attachment_service ON private.workforce_attachments(tenant_id,servico_id,setor,status);

CREATE FUNCTION private.attachment_sheet_access(p_service uuid,p_sector text,p_operation text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS(SELECT 1 FROM private.workforce_service_sheets s WHERE s.servico_id=p_service AND s.setor=p_sector
    AND private.operational_permission(s.tenant_id,'ordens','visualizar',s.setor,private.sheet_assigned_read(s))
    AND CASE WHEN p_operation='visualizar' THEN true ELSE s.status<>'concluida'
      AND private.operational_permission(s.tenant_id,'ordens',p_operation,s.setor,s.responsavel_id=auth.uid()) END);
$$;
REVOKE ALL ON FUNCTION private.attachment_sheet_access(uuid,text,text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.anexo_preparar(p_servico uuid,p_setor text,p_nome text,p_tipo text,p_tamanho bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE sheet private.workforce_service_sheets%ROWTYPE; attachment uuid:=gen_random_uuid(); path text;
BEGIN
  PERFORM private.require_authorized_session();
  PERFORM 1 FROM public.servicos WHERE id=p_servico FOR UPDATE;
  SELECT * INTO sheet FROM private.workforce_service_sheets WHERE servico_id=p_servico AND setor=p_setor;
  IF NOT FOUND OR NOT private.attachment_sheet_access(p_servico,p_setor,'anexar') THEN
    RAISE EXCEPTION 'Sem permissão para anexar nesta ficha.' USING ERRCODE='42501';
  END IF;
  IF p_nome IS NULL OR length(btrim(p_nome)) NOT BETWEEN 1 AND 180 OR p_nome ~ '[[:cntrl:]/\\]'
    OR p_tipo IS NULL OR p_tipo NOT IN ('image/jpeg','image/png','image/webp','application/pdf')
    OR p_tamanho IS NULL OR p_tamanho NOT BETWEEN 1 AND 10485760 THEN
    RAISE EXCEPTION 'Arquivo inválido. Envie imagem ou PDF de até 10 MB.' USING ERRCODE='22023';
  END IF;
  IF (SELECT count(*) FROM private.workforce_attachments WHERE servico_id=p_servico AND setor=p_setor AND status='pendente' AND criado_em>now()-interval '1 hour')>=30 THEN
    RAISE EXCEPTION 'Há muitos envios pendentes. Aguarde a validação dos arquivos.' USING ERRCODE='54000';
  END IF;
  path:=sheet.tenant_id::text||'/'||attachment::text;
  INSERT INTO private.workforce_attachments(id,tenant_id,servico_id,setor,enviado_por,nome,tipo,tamanho,caminho)
    VALUES(attachment,sheet.tenant_id,p_servico,p_setor,auth.uid(),btrim(p_nome),p_tipo,p_tamanho,path);
  INSERT INTO public.audit_logs(tenant_id,actor_id,acao,tabela,registro_id,detalhes)
    VALUES(sheet.tenant_id,auth.uid(),'anexo_preparado','workforce_attachments',attachment::text,jsonb_build_object('setor',p_setor,'servico_id',p_servico,'tipo',p_tipo,'tamanho',p_tamanho));
  RETURN jsonb_build_object('id',attachment,'bucket','workforce-private','caminho',path,'status','pendente');
END;
$$;
REVOKE ALL ON FUNCTION public.anexo_preparar(uuid,text,text,text,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.anexo_preparar(uuid,text,text,text,bigint) TO authenticated;

CREATE FUNCTION private.attachment_upload_allowed(p_path text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS(SELECT 1 FROM private.workforce_attachments a WHERE a.caminho=p_path AND a.enviado_por=auth.uid()
    AND a.status='pendente' AND a.criado_em>now()-interval '1 hour'
    AND private.attachment_sheet_access(a.servico_id,a.setor,'anexar'));
$$;
CREATE FUNCTION private.attachment_download_allowed(p_path text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS(SELECT 1 FROM private.workforce_attachments a WHERE a.caminho=p_path AND a.status='validado'
    AND private.attachment_sheet_access(a.servico_id,a.setor,'visualizar'));
$$;
REVOKE ALL ON FUNCTION private.attachment_upload_allowed(text),private.attachment_download_allowed(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.attachment_upload_allowed(text),private.attachment_download_allowed(text) TO authenticated;
CREATE POLICY workforce_private_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK(bucket_id='workforce-private' AND private.attachment_upload_allowed(name));
CREATE POLICY workforce_private_select ON storage.objects FOR SELECT TO authenticated
  USING(bucket_id='workforce-private' AND private.attachment_download_allowed(name));
-- No UPDATE/DELETE policy: uploads cannot replace validated files or erase history.
COMMIT;
