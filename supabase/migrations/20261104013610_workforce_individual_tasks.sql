BEGIN;
CREATE TABLE private.workforce_tasks (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  servico_id uuid,
  setor text NOT NULL CHECK(setor IN ('financeiro','corte','montagem','acabamento','instalacao','estoque')),
  titulo text NOT NULL CHECK(length(btrim(titulo)) BETWEEN 1 AND 200),
  descricao text NOT NULL DEFAULT '' CHECK(length(descricao)<=10000),
  responsavel_id uuid NOT NULL,
  criado_por uuid NOT NULL REFERENCES auth.users(id),
  criada_em timestamptz NOT NULL DEFAULT now(),
  iniciada_em timestamptz,
  concluida_em timestamptz,
  prazo timestamptz,
  prioridade text NOT NULL CHECK(prioridade IN ('baixa','normal','alta','urgente')),
  status text NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente','em_andamento','pausada','aguardando_material','aguardando_aprovacao','concluida','cancelada')),
  progresso integer NOT NULL DEFAULT 0 CHECK(progresso BETWEEN 0 AND 100),
  obrigatoria boolean NOT NULL DEFAULT false,
  observacoes text NOT NULL DEFAULT '' CHECK(length(observacoes)<=10000),
  versao integer NOT NULL DEFAULT 1,
  requisicao jsonb NOT NULL,
  FOREIGN KEY(tenant_id,responsavel_id) REFERENCES public.profiles(tenant_id,id),
  FOREIGN KEY(servico_id,setor) REFERENCES private.workforce_service_sheets(servico_id,setor)
);
ALTER TABLE private.workforce_tasks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.workforce_tasks FROM PUBLIC,anon,authenticated;
CREATE INDEX workforce_tasks_assignment ON private.workforce_tasks(tenant_id,responsavel_id,status,prazo,id);
CREATE INDEX workforce_tasks_service ON private.workforce_tasks(servico_id,setor,status) WHERE obrigatoria;

