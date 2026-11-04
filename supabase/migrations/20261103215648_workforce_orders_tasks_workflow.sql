BEGIN;

-- Private validator shared by operational write RPCs. Caller-derived permissions
-- must be supplied by trusted functions, never exposed as caller input.
CREATE FUNCTION private.validate_technical_fields(
  p_fields jsonb, p_data jsonb, p_privacy text[] DEFAULT ARRAY[]::text[],
  p_complete boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE f jsonb; v jsonb; row_data jsonb; k text; typ text; n numeric; parsed_date date;
BEGIN
  IF jsonb_typeof(p_fields) IS DISTINCT FROM 'array' OR jsonb_typeof(p_data) IS DISTINCT FROM 'object'
    OR octet_length(p_data::text)>1048576 THEN
    RAISE EXCEPTION 'Ficha técnica inválida ou acima de 1 MB.' USING ERRCODE='22023';
  END IF;
  FOR k IN SELECT jsonb_object_keys(p_data) LOOP
    IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_fields) x WHERE x->>'key'=k) THEN
      RAISE EXCEPTION 'Campo desconhecido: %.',k USING ERRCODE='22023';
    END IF;
  END LOOP;
  FOR f IN SELECT * FROM jsonb_array_elements(p_fields) LOOP
    k:=f->>'key'; typ:=f->>'type';
    IF NOT p_data ? k THEN
      IF p_complete AND coalesce((f->>'required')::boolean,false) THEN
        RAISE EXCEPTION 'Campo obrigatório: %.',k USING ERRCODE='22023';
      END IF;
      CONTINUE;
    END IF;
    IF coalesce((f->>'readOnly')::boolean,false) OR
      (f ? 'privacy' AND NOT coalesce(f->>'privacy'=ANY(p_privacy),false)) THEN
      RAISE EXCEPTION 'Campo sem autorização: %.',k USING ERRCODE='42501';
    END IF;
    v:=p_data->k;
    IF v='null'::jsonb OR v='""'::jsonb THEN
      IF coalesce((f->>'required')::boolean,false) THEN
        RAISE EXCEPTION 'Campo obrigatório: %.',k USING ERRCODE='22023';
      END IF;
      CONTINUE;
    END IF;
    IF typ='table' THEN
      IF jsonb_typeof(v) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Lista inválida: %.',k USING ERRCODE='22023';
      END IF;
      IF jsonb_array_length(v)>1000 THEN
        RAISE EXCEPTION 'Limite de 1.000 linhas: %.',k USING ERRCODE='22023';
      END IF;
      FOR row_data IN SELECT * FROM jsonb_array_elements(v) LOOP
        PERFORM private.validate_technical_fields(f->'columns',row_data,p_privacy,true);
      END LOOP;
      IF f ? 'unique_key' AND EXISTS(
        SELECT 1 FROM jsonb_array_elements(v) x
        WHERE nullif(btrim(x->>(f->>'unique_key')),'') IS NOT NULL
        GROUP BY lower(btrim(x->>(f->>'unique_key'))) HAVING count(*)>1
      ) THEN RAISE EXCEPTION 'Identificador duplicado: %.',k USING ERRCODE='22023'; END IF;
    ELSIF typ IN ('number','integer') THEN
      IF jsonb_typeof(v) IS DISTINCT FROM 'number' THEN
        RAISE EXCEPTION 'Número inválido: %.',k USING ERRCODE='22023';
      END IF;
      n:=(v#>>'{}')::numeric;
      IF n<0 OR (typ='integer' AND (n<>trunc(n) OR n>9007199254740991)) THEN
        RAISE EXCEPTION 'Quantidade inválida: %.',k USING ERRCODE='22023';
      END IF;
    ELSIF typ IN ('text','textarea','date','url','file') THEN
      IF jsonb_typeof(v) IS DISTINCT FROM 'string' OR
        length(v#>>'{}')>(CASE WHEN typ='textarea' THEN 10000 ELSE 2000 END) OR
        (coalesce((f->>'required')::boolean,false) AND btrim(v#>>'{}')='') THEN
        RAISE EXCEPTION 'Texto inválido: %.',k USING ERRCODE='22023';
      END IF;
      IF typ='date' THEN
        BEGIN
          parsed_date:=(v#>>'{}')::date;
          IF (v#>>'{}') !~ '^\d{4}-\d{2}-\d{2}$' OR to_char(parsed_date,'YYYY-MM-DD')<>(v#>>'{}') THEN
            RAISE EXCEPTION 'Data inválida';
          END IF;
        EXCEPTION WHEN OTHERS THEN
          RAISE EXCEPTION 'Data inválida: %.',k USING ERRCODE='22023';
        END;
      ELSIF typ='url' AND (v#>>'{}') !~* '^https?://[^/@[:space:]]+(:[0-9]+)?([/?#][^[:space:]]*)?$' THEN
        RAISE EXCEPTION 'URL inválida: %.',k USING ERRCODE='22023';
      ELSIF typ='file' AND (v#>>'{}') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RAISE EXCEPTION 'Identificador de anexo inválido: %.',k USING ERRCODE='22023';
      END IF;
    ELSE
      RAISE EXCEPTION 'Tipo de campo não suportado: %.',typ USING ERRCODE='22023';
    END IF;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION private.validate_technical_fields(jsonb,jsonb,text[],boolean) FROM PUBLIC,anon,authenticated;

CREATE TABLE private.workforce_sheet_templates (
  setor text NOT NULL, versao integer NOT NULL CHECK(versao>0), definition jsonb NOT NULL,
  PRIMARY KEY(setor,versao)
);
INSERT INTO private.workforce_sheet_templates(setor,versao,definition)
SELECT x->>'setor',(x->>'versao')::integer,x FROM jsonb_array_elements('[{"setor":"corte","versao":1,"titulo":"Ficha técnica de corte","campos":[{"key":"pecas","label":"Peças do plano de corte","type":"table","unique_key":"codigo","columns":[{"key":"codigo","label":"Código da peça","type":"text","required":true},{"key":"descricao","label":"Descrição da peça","type":"text"},{"key":"material","label":"Material utilizado","type":"text"},{"key":"tipo_material","label":"Tipo de material","type":"text"},{"key":"espessura","label":"Espessura (mm)","type":"number"},{"key":"comprimento","label":"Comprimento (mm)","type":"number"},{"key":"largura","label":"Largura (mm)","type":"number"},{"key":"quantidade","label":"Quantidade de peças","type":"integer","required":true},{"key":"unidade","label":"Unidade de medida","type":"text"},{"key":"sentido_veio","label":"Sentido do veio","type":"text"},{"key":"tipo_corte","label":"Tipo de corte","type":"text"},{"key":"tolerancia","label":"Tolerância dimensional (mm)","type":"number"},{"key":"chapa_lote","label":"Identificação da chapa ou lote","type":"text"}]},{"key":"maquina","label":"Máquina utilizada","type":"text"},{"key":"plano_corte","label":"Plano de corte","type":"file"},{"key":"desenho_tecnico","label":"Desenho técnico","type":"file"},{"key":"observacoes","label":"Observações técnicas","type":"textarea"}],"checklist":[{"key":"material_conferido","label":"Material e lote conferidos"},{"key":"plano_conferido","label":"Plano de corte e sentido do veio conferidos"},{"key":"medidas_conferidas","label":"Medidas e tolerâncias conferidas"},{"key":"pecas_identificadas","label":"Peças identificadas e quantidades conferidas"},{"key":"qualidade_aprovada","label":"Checklist de qualidade aprovado"}]},{"setor":"montagem","versao":1,"titulo":"Ficha técnica de montagem","campos":[{"key":"produto","label":"Nome do produto","type":"text"},{"key":"codigo_produto","label":"Código do produto","type":"text"},{"key":"quantidade","label":"Quantidade de unidades","type":"integer"},{"key":"componentes","label":"Componentes e peças recebidas","type":"table","unique_key":"codigo","columns":[{"key":"codigo","label":"Código do componente","type":"text","required":true},{"key":"descricao","label":"Descrição","type":"text"},{"key":"quantidade","label":"Quantidade necessária","type":"number"},{"key":"recebida","label":"Quantidade de peças recebidas","type":"number"}]},{"key":"estrutura","label":"Tipo de estrutura","type":"text"},{"key":"fixacao","label":"Tipo de fixação","type":"text"},{"key":"ferragens","label":"Ferragens necessárias","type":"textarea"},{"key":"parafusos_conectores","label":"Parafusos e conectores","type":"textarea"},{"key":"dobradicas","label":"Dobradiças","type":"text"},{"key":"corredicas","label":"Corrediças","type":"text"},{"key":"acessorios","label":"Acessórios","type":"textarea"},{"key":"ferramentas","label":"Ferramentas necessárias","type":"textarea"},{"key":"desenho_tecnico","label":"Desenho técnico","type":"file"},{"key":"manual","label":"Manual ou instruções de montagem","type":"file"},{"key":"observacoes","label":"Observações do projeto","type":"textarea"}],"checklist":[{"key":"pecas","label":"Conferência das peças recebidas"},{"key":"medidas","label":"Verificação das medidas"},{"key":"componentes","label":"Conferência dos componentes"},{"key":"ferragens","label":"Verificação das ferragens"},{"key":"alinhamento","label":"Alinhamento da estrutura"},{"key":"fixacao","label":"Fixação dos componentes"},{"key":"funcionamento","label":"Teste de funcionamento"},{"key":"inspecao","label":"Inspeção visual"},{"key":"aprovacao","label":"Aprovação para próxima etapa"}]},{"setor":"acabamento","versao":1,"titulo":"Ficha técnica de acabamento","campos":[{"key":"produto","label":"Produto","type":"text"},{"key":"tipo_acabamento","label":"Tipo de acabamento","type":"text"},{"key":"cor","label":"Cor especificada","type":"text"},{"key":"codigo_cor","label":"Código da cor","type":"text"},{"key":"textura","label":"Textura","type":"text"},{"key":"tinta_verniz","label":"Tipo de tinta ou verniz","type":"text"},{"key":"fabricante","label":"Fabricante do produto","type":"text"},{"key":"codigo_material","label":"Código do material","type":"text"},{"key":"lote","label":"Lote utilizado","type":"text"},{"key":"quantidade_aplicada","label":"Quantidade de produto aplicada","type":"number"},{"key":"unidade_aplicacao","label":"Unidade do produto aplicado","type":"text"},{"key":"lixamento","label":"Tipo de lixamento","type":"text"},{"key":"granulacao","label":"Granulação da lixa","type":"text"},{"key":"metodo","label":"Método de aplicação","type":"text"},{"key":"equipamento","label":"Equipamento utilizado","type":"text"},{"key":"demaos","label":"Quantidade de demãos","type":"integer"},{"key":"intervalo_minutos","label":"Intervalo entre aplicações (minutos)","type":"integer"},{"key":"secagem_minutos","label":"Tempo previsto de secagem (minutos)","type":"integer"},{"key":"condicoes_ambientais","label":"Temperatura ou condições ambientais","type":"textarea"},{"key":"observacoes","label":"Observações técnicas","type":"textarea"}],"checklist":[{"key":"superficie","label":"Preparação da superfície"},{"key":"lixamento","label":"Lixamento realizado"},{"key":"limpeza","label":"Limpeza da peça"},{"key":"primeira_demao","label":"Aplicação da primeira demão"},{"key":"demaos_adicionais","label":"Aplicação das demãos adicionais"},{"key":"secagem","label":"Tempo de secagem respeitado"},{"key":"cor","label":"Conferência da cor"},{"key":"textura","label":"Conferência da textura"},{"key":"manchas","label":"Ausência de manchas"},{"key":"bolhas","label":"Ausência de bolhas"},{"key":"imperfeicoes","label":"Ausência de imperfeições"},{"key":"inspecao_final","label":"Inspeção final"}]},{"setor":"instalacao","versao":1,"titulo":"Ficha técnica de instalação","campos":[{"key":"endereco","label":"Endereço da instalação","type":"text","section":"Local do serviço","privacy":"cliente"},{"key":"numero","label":"Número","type":"text","section":"Local do serviço","privacy":"cliente"},{"key":"complemento","label":"Complemento","type":"text","section":"Local do serviço","privacy":"cliente"},{"key":"bairro","label":"Bairro","type":"text","section":"Local do serviço","privacy":"cliente"},{"key":"cidade","label":"Cidade","type":"text","section":"Local do serviço","privacy":"cliente"},{"key":"cep","label":"CEP","type":"text","section":"Local do serviço","privacy":"cliente"},{"key":"referencia","label":"Ponto de referência","type":"text","section":"Local do serviço","privacy":"cliente"},{"key":"contato","label":"Contato autorizado do cliente","type":"text","section":"Local do serviço","privacy":"cliente"},{"key":"telefone","label":"Telefone de contato","type":"text","section":"Local do serviço","privacy":"cliente"},{"key":"localizacao_link","label":"Link de localização do serviço","type":"url","section":"Local do serviço","privacy":"cliente"},{"key":"produto","label":"Produto a instalar","type":"text"},{"key":"quantidade","label":"Quantidade de itens","type":"integer"},{"key":"dimensoes","label":"Dimensões","type":"text"},{"key":"local_instalacao","label":"Local de instalação","type":"text"},{"key":"superficie","label":"Tipo de superfície","type":"text"},{"key":"fixacao","label":"Método de fixação","type":"text"},{"key":"ferramentas","label":"Ferramentas necessárias","type":"textarea"},{"key":"materiais","label":"Materiais necessários","type":"textarea"},{"key":"acessorios","label":"Acessórios","type":"textarea"},{"key":"desenho_tecnico","label":"Desenho técnico","type":"file"},{"key":"instrucoes","label":"Instruções específicas","type":"textarea"},{"key":"restricoes","label":"Restrições de acesso ao local","type":"textarea"}],"checklist":[{"key":"produtos","label":"Produtos conferidos","section":"Antes da saída"},{"key":"materiais","label":"Materiais separados","section":"Antes da saída"},{"key":"ferramentas","label":"Ferramentas conferidas","section":"Antes da saída"},{"key":"acessorios","label":"Acessórios conferidos","section":"Antes da saída"},{"key":"endereco","label":"Endereço confirmado","section":"Antes da saída"},{"key":"agendamento","label":"Agendamento confirmado","section":"Antes da saída"},{"key":"ambiente","label":"Conferência do ambiente","section":"Durante a instalação"},{"key":"medidas","label":"Verificação das medidas","section":"Durante a instalação"},{"key":"posicionamento","label":"Posicionamento do produto","section":"Durante a instalação"},{"key":"fixacao","label":"Fixação","section":"Durante a instalação"},{"key":"nivelamento","label":"Nivelamento","section":"Durante a instalação"},{"key":"ajustes","label":"Ajustes","section":"Durante a instalação"},{"key":"testes","label":"Testes de funcionamento","section":"Durante a instalação"},{"key":"limpeza","label":"Limpeza do ambiente","section":"Finalização"},{"key":"qualidade","label":"Conferência de qualidade","section":"Finalização"},{"key":"fotografias","label":"Fotografias do serviço","section":"Finalização"},{"key":"pendencias","label":"Registro de pendências","section":"Finalização"},{"key":"entrega","label":"Confirmação de entrega","section":"Finalização"},{"key":"aceite_cliente","label":"Aceite do cliente","section":"Finalização","automatic":true}]},{"setor":"estoque","versao":1,"titulo":"Ficha técnica de material","campos":[{"key":"codigo","label":"Código interno","type":"text","source":"codigo"},{"key":"nome","label":"Nome do material","type":"text","source":"nome"},{"key":"unidade","label":"Unidade de medida","type":"text","source":"unidade"},{"key":"saldo","label":"Quantidade disponível","type":"number","source":"saldo","readOnly":true},{"key":"reservada","label":"Quantidade reservada","type":"number","source":"reservada","readOnly":true},{"key":"minimo","label":"Quantidade mínima","type":"number","source":"estoque_minimo"},{"key":"sku","label":"SKU","type":"text"},{"key":"categoria","label":"Categoria","type":"text"},{"key":"subcategoria","label":"Subcategoria","type":"text"},{"key":"descricao","label":"Descrição técnica","type":"textarea"},{"key":"marca","label":"Marca","type":"text"},{"key":"fabricante","label":"Fabricante","type":"text"},{"key":"modelo","label":"Modelo","type":"text"},{"key":"maximo","label":"Quantidade máxima","type":"number"},{"key":"localizacao","label":"Localização no estoque","type":"text"},{"key":"prateleira","label":"Prateleira ou posição","type":"text"},{"key":"lote","label":"Número do lote","type":"text"},{"key":"validade","label":"Data de validade","type":"date"},{"key":"fornecedor","label":"Fornecedor","type":"text"},{"key":"custo_unitario","label":"Custo unitário","type":"number","privacy":"estrategico"},{"key":"observacoes","label":"Observações","type":"textarea"},{"key":"foto","label":"Foto do material","type":"file"}],"checklist":[{"key":"material","label":"Material e unidade conferidos"},{"key":"quantidade","label":"Quantidade e reserva conferidas"},{"key":"lote","label":"Lote e validade conferidos"},{"key":"registro","label":"Movimentação registrada com motivo e responsável"}]},{"setor":"financeiro","versao":1,"titulo":"Ficha administrativa da ordem","campos":[{"key":"produto_servico","label":"Produto ou serviço","type":"text"},{"key":"descricao","label":"Descrição do pedido","type":"textarea"},{"key":"quantidade","label":"Quantidade","type":"number"},{"key":"unidade","label":"Unidade","type":"text"},{"key":"instrucoes_producao","label":"Instruções para produção","type":"textarea"},{"key":"condicoes_comerciais","label":"Condições comerciais autorizadas","type":"textarea","privacy":"comercial"},{"key":"condicoes_pagamento","label":"Condições de pagamento","type":"textarea","privacy":"comercial"},{"key":"validade_proposta","label":"Validade da proposta","type":"date","privacy":"comercial"},{"key":"observacoes","label":"Observações administrativas","type":"textarea"}],"checklist":[{"key":"cadastro","label":"Cadastro e contato autorizados conferidos"},{"key":"projeto","label":"Projeto e especificações conferidos"},{"key":"aprovacao","label":"Pedido e alterações aprovados"},{"key":"prazo","label":"Prazo e prioridade definidos"},{"key":"documentos","label":"Documentos técnicos anexados"},{"key":"liberacao","label":"Liberação para produção autorizada"}]}]'::jsonb) x;

CREATE TABLE private.workforce_service_sheets (
  servico_id uuid NOT NULL REFERENCES public.servicos(id),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  responsavel_id uuid,
  setor text NOT NULL, template_versao integer NOT NULL,
  dados jsonb NOT NULL DEFAULT '{}', checklist jsonb NOT NULL DEFAULT '{}', versao integer NOT NULL DEFAULT 1,
  atualizado_por uuid NOT NULL REFERENCES auth.users(id),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(servico_id,setor),
  FOREIGN KEY(setor,template_versao) REFERENCES private.workforce_sheet_templates(setor,versao),
  FOREIGN KEY(tenant_id,responsavel_id) REFERENCES public.profiles(tenant_id,id)
);
ALTER TABLE private.workforce_sheet_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.workforce_service_sheets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.workforce_sheet_templates,private.workforce_service_sheets FROM PUBLIC,anon,authenticated;
CREATE INDEX workforce_sheets_tenant ON private.workforce_service_sheets(tenant_id,servico_id);

CREATE FUNCTION private.sheet_privacy(p_tenant uuid,p_setor text,p_assigned boolean) RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT array_remove(ARRAY[
    CASE WHEN private.operational_permission(p_tenant,'clientes','visualizar',p_setor,p_assigned) THEN 'cliente' END,
    CASE WHEN private.operational_permission(p_tenant,'orcamentos','visualizar',p_setor,p_assigned) THEN 'comercial' END,
    CASE WHEN private.operational_permission(p_tenant,'financeiro','ver_sensiveis',p_setor,p_assigned) THEN 'estrategico' END
  ],NULL);
$$;
REVOKE ALL ON FUNCTION private.sheet_privacy(uuid,text,boolean) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.ficha_servico_salvar(p_servico uuid,p_setor text,p_dados jsonb,p_versao integer) RETURNS jsonb
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
  -- Until private uploads are integrated, references cannot be introduced by typing UUIDs.
  FOR field IN SELECT * FROM jsonb_array_elements(definition->'campos') WHERE value->>'type'='file' LOOP
    IF p_dados ? (field->>'key') AND p_dados->(field->>'key') IS DISTINCT FROM coalesce(sheet.dados,'{}')->(field->>'key')
      AND p_dados->(field->>'key')<>'null'::jsonb THEN
      RAISE EXCEPTION 'Use o envio privado de anexos.' USING ERRCODE='42501';
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
REVOKE ALL ON FUNCTION public.ficha_servico_salvar(uuid,text,jsonb,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ficha_servico_salvar(uuid,text,jsonb,integer) TO authenticated;

CREATE FUNCTION public.ficha_servico_consultar(p_servico uuid,p_setor text) RETURNS jsonb
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
  IF NOT private.operational_permission(service.tenant_id,'ordens','visualizar',p_setor,sheet.responsavel_id=auth.uid()) THEN
    RAISE EXCEPTION 'Ficha indisponível.' USING ERRCODE='42501';
  END IF;
  SELECT t.definition INTO definition FROM private.workforce_sheet_templates t WHERE t.setor=sheet.setor AND t.versao=sheet.template_versao;
  allowed:=private.sheet_privacy(service.tenant_id,p_setor,sheet.responsavel_id=auth.uid());
  SELECT coalesce(jsonb_agg(f),'[]') INTO visible_fields FROM jsonb_array_elements(definition->'campos') f
    WHERE NOT f ? 'privacy' OR f->>'privacy'=ANY(allowed);
  SELECT coalesce(jsonb_object_agg(d.key,d.value),'{}') INTO visible_data FROM jsonb_each(sheet.dados) d
    WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(visible_fields) f WHERE f->>'key'=d.key);
  RETURN jsonb_build_object('servico_id',p_servico,'setor',p_setor,'versao',sheet.versao,
    'modelo',definition||jsonb_build_object('campos',visible_fields),'dados',visible_data,'checklist',sheet.checklist,'responsavel_id',sheet.responsavel_id,'privacidade_autorizada',allowed);
END;
$$;
REVOKE ALL ON FUNCTION public.ficha_servico_consultar(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ficha_servico_consultar(uuid,text) TO authenticated;

CREATE FUNCTION public.minhas_fichas_servicos(p_pagina integer DEFAULT 0,p_busca text DEFAULT '') RETURNS jsonb
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
    WHERE private.operational_permission(s.tenant_id,'ordens','visualizar',f.setor,f.responsavel_id=auth.uid())
      AND (p_busca='' OR position(lower(p_busca) IN lower(coalesce(s.titulo,'')||' '||s.nome))>0)
    ORDER BY f.atualizado_em DESC,s.id,f.setor LIMIT 21 OFFSET p_pagina*20
  ) items;
  RETURN jsonb_build_object('itens',CASE WHEN jsonb_array_length(result)>20 THEN result-20 ELSE result END,
    'tem_mais',jsonb_array_length(result)>20,'pagina',p_pagina);
END;
$$;
REVOKE ALL ON FUNCTION public.minhas_fichas_servicos(integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.minhas_fichas_servicos(integer,text) TO authenticated;

CREATE FUNCTION public.ficha_checklist_salvar(p_servico uuid,p_setor text,p_itens jsonb,p_versao integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE service public.servicos%ROWTYPE; sheet private.workforce_service_sheets%ROWTYPE;
  definition jsonb; item record; config jsonb; result_version integer;
BEGIN
  PERFORM private.require_authorized_session();
  SELECT * INTO service FROM public.servicos WHERE id=p_servico FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sem permissão para alterar este checklist.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO sheet FROM private.workforce_service_sheets WHERE servico_id=p_servico AND setor=p_setor AND tenant_id=service.tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ficha indisponível.' USING ERRCODE='42501'; END IF;
  IF NOT private.operational_permission(service.tenant_id,'ordens','editar',p_setor,sheet.responsavel_id=auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para alterar este checklist.' USING ERRCODE='42501';
  END IF;
  IF p_versao IS DISTINCT FROM sheet.versao THEN RAISE EXCEPTION 'Ficha alterada. Recarregue.' USING ERRCODE='40001'; END IF;
  IF jsonb_typeof(p_itens) IS DISTINCT FROM 'object' OR octet_length(p_itens::text)>10000 THEN
    RAISE EXCEPTION 'Checklist inválido.' USING ERRCODE='22023';
  END IF;
  SELECT t.definition INTO definition FROM private.workforce_sheet_templates t WHERE t.setor=sheet.setor AND t.versao=sheet.template_versao;
  FOR item IN SELECT * FROM jsonb_each(p_itens) LOOP
    SELECT c INTO config FROM jsonb_array_elements(definition->'checklist') c WHERE c->>'key'=item.key;
    IF config IS NULL OR jsonb_typeof(item.value)<>'boolean' THEN
      RAISE EXCEPTION 'Item de checklist inválido: %.',item.key USING ERRCODE='22023';
    END IF;
    IF coalesce((config->>'automatic')::boolean,false) THEN
      RAISE EXCEPTION 'Este item exige evidência registrada: %.',item.key USING ERRCODE='42501';
    END IF;
  END LOOP;
  UPDATE private.workforce_service_sheets SET checklist=checklist||p_itens,versao=versao+1,
    atualizado_por=auth.uid(),atualizado_em=now()
    WHERE servico_id=p_servico AND setor=p_setor RETURNING versao INTO result_version;
  INSERT INTO public.audit_logs(tenant_id,actor_id,acao,tabela,registro_id,detalhes)
    VALUES(service.tenant_id,auth.uid(),'checklist_atualizado','workforce_service_sheets',p_servico::text,
      jsonb_build_object('setor',p_setor,'versao_anterior',sheet.versao,'versao',result_version,'antes',sheet.checklist,'alteracoes',p_itens));
  RETURN jsonb_build_object('versao',result_version,'checklist',sheet.checklist||p_itens);
END;
$$;
REVOKE ALL ON FUNCTION public.ficha_checklist_salvar(uuid,text,jsonb,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ficha_checklist_salvar(uuid,text,jsonb,integer) TO authenticated;

CREATE FUNCTION public.ficha_responsavel_definir(p_servico uuid,p_setor text,p_responsavel uuid,p_versao integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE service public.servicos%ROWTYPE; sheet private.workforce_service_sheets%ROWTYPE; result_version integer;
BEGIN
  PERFORM private.require_authorized_session();
  SELECT * INTO service FROM public.servicos WHERE id=p_servico FOR UPDATE;
  IF NOT FOUND OR NOT private.operational_owner(service.tenant_id) THEN
    RAISE EXCEPTION 'Somente o proprietário pode atribuir esta ficha.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO sheet FROM private.workforce_service_sheets WHERE servico_id=p_servico AND setor=p_setor AND tenant_id=service.tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ficha indisponível.' USING ERRCODE='42501'; END IF;
  IF p_versao IS DISTINCT FROM sheet.versao THEN RAISE EXCEPTION 'Ficha alterada. Recarregue.' USING ERRCODE='40001'; END IF;
  IF p_responsavel IS NOT NULL THEN
    PERFORM 1 FROM public.profiles WHERE id=p_responsavel AND tenant_id=service.tenant_id AND ativo FOR SHARE;
    IF NOT FOUND OR NOT private.employee_has_sector(p_responsavel,service.tenant_id,p_setor) OR NOT private.user_within_plan(p_responsavel) THEN
      RAISE EXCEPTION 'Funcionário indisponível ou sem autorização para este setor.' USING ERRCODE='42501';
    END IF;
  END IF;
  UPDATE private.workforce_service_sheets SET responsavel_id=p_responsavel,versao=versao+1,atualizado_por=auth.uid(),atualizado_em=now()
    WHERE servico_id=p_servico AND setor=p_setor RETURNING versao INTO result_version;
  INSERT INTO public.audit_logs(tenant_id,actor_id,acao,tabela,registro_id,detalhes)
    VALUES(service.tenant_id,auth.uid(),'ficha_responsavel_alterado','workforce_service_sheets',p_servico::text,
      jsonb_build_object('setor',p_setor,'responsavel_anterior',sheet.responsavel_id,'responsavel',p_responsavel,'versao',result_version));
  RETURN jsonb_build_object('responsavel_id',p_responsavel,'versao',result_version);
END;
$$;
REVOKE ALL ON FUNCTION public.ficha_responsavel_definir(uuid,text,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ficha_responsavel_definir(uuid,text,uuid,integer) TO authenticated;

CREATE FUNCTION public.ficha_responsaveis_disponiveis(p_servico uuid,p_setor text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE company uuid; result jsonb;
BEGIN
  PERFORM private.require_authorized_session();
  SELECT tenant_id INTO company FROM public.servicos WHERE id=p_servico;
  IF company IS NULL OR NOT private.operational_owner(company) THEN
    RAISE EXCEPTION 'Somente o proprietário pode consultar responsáveis.' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM private.workforce_sheet_templates WHERE setor=p_setor) THEN
    RAISE EXCEPTION 'Setor inválido.' USING ERRCODE='22023';
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nome',p.nome_completo,'cargo',p.cargo) ORDER BY p.nome_completo,p.id),'[]')
    INTO result FROM public.profiles p WHERE p.tenant_id=company AND p.ativo
      AND private.employee_has_sector(p.id,company,p_setor) AND private.user_within_plan(p.id);
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.ficha_responsaveis_disponiveis(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ficha_responsaveis_disponiveis(uuid,text) TO authenticated;

COMMIT;
