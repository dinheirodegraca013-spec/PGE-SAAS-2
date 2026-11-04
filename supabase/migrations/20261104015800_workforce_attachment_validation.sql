BEGIN;
ALTER TABLE private.workforce_attachments ADD COLUMN sha256 text CHECK(sha256 IS NULL OR sha256 ~ '^[a-f0-9]{64}$');

CREATE FUNCTION public.anexo_contexto_validacao(p_anexo uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE attachment private.workforce_attachments%ROWTYPE; object_id uuid;
BEGIN
  PERFORM private.require_authorized_session();
  SELECT * INTO attachment FROM private.workforce_attachments WHERE id=p_anexo AND enviado_por=auth.uid();
  IF NOT FOUND OR NOT private.attachment_sheet_access(attachment.servico_id,attachment.setor,'anexar') THEN
    RAISE EXCEPTION 'Anexo indisponível.' USING ERRCODE='42501';
  END IF;
  SELECT id INTO object_id FROM storage.objects WHERE bucket_id='workforce-private' AND name=attachment.caminho;
  IF object_id IS NULL THEN RAISE EXCEPTION 'Envie o arquivo antes de validar.' USING ERRCODE='55000'; END IF;
  RETURN jsonb_build_object('id',attachment.id,'usuario_id',auth.uid(),'sessao_id',auth.jwt()->>'session_id',
    'bucket','workforce-private','caminho',attachment.caminho,'tipo',attachment.tipo,'tamanho',attachment.tamanho,'objeto_id',object_id);
END;
$$;
REVOKE ALL ON FUNCTION public.anexo_contexto_validacao(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.anexo_contexto_validacao(uuid) TO authenticated;

CREATE FUNCTION public.anexo_confirmar_validacao(p_anexo uuid,p_usuario uuid,p_sessao uuid,p_objeto uuid,p_sha256 text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE attachment private.workforce_attachments%ROWTYPE; metadata jsonb;
  old_sub text:=current_setting('request.jwt.claim.sub',true);old_role text:=current_setting('request.jwt.claim.role',true);old_claims text:=current_setting('request.jwt.claims',true);
BEGIN
  IF NOT private.user_session_allowed(p_usuario,p_sessao) THEN RAISE EXCEPTION 'Sessão inválida.' USING ERRCODE='42501'; END IF;
  SELECT * INTO attachment FROM private.workforce_attachments WHERE id=p_anexo AND enviado_por=p_usuario;
  IF NOT FOUND THEN RAISE EXCEPTION 'Anexo indisponível.' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.servicos WHERE id=attachment.servico_id FOR UPDATE;
  SELECT * INTO attachment FROM private.workforce_attachments WHERE id=p_anexo FOR UPDATE;
  PERFORM set_config('request.jwt.claim.sub',p_usuario::text,true);
  PERFORM set_config('request.jwt.claim.role','authenticated',true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_usuario,'role','authenticated','session_id',p_sessao)::text,true);
  IF NOT private.attachment_sheet_access(attachment.servico_id,attachment.setor,'anexar') THEN
    RAISE EXCEPTION 'A autorização do anexo foi revogada.' USING ERRCODE='42501';
  END IF;
  SELECT o.metadata INTO metadata FROM storage.objects o WHERE o.id=p_objeto AND o.bucket_id='workforce-private' AND o.name=attachment.caminho;
  IF metadata IS NULL OR coalesce(metadata->>'size','') !~ '^[0-9]+$'
    OR p_sha256 IS NULL OR p_sha256 !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Arquivo inválido.' USING ERRCODE='22023'; END IF;
  IF (metadata->>'size')::bigint<>attachment.tamanho OR metadata->>'mimetype' IS DISTINCT FROM attachment.tipo THEN
    RAISE EXCEPTION 'Metadados do arquivo não correspondem ao envio autorizado.' USING ERRCODE='22023';
  END IF;
  IF attachment.status='validado' AND attachment.sha256 IS DISTINCT FROM p_sha256 THEN
    RAISE EXCEPTION 'O conteúdo validado não pode ser substituído.' USING ERRCODE='55000';
  END IF;
  IF attachment.status<>'validado' THEN
    UPDATE private.workforce_attachments SET status='validado',sha256=p_sha256,validado_em=now() WHERE id=p_anexo;
    INSERT INTO public.audit_logs(tenant_id,actor_id,acao,tabela,registro_id,detalhes)
      VALUES(attachment.tenant_id,p_usuario,'anexo_validado','workforce_attachments',p_anexo::text,jsonb_build_object('setor',attachment.setor,'servico_id',attachment.servico_id,'sha256',p_sha256));
  END IF;
  PERFORM set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);PERFORM set_config('request.jwt.claim.role',coalesce(old_role,''),true);PERFORM set_config('request.jwt.claims',coalesce(old_claims,'{}'),true);
  RETURN jsonb_build_object('id',p_anexo,'status','validado');
END;
$$;
REVOKE ALL ON FUNCTION public.anexo_confirmar_validacao(uuid,uuid,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.anexo_confirmar_validacao(uuid,uuid,uuid,uuid,text) TO service_role;
CREATE FUNCTION public.anexos_ficha_listar(p_servico uuid,p_setor text,p_pagina integer DEFAULT 0) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
  PERFORM private.require_authorized_session();
  IF NOT private.attachment_sheet_access(p_servico,p_setor,'visualizar') THEN RAISE EXCEPTION 'Ficha indisponível.' USING ERRCODE='42501'; END IF;
  IF p_pagina IS NULL OR p_pagina<0 OR p_pagina>100000 THEN RAISE EXCEPTION 'Página inválida.' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(page)),'[]') INTO result FROM (
    SELECT id,nome,tipo,tamanho,caminho,criado_em FROM private.workforce_attachments
      WHERE servico_id=p_servico AND setor=p_setor AND status='validado'
      ORDER BY criado_em DESC,id LIMIT 21 OFFSET p_pagina*20
  ) page;
  RETURN jsonb_build_object('itens',CASE WHEN jsonb_array_length(result)>20 THEN result-20 ELSE result END,'tem_mais',jsonb_array_length(result)>20);
END;
$$;
REVOKE ALL ON FUNCTION public.anexos_ficha_listar(uuid,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.anexos_ficha_listar(uuid,text,integer) TO authenticated;
COMMIT;
