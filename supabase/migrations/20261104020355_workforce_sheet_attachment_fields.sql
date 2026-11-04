BEGIN;
CREATE FUNCTION private.sheet_attachment_link_allowed(p_service uuid,p_sector text,p_value jsonb) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT private.attachment_sheet_access(p_service,p_sector,'anexar')
    AND CASE WHEN p_value IN ('null'::jsonb,'""'::jsonb) THEN true ELSE EXISTS(
      SELECT 1 FROM private.workforce_attachments a WHERE a.servico_id=p_service AND a.setor=p_sector
        AND a.id::text=p_value#>>'{}' AND a.status='validado'
        AND a.tenant_id=(SELECT tenant_id FROM public.servicos WHERE id=p_service)) END;
$$;
REVOKE ALL ON FUNCTION private.sheet_attachment_link_allowed(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.ficha_servico_salvar(p_servico uuid,p_setor text,p_dados jsonb,p_versao integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE service public.servicos%ROWTYPE; sheet private.workforce_service_sheets%ROWTYPE;
  definition jsonb; field jsonb; allowed text[]; assigned boolean; result_version integer;
BEGIN
  PERFORM private.require_authorized_session();
  SELECT * INTO service FROM public.servicos WHERE id=p_servico FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Serviço indisponível.' USING ERRCODE='42501'; END IF;
  SELECT * INTO sheet FROM private.workforce_service_sheets WHERE servico_id=p_servico AND setor=p_setor FOR UPDATE;
  assigned:=sheet.responsavel_id=auth.uid();
  IF NOT private.operational_permission(service.tenant_id,'ordens','editar',p_setor,assigned) THEN
    RAISE EXCEPTION 'Sem permissão para editar esta ficha.' USING ERRCODE='42501';
  END IF;
  IF sheet.servico_id IS NULL THEN
    IF NOT private.operational_owner(service.tenant_id) THEN
      RAISE EXCEPTION 'O proprietário precisa liberar a ficha deste setor.' USING ERRCODE='42501';
    END IF;
    IF p_versao IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'Ficha alterada. Recarregue.' USING ERRCODE='40001'; END IF;
    SELECT t.definition INTO definition FROM private.workforce_sheet_templates t WHERE t.setor=p_setor ORDER BY t.versao DESC LIMIT 1;
  ELSE
    IF sheet.tenant_id<>service.tenant_id THEN RAISE EXCEPTION 'Empresa incompatível.' USING ERRCODE='42501'; END IF;
    IF p_versao IS DISTINCT FROM sheet.versao THEN RAISE EXCEPTION 'Ficha alterada. Recarregue.' USING ERRCODE='40001'; END IF;
    SELECT t.definition INTO definition FROM private.workforce_sheet_templates t WHERE t.setor=sheet.setor AND t.versao=sheet.template_versao;
  END IF;
  IF definition IS NULL THEN RAISE EXCEPTION 'Setor inválido.' USING ERRCODE='22023'; END IF;
  allowed:=private.sheet_privacy(service.tenant_id,p_setor,assigned);
  PERFORM private.validate_technical_fields(definition->'campos',p_dados,allowed,false);
  -- File fields may reference only validated attachments of this exact sheet.
  FOR field IN SELECT * FROM jsonb_array_elements(definition->'campos') WHERE value->>'type'='file' LOOP
    IF p_dados ? (field->>'key') AND p_dados->(field->>'key') IS DISTINCT FROM coalesce(sheet.dados,'{}')->(field->>'key')
      AND NOT private.sheet_attachment_link_allowed(p_servico,p_setor,p_dados->(field->>'key')) THEN
      RAISE EXCEPTION 'Escolha um anexo validado desta ficha e com autorização para anexar.' USING ERRCODE='42501';
    END IF;
  END LOOP;
  INSERT INTO private.workforce_service_sheets(servico_id,tenant_id,setor,template_versao,dados,atualizado_por,responsavel_id)
    VALUES(p_servico,service.tenant_id,p_setor,(definition->>'versao')::integer,p_dados,auth.uid(),
      CASE WHEN private.employee_has_sector(service.usuario_responsavel_id,service.tenant_id,p_setor)
        THEN service.usuario_responsavel_id ELSE NULL END)
    ON CONFLICT(servico_id,setor) DO UPDATE SET
      dados=private.workforce_service_sheets.dados||EXCLUDED.dados,
      versao=private.workforce_service_sheets.versao+1,atualizado_por=auth.uid(),atualizado_em=now()
    RETURNING versao INTO result_version;
  INSERT INTO public.audit_logs(tenant_id,actor_id,acao,tabela,registro_id,detalhes)
    VALUES(service.tenant_id,auth.uid(),'ficha_tecnica_salva','workforce_service_sheets',p_servico::text,
      jsonb_build_object('setor',p_setor,'versao_anterior',coalesce(sheet.versao,0),'versao',result_version,
        'campos',ARRAY(SELECT jsonb_object_keys(p_dados))));
  RETURN jsonb_build_object('servico_id',p_servico,'setor',p_setor,'versao',result_version);
END;
$$;
COMMIT;
