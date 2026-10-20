-- Proposta complementar: saldo transacional, em ambiente de homologação.
-- Depende de pge2_estoque_base.sql. Não executar em produção.
BEGIN;
ALTER TABLE public.estoque_itens
 ADD COLUMN saldo numeric(14,3) NOT NULL DEFAULT 0 CHECK (saldo >= 0);

CREATE OR REPLACE FUNCTION public.estoque_registrar_movimento(
 p_item_id uuid, p_tipo text, p_quantidade numeric,
 p_motivo text, p_projeto_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $stock$
DECLARE
 v_tenant uuid;
 v_papel text;
 v_ativo boolean;
 v_saldo numeric(14,3);
 v_mov_id uuid;
 v_delta numeric(14,3);
BEGIN
 v_tenant := private.current_tenant_id();
 IF auth.uid() IS NULL OR v_tenant IS NULL THEN
  RAISE EXCEPTION 'Sessão inválida' USING ERRCODE = '42501';
 END IF;
 SELECT p.papel, p.ativo INTO v_papel, v_ativo
 FROM public.profiles p WHERE p.id = auth.uid() AND p.tenant_id = v_tenant;
 IF NOT FOUND OR v_ativo IS DISTINCT FROM true OR v_papel NOT IN ('AdministradorTenant','Gerente','Estoque') THEN
  RAISE EXCEPTION 'Operação não autorizada' USING ERRCODE = '42501';
 END IF;
 IF p_tipo IS NULL OR p_tipo NOT IN ('entrada','saida','ajuste_entrada','ajuste_saida')
    OR p_quantidade IS NULL OR p_quantidade <= 0
    OR p_quantidade > 99999999999.999
    OR p_quantidade <> round(p_quantidade, 3)
    OR p_motivo IS NULL OR length(trim(p_motivo)) = 0 THEN
  RAISE EXCEPTION 'Movimentação inválida' USING ERRCODE = '22023';
 END IF;
 IF p_projeto_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM public.projetos_marcenaria
  WHERE id = p_projeto_id AND tenant_id = v_tenant
 ) THEN
  RAISE EXCEPTION 'Projeto de outra empresa ou inexistente' USING ERRCODE = '23514';
 END IF;
 v_delta := CASE WHEN p_tipo IN ('entrada','ajuste_entrada') THEN p_quantidade ELSE -p_quantidade END;
 UPDATE public.estoque_itens SET saldo = saldo + v_delta
 WHERE id = p_item_id AND tenant_id = v_tenant AND ativo = true
   AND saldo + v_delta >= 0
 RETURNING saldo INTO v_saldo;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Item indisponível ou saldo insuficiente' USING ERRCODE = '23514';
 END IF;
 INSERT INTO public.estoque_movimentacoes
 (tenant_id,item_id,tipo,quantidade,motivo,projeto_id,criado_por)
 VALUES (v_tenant,p_item_id,p_tipo,p_quantidade,p_motivo,p_projeto_id,auth.uid())
 RETURNING id INTO v_mov_id;
 RETURN v_mov_id;
END;
$stock$;
REVOKE ALL ON FUNCTION public.estoque_registrar_movimento(uuid,text,numeric,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.estoque_registrar_movimento(uuid,text,numeric,text,uuid) TO authenticated;
COMMIT;
