ALTER TABLE public.estoque_itens
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS subcategoria text,
  ADD COLUMN IF NOT EXISTS descricao_tecnica text,
  ADD COLUMN IF NOT EXISTS marca text,
  ADD COLUMN IF NOT EXISTS fabricante text,
  ADD COLUMN IF NOT EXISTS modelo text,
  ADD COLUMN IF NOT EXISTS estoque_maximo numeric(14,3),
  ADD COLUMN IF NOT EXISTS localizacao text,
  ADD COLUMN IF NOT EXISTS prateleira text,
  ADD COLUMN IF NOT EXISTS lote text,
  ADD COLUMN IF NOT EXISTS validade date,
  ADD COLUMN IF NOT EXISTS fornecedor text,
  ADD COLUMN IF NOT EXISTS custo_unitario numeric(14,2),
  ADD COLUMN IF NOT EXISTS observacoes text;

ALTER TABLE public.estoque_itens
  DROP CONSTRAINT IF EXISTS estoque_itens_technical_values_ck;
ALTER TABLE public.estoque_itens
  ADD CONSTRAINT estoque_itens_technical_values_ck CHECK (
    (estoque_maximo IS NULL OR estoque_maximo >= estoque_minimo)
    AND (custo_unitario IS NULL OR custo_unitario >= 0)
  );
CREATE UNIQUE INDEX IF NOT EXISTS estoque_itens_sku_tenant_uniq
  ON public.estoque_itens (tenant_id, lower(sku)) WHERE sku IS NOT NULL;

CREATE OR REPLACE FUNCTION public.estoque_atualizar_dados_tecnicos(
  p_item_id uuid, p_dados jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE company uuid;
BEGIN
  PERFORM private.require_authorized_session();
  company := private.current_tenant_id();
  IF private.operational_permission(company,'estoque','editar','estoque',false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Sem permissão para editar materiais.' USING ERRCODE='42501';
  END IF;
  IF p_dados IS NULL OR jsonb_typeof(p_dados) <> 'object' THEN
    RAISE EXCEPTION 'Dados técnicos inválidos.' USING ERRCODE='22023';
  END IF;
  UPDATE public.estoque_itens
  SET sku = nullif(trim(p_dados->>'sku'),''),
      categoria = nullif(trim(p_dados->>'categoria'),''),
      subcategoria = nullif(trim(p_dados->>'subcategoria'),''),
      descricao_tecnica = nullif(trim(p_dados->>'descricao_tecnica'),''),
      marca = nullif(trim(p_dados->>'marca'),''),
      fabricante = nullif(trim(p_dados->>'fabricante'),''),
      modelo = nullif(trim(p_dados->>'modelo'),''),
      estoque_maximo = nullif(p_dados->>'estoque_maximo','')::numeric,
      localizacao = nullif(trim(p_dados->>'localizacao'),''),
      prateleira = nullif(trim(p_dados->>'prateleira'),''),
      lote = nullif(trim(p_dados->>'lote'),''),
      validade = nullif(p_dados->>'validade','')::date,
      fornecedor = nullif(trim(p_dados->>'fornecedor'),''),
      custo_unitario = nullif(p_dados->>'custo_unitario','')::numeric,
      observacoes = nullif(trim(p_dados->>'observacoes'),'')
  WHERE id = p_item_id AND tenant_id = company;
  IF NOT FOUND THEN RAISE EXCEPTION 'Material não encontrado.' USING ERRCODE='P0002'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.estoque_atualizar_dados_tecnicos(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.estoque_atualizar_dados_tecnicos(uuid,jsonb) TO authenticated;

