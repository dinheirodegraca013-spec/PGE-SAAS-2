BEGIN;
CREATE TABLE private.workforce_incidents(
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  servico_id uuid NOT NULL,
  setor text NOT NULL,
  criado_por uuid NOT NULL,
  titulo text NOT NULL CHECK(length(btrim(titulo)) BETWEEN 3 AND 200),
  descricao text NOT NULL CHECK(length(btrim(descricao)) BETWEEN 10 AND 10000),
  tipo text NOT NULL CHECK(tipo IN ('equipamento','material','defeito','outro')),
  gravidade text NOT NULL CHECK(gravidade IN ('informativa','atencao','critica')),
  status text NOT NULL DEFAULT 'aberta' CHECK(status IN ('aberta','resolvida')),
  criada_em timestamptz NOT NULL DEFAULT now(),
  resolvida_em timestamptz,
  resolvida_por uuid,
  resolucao text CHECK(resolucao IS NULL OR length(btrim(resolucao)) BETWEEN 10 AND 5000),
  versao integer NOT NULL DEFAULT 1,
  FOREIGN KEY(tenant_id,criado_por) REFERENCES public.profiles(tenant_id,id),
  FOREIGN KEY(tenant_id,resolvida_por) REFERENCES public.profiles(tenant_id,id),
  FOREIGN KEY(servico_id,setor) REFERENCES private.workforce_service_sheets(servico_id,setor)
);
ALTER TABLE private.workforce_incidents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.workforce_incidents FROM PUBLIC,anon,authenticated;
CREATE INDEX workforce_incident_service ON private.workforce_incidents(tenant_id,servico_id,setor,criada_em DESC,id);

CREATE FUNCTION public.ocorrencia_criar(p_requisicao uuid,p_servico uuid,p_setor text,p_titulo text,p_descricao text,p_tipo text,p_gravidade text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE sheet private.workforce_service_sheets%ROWTYPE; existing private.workforce_incidents%ROWTYPE;
BEGIN
  PERFORM private.require_authorized_session();
  PERFORM 1 FROM public.servicos WHERE id=p_servico FOR UPDATE;
  SELECT * INTO sheet FROM private.workforce_service_sheets WHERE servico_id=p_servico AND setor=p_setor;
  IF NOT FOUND OR NOT private.operational_permission(sheet.tenant_id,'ocorrencias','criar',p_setor,private.sheet_assigned_read(sheet)) THEN
    RAISE EXCEPTION 'Sem permissão para comunicar ocorrência nesta ficha.' USING ERRCODE='42501';
  END IF;
  IF p_requisicao IS NULL OR p_titulo IS NULL OR length(btrim(p_titulo)) NOT BETWEEN 3 AND 200
    OR p_descricao IS NULL OR length(btrim(p_descricao)) NOT BETWEEN 10 AND 10000 OR p_tipo IS NULL
    OR p_tipo NOT IN ('equipamento','material','defeito','outro') OR p_gravidade IS NULL OR p_gravidade NOT IN ('informativa','atencao','critica') THEN
    RAISE EXCEPTION 'Preencha título, descrição, tipo e gravidade da ocorrência.' USING ERRCODE='22023';
  END IF;
  SELECT * INTO existing FROM private.workforce_incidents WHERE id=p_requisicao;
  IF FOUND THEN
    IF existing.tenant_id<>sheet.tenant_id OR existing.criado_por<>auth.uid() OR existing.servico_id<>p_servico OR existing.setor<>p_setor
      OR existing.titulo<>btrim(p_titulo) OR existing.descricao<>btrim(p_descricao) OR existing.tipo<>p_tipo OR existing.gravidade<>p_gravidade THEN
      RAISE EXCEPTION 'Identificador de requisição já utilizado.' USING ERRCODE='22023';
    END IF;
    RETURN jsonb_build_object('id',existing.id,'versao',existing.versao,'repetida',true);
  END IF;
  INSERT INTO private.workforce_incidents(id,tenant_id,servico_id,setor,criado_por,titulo,descricao,tipo,gravidade)
    VALUES(p_requisicao,sheet.tenant_id,p_servico,p_setor,auth.uid(),btrim(p_titulo),btrim(p_descricao),p_tipo,p_gravidade);
  INSERT INTO public.audit_logs(tenant_id,actor_id,acao,tabela,registro_id,detalhes)
    VALUES(sheet.tenant_id,auth.uid(),'ocorrencia_criada','workforce_incidents',p_requisicao::text,
      jsonb_build_object('servico_id',p_servico,'setor',p_setor,'tipo',p_tipo,'gravidade',p_gravidade));
  RETURN jsonb_build_object('id',p_requisicao,'versao',1,'repetida',false);
END;
$$;
REVOKE ALL ON FUNCTION public.ocorrencia_criar(uuid,uuid,text,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ocorrencia_criar(uuid,uuid,text,text,text,text,text) TO authenticated;

CREATE FUNCTION public.ocorrencias_ficha_listar(p_servico uuid,p_setor text,p_pagina integer DEFAULT 0) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
  PERFORM private.require_authorized_session();
  IF p_pagina IS NULL OR p_pagina<0 OR p_pagina>100000 THEN RAISE EXCEPTION 'Página inválida.' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(page)),'[]') INTO result FROM(
    SELECT i.id,i.titulo,i.descricao,i.tipo,i.gravidade,i.status,i.criada_em,i.resolvida_em,i.resolucao,i.versao,
      private.operational_permission(i.tenant_id,'ocorrencias','aprovar',i.setor,i.criado_por=auth.uid()) AS pode_resolver
    FROM private.workforce_incidents i WHERE i.servico_id=p_servico AND i.setor=p_setor
      AND private.operational_permission(i.tenant_id,'ocorrencias','visualizar',i.setor,i.criado_por=auth.uid())
    ORDER BY i.criada_em DESC,i.id LIMIT 21 OFFSET p_pagina*20
  ) page;
  RETURN jsonb_build_object('itens',CASE WHEN jsonb_array_length(result)>20 THEN result-20 ELSE result END,'tem_mais',jsonb_array_length(result)>20);
