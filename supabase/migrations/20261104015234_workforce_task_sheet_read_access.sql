BEGIN;
CREATE FUNCTION private.sheet_assigned_read(p_sheet private.workforce_service_sheets) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT p_sheet.responsavel_id=auth.uid() OR EXISTS(
    SELECT 1 FROM private.workforce_tasks t WHERE t.tenant_id=p_sheet.tenant_id AND t.servico_id=p_sheet.servico_id
      AND t.setor=p_sheet.setor AND t.responsavel_id=auth.uid() AND t.status<>'cancelada'
      AND private.operational_permission(t.tenant_id,'tarefas','visualizar',t.setor,true));
$$;
REVOKE ALL ON FUNCTION private.sheet_assigned_read(private.workforce_service_sheets) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.ficha_servico_consultar(p_servico uuid,p_setor text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE service public.servicos%ROWTYPE; sheet private.workforce_service_sheets%ROWTYPE; definition jsonb;
  allowed text[]; visible_fields jsonb; visible_data jsonb;
BEGIN
  PERFORM private.require_authorized_session();
  SELECT * INTO service FROM public.servicos WHERE id=p_servico;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ficha indisponível.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO sheet FROM private.workforce_service_sheets WHERE servico_id=p_servico AND setor=p_setor AND tenant_id=service.tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ficha indisponível.' USING ERRCODE='42501'; END IF;
  IF NOT private.operational_permission(service.tenant_id,'ordens','visualizar',p_setor,private.sheet_assigned_read(sheet)) THEN
    RAISE EXCEPTION 'Ficha indisponível.' USING ERRCODE='42501';
  END IF;
  SELECT t.definition INTO definition FROM private.workforce_sheet_templates t WHERE t.setor=sheet.setor AND t.versao=sheet.template_versao;
  allowed:=private.sheet_privacy(service.tenant_id,p_setor,private.sheet_assigned_read(sheet));
  SELECT coalesce(jsonb_agg(f),'[]') INTO visible_fields FROM jsonb_array_elements(definition->'campos') f
    WHERE NOT f ? 'privacy' OR f->>'privacy'=ANY(allowed);
  SELECT coalesce(jsonb_object_agg(d.key,d.value),'{}') INTO visible_data FROM jsonb_each(sheet.dados) d
    WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(visible_fields) f WHERE f->>'key'=d.key);
  RETURN jsonb_build_object('servico_id',p_servico,'setor',p_setor,'versao',sheet.versao,
    'modelo',definition||jsonb_build_object('campos',visible_fields),'dados',visible_data,'checklist',sheet.checklist,'responsavel_id',sheet.responsavel_id,'privacidade_autorizada',allowed,
    'pode_editar',private.operational_permission(service.tenant_id,'ordens','editar',p_setor,sheet.responsavel_id=auth.uid()),
    'pode_anexar',private.operational_permission(service.tenant_id,'ordens','anexar',p_setor,sheet.responsavel_id=auth.uid()),
    'pode_comunicar',private.operational_permission(service.tenant_id,'ocorrencias','criar',p_setor,private.sheet_assigned_read(sheet)),
    'acoes_execucao',ARRAY(SELECT op FROM unnest(ARRAY['iniciar','pausar','concluir']) op
      WHERE private.operational_permission(service.tenant_id,'ordens',op,p_setor,sheet.responsavel_id=auth.uid())));
END;
$$;
CREATE OR REPLACE FUNCTION public.minhas_fichas_servicos(p_pagina integer DEFAULT 0,p_busca text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
  PERFORM private.require_authorized_session();
  IF p_pagina IS NULL OR p_pagina<0 OR p_pagina>100000 OR p_busca IS NULL OR length(p_busca)>120 THEN
    RAISE EXCEPTION 'Filtro inválido.' USING ERRCODE='22023';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(items)),'[]') INTO result FROM (
    SELECT s.id AS servico_id,coalesce(nullif(s.titulo,''),s.nome) AS titulo,f.setor,f.versao,f.atualizado_em
    FROM private.workforce_service_sheets f JOIN public.servicos s ON s.id=f.servico_id AND s.tenant_id=f.tenant_id
    WHERE private.operational_permission(s.tenant_id,'ordens','visualizar',f.setor,private.sheet_assigned_read(f))
      AND (p_busca='' OR position(lower(p_busca) IN lower(coalesce(s.titulo,'')||' '||s.nome))>0)
    ORDER BY f.atualizado_em DESC,s.id,f.setor LIMIT 21 OFFSET p_pagina*20
  ) items;
  RETURN jsonb_build_object('itens',CASE WHEN jsonb_array_length(result)>20 THEN result-20 ELSE result END,
    'tem_mais',jsonb_array_length(result)>20,'pagina',p_pagina);
END;
$$;
COMMIT;