CREATE FUNCTION public.tarefa_criar(p_requisicao uuid,p_setor text,p_titulo text,p_descricao text,p_responsavel uuid,
  p_servico uuid DEFAULT NULL,p_prazo timestamptz DEFAULT NULL,p_prioridade text DEFAULT 'normal',p_obrigatoria boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE company uuid; sheet private.workforce_service_sheets%ROWTYPE; existing private.workforce_tasks%ROWTYPE; payload jsonb;
BEGIN
  PERFORM private.require_authorized_session();
  SELECT tenant_id INTO company FROM public.profiles WHERE id=auth.uid() AND ativo;
  IF company IS NULL OR NOT private.operational_permission(company,'tarefas','criar',p_setor,true) THEN
    RAISE EXCEPTION 'Sem permissão para criar tarefas.' USING ERRCODE='42501';
  END IF;
  IF p_requisicao IS NULL OR p_responsavel IS NULL OR p_titulo IS NULL OR length(btrim(p_titulo)) NOT BETWEEN 1 AND 200
    OR p_descricao IS NULL OR length(p_descricao)>10000 OR p_prioridade IS NULL OR p_prioridade NOT IN ('baixa','normal','alta','urgente')
    OR p_obrigatoria IS NULL OR p_setor IS NULL OR p_setor NOT IN ('financeiro','corte','montagem','acabamento','instalacao','estoque')
    OR (p_prazo IS NOT NULL AND NOT isfinite(p_prazo)) THEN RAISE EXCEPTION 'Dados da tarefa inválidos.' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM public.tenants WHERE id=company FOR UPDATE;
  payload:=jsonb_build_object('setor',p_setor,'titulo',btrim(p_titulo),'descricao',p_descricao,'responsavel',p_responsavel,'servico',p_servico,'prazo',p_prazo,'prioridade',p_prioridade,'obrigatoria',p_obrigatoria);
  SELECT * INTO existing FROM private.workforce_tasks WHERE id=p_requisicao;
  IF FOUND THEN
    IF existing.tenant_id<>company OR existing.criado_por<>auth.uid() OR existing.requisicao<>payload THEN
      RAISE EXCEPTION 'Identificador de requisição já utilizado.' USING ERRCODE='22023';
    END IF;
    RETURN jsonb_build_object('id',existing.id,'versao',existing.versao,'repetida',true);
  END IF;
  IF NOT private.employee_has_sector(p_responsavel,company,p_setor) OR NOT private.user_within_plan(p_responsavel) THEN
    RAISE EXCEPTION 'Responsável indisponível para este setor.' USING ERRCODE='42501';
  END IF;
  IF p_servico IS NOT NULL THEN
    PERFORM 1 FROM public.servicos WHERE id=p_servico AND tenant_id=company FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Serviço indisponível.' USING ERRCODE='42501'; END IF;
    SELECT * INTO sheet FROM private.workforce_service_sheets WHERE servico_id=p_servico AND tenant_id=company AND setor=p_setor;
    IF NOT FOUND OR NOT private.operational_permission(company,'ordens','visualizar',p_setor,sheet.responsavel_id=auth.uid()) THEN
      RAISE EXCEPTION 'Ficha indisponível.' USING ERRCODE='42501';
    END IF;
    IF sheet.status='concluida' THEN RAISE EXCEPTION 'Não é possível adicionar tarefa à etapa concluída.' USING ERRCODE='55000'; END IF;
  END IF;
  INSERT INTO private.workforce_tasks(id,tenant_id,servico_id,setor,titulo,descricao,responsavel_id,criado_por,prazo,prioridade,obrigatoria,requisicao)
    VALUES(p_requisicao,company,p_servico,p_setor,btrim(p_titulo),p_descricao,p_responsavel,auth.uid(),p_prazo,p_prioridade,p_obrigatoria,payload);
  INSERT INTO public.audit_logs(tenant_id,actor_id,acao,tabela,registro_id,detalhes)
    VALUES(company,auth.uid(),'tarefa_criada','workforce_tasks',p_requisicao::text,jsonb_build_object('setor',p_setor,'servico_id',p_servico,'responsavel',p_responsavel,'prioridade',p_prioridade));
  RETURN jsonb_build_object('id',p_requisicao,'versao',1,'repetida',false);
END;
$$;
REVOKE ALL ON FUNCTION public.tarefa_criar(uuid,text,text,text,uuid,uuid,timestamptz,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tarefa_criar(uuid,text,text,text,uuid,uuid,timestamptz,text,boolean) TO authenticated;

CREATE FUNCTION public.minhas_tarefas(p_pagina integer DEFAULT 0,p_status text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
  PERFORM private.require_authorized_session();
  IF p_pagina IS NULL OR p_pagina<0 OR p_pagina>100000 OR (p_status IS NOT NULL AND p_status NOT IN ('pendente','em_andamento','pausada','aguardando_material','aguardando_aprovacao','concluida','cancelada')) THEN
    RAISE EXCEPTION 'Filtro inválido.' USING ERRCODE='22023';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(page)),'[]') INTO result FROM (
    SELECT t.id,t.servico_id,t.setor,t.titulo,t.descricao,t.responsavel_id,t.criado_por,t.criada_em,t.iniciada_em,t.prazo,t.prioridade,t.status,t.progresso,t.obrigatoria,t.observacoes,t.versao
    FROM private.workforce_tasks t WHERE (p_status IS NULL OR t.status=p_status)
      AND private.operational_permission(t.tenant_id,'tarefas','visualizar',t.setor,t.responsavel_id=auth.uid())
    ORDER BY t.prazo NULLS LAST,t.criada_em,t.id LIMIT 21 OFFSET p_pagina*20
  ) page;
  RETURN jsonb_build_object('itens',CASE WHEN jsonb_array_length(result)>20 THEN result-20 ELSE result END,'tem_mais',jsonb_array_length(result)>20);
END;
$$;
REVOKE ALL ON FUNCTION public.minhas_tarefas(integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.minhas_tarefas(integer,text) TO authenticated;
CREATE FUNCTION public.tarefa_atualizar(p_tarefa uuid,p_status text,p_versao integer,p_progresso integer DEFAULT NULL,p_observacoes text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE task private.workforce_tasks%ROWTYPE; operation text; sheet_status text; result private.workforce_tasks%ROWTYPE;
BEGIN
  PERFORM private.require_authorized_session();
  SELECT * INTO task FROM private.workforce_tasks WHERE id=p_tarefa;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tarefa indisponível.' USING ERRCODE='42501'; END IF;
  operation:=CASE WHEN p_status=task.status THEN 'editar'
    WHEN p_status='em_andamento' THEN 'iniciar' WHEN p_status='pausada' THEN 'pausar'
    WHEN p_status='concluida' THEN 'concluir' WHEN p_status='cancelada' THEN 'excluir'
    WHEN p_status IN ('aguardando_material','aguardando_aprovacao') THEN 'editar' END;
  IF operation IS NULL THEN RAISE EXCEPTION 'Situação inválida.' USING ERRCODE='22023'; END IF;
  IF NOT private.operational_permission(task.tenant_id,'tarefas',operation,task.setor,task.responsavel_id=auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para atualizar esta tarefa.' USING ERRCODE='42501';
  END IF;
  IF p_observacoes IS NULL OR length(p_observacoes)>10000 OR (p_progresso IS NOT NULL AND p_progresso NOT BETWEEN 0 AND 100) THEN
    RAISE EXCEPTION 'Progresso ou observações inválidos.' USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM public.tenants WHERE id=task.tenant_id FOR UPDATE;
  IF task.servico_id IS NOT NULL THEN
    PERFORM 1 FROM public.servicos WHERE id=task.servico_id AND tenant_id=task.tenant_id FOR UPDATE;
    SELECT status INTO sheet_status FROM private.workforce_service_sheets WHERE servico_id=task.servico_id AND setor=task.setor AND tenant_id=task.tenant_id;
    IF sheet_status='concluida' THEN RAISE EXCEPTION 'Etapa concluída não permite alterar tarefas.' USING ERRCODE='55000'; END IF;
    IF p_status='em_andamento' AND sheet_status IS DISTINCT FROM 'em_andamento' THEN
      RAISE EXCEPTION 'Inicie a etapa antes de executar suas tarefas.' USING ERRCODE='55000';
    END IF;
  END IF;
  SELECT * INTO task FROM private.workforce_tasks WHERE id=p_tarefa FOR UPDATE;
  IF p_versao IS DISTINCT FROM task.versao THEN RAISE EXCEPTION 'Tarefa alterada. Recarregue.' USING ERRCODE='40001'; END IF;
  IF task.status IN ('concluida','cancelada') THEN RAISE EXCEPTION 'Tarefa finalizada não pode ser alterada.' USING ERRCODE='55000'; END IF;
  IF (p_status='pausada' AND task.status<>'em_andamento') OR (p_status='concluida' AND task.status<>'em_andamento') THEN
    RAISE EXCEPTION 'Inicie a tarefa antes desta operação.' USING ERRCODE='55000';
  END IF;
  IF p_status='cancelada' THEN
    IF length(btrim(p_observacoes))<10 THEN RAISE EXCEPTION 'Informe o motivo do cancelamento.' USING ERRCODE='22023'; END IF;
    IF task.obrigatoria AND NOT private.operational_permission(task.tenant_id,'tarefas','aprovar',task.setor,task.responsavel_id=auth.uid()) THEN
      RAISE EXCEPTION 'Cancelar tarefa obrigatória exige aprovação.' USING ERRCODE='42501';
    END IF;
  END IF;
  IF p_status<>'concluida' AND p_progresso=100 THEN RAISE EXCEPTION 'Conclua a tarefa para registrar 100%%.' USING ERRCODE='22023'; END IF;
  UPDATE private.workforce_tasks SET status=p_status,
    progresso=CASE WHEN p_status='concluida' THEN 100 ELSE coalesce(p_progresso,progresso) END,
    observacoes=p_observacoes,versao=versao+1,
    iniciada_em=CASE WHEN p_status='em_andamento' THEN coalesce(iniciada_em,now()) ELSE iniciada_em END,
    concluida_em=CASE WHEN p_status='concluida' THEN now() ELSE concluida_em END
    WHERE id=p_tarefa RETURNING * INTO result;
  INSERT INTO public.audit_logs(tenant_id,actor_id,acao,tabela,registro_id,detalhes)
    VALUES(task.tenant_id,auth.uid(),'tarefa_atualizada','workforce_tasks',task.id::text,
      jsonb_build_object('setor',task.setor,'antes',task.status,'depois',result.status,'progresso_anterior',task.progresso,
        'progresso',result.progresso,'versao',result.versao,'justificativa',CASE WHEN p_status='cancelada' THEN p_observacoes ELSE NULL END));
  RETURN jsonb_build_object('id',result.id,'status',result.status,'versao',result.versao,'progresso',result.progresso,'iniciada_em',result.iniciada_em,'concluida_em',result.concluida_em,'observacoes',result.observacoes);
END;
$$;
REVOKE ALL ON FUNCTION public.tarefa_atualizar(uuid,text,integer,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tarefa_atualizar(uuid,text,integer,integer,text) TO authenticated;

CREATE FUNCTION private.guard_mandatory_tasks() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NEW.status='concluida' AND OLD.status<>'concluida' AND EXISTS(
    SELECT 1 FROM private.workforce_tasks t WHERE t.servico_id=NEW.servico_id AND t.tenant_id=NEW.tenant_id AND t.setor=NEW.setor
      AND t.obrigatoria AND t.status NOT IN ('concluida','cancelada')
  ) THEN RAISE EXCEPTION 'Conclua as tarefas obrigatórias antes de finalizar a etapa.' USING ERRCODE='55000'; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_mandatory_tasks() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER workforce_mandatory_tasks BEFORE UPDATE OF status ON private.workforce_service_sheets
  FOR EACH ROW EXECUTE FUNCTION private.guard_mandatory_tasks();
COMMIT;