END;
$$;
REVOKE ALL ON FUNCTION public.ocorrencias_ficha_listar(uuid,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ocorrencias_ficha_listar(uuid,text,integer) TO authenticated;

CREATE FUNCTION public.ocorrencia_resolver(p_ocorrencia uuid,p_versao integer,p_resolucao text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE incident private.workforce_incidents%ROWTYPE; result_version integer;
BEGIN
  PERFORM private.require_authorized_session();
  SELECT * INTO incident FROM private.workforce_incidents WHERE id=p_ocorrencia FOR UPDATE;
  IF NOT FOUND OR NOT private.operational_permission(incident.tenant_id,'ocorrencias','aprovar',incident.setor,incident.criado_por=auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para resolver esta ocorrência.' USING ERRCODE='42501';
  END IF;
  IF p_versao IS DISTINCT FROM incident.versao THEN RAISE EXCEPTION 'Ocorrência alterada. Recarregue.' USING ERRCODE='40001'; END IF;
  IF incident.status<>'aberta' THEN RAISE EXCEPTION 'Ocorrência já resolvida.' USING ERRCODE='55000'; END IF;
  IF p_resolucao IS NULL OR length(btrim(p_resolucao)) NOT BETWEEN 10 AND 5000 THEN
    RAISE EXCEPTION 'Descreva a resolução em 10 a 5.000 caracteres.' USING ERRCODE='22023';
  END IF;
  UPDATE private.workforce_incidents SET status='resolvida',resolucao=btrim(p_resolucao),resolvida_por=auth.uid(),resolvida_em=now(),versao=versao+1
    WHERE id=p_ocorrencia RETURNING versao INTO result_version;
  INSERT INTO public.audit_logs(tenant_id,actor_id,acao,tabela,registro_id,detalhes)
    VALUES(incident.tenant_id,auth.uid(),'ocorrencia_resolvida','workforce_incidents',incident.id::text,
      jsonb_build_object('servico_id',incident.servico_id,'setor',incident.setor,'antes','aberta','depois','resolvida','versao',result_version));
  RETURN jsonb_build_object('id',incident.id,'status','resolvida','versao',result_version);
END;
$$;
REVOKE ALL ON FUNCTION public.ocorrencia_resolver(uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ocorrencia_resolver(uuid,integer,text) TO authenticated;
COMMIT;
