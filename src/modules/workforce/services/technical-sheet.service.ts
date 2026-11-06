import { supabase } from '@/lib/supabase';
import { isSetor } from '@/lib/setores';
import type { TechnicalField } from '../lib/technical-sheet';

export type ServiceSheet = {
  servico_id: string;
  setor: string;
  versao: number;
  responsavel_id: string | null;
  status: 'pendente' | 'em_andamento' | 'pausada' | 'concluida';
  iniciada_em: string | null;
  concluida_em: string | null;
  inicio_liberado: boolean;
  bloqueio_fluxo: 'fora_fluxo' | 'etapa_anterior' | null;
  pode_editar: boolean;
  pode_anexar: boolean;
  pode_comunicar: boolean;
  acoes_execucao: string[];
  modelo: { titulo: string; campos: TechnicalField[]; checklist: {key:string;label:string;automatic?:boolean}[] };
  checklist: Record<string, boolean>;
  dados: Record<string, unknown>;
  privacidade_autorizada: string[];
};

export type FinishingDryingState = {
  iniciada_em: string | null;
  prevista_ate: string | null;
  em_secagem: boolean;
  servidor_agora: string | null;
  versao: number;
};

export type ProductionEntry = {
  id: string;
  tipo: 'produzido' | 'defeito' | 'desperdicio';
  quantidade: number;
  unidade: string;
  descricao: string;
  criado_em: string;
};

export type ProductionState = {
  versao: number;
  totais: { produzido: number; defeito: number; desperdicio: number };
  registros: ProductionEntry[];
};

export type MaterialOption = { id: string; nome: string; unidade: string; saldo: number };
export type MaterialRequest = {
  id: string;
  servico_id: string;
  setor_solicitante: string;
  item_id: string;
  item_nome: string;
  quantidade: number;
  unidade: string;
  motivo: string;
  status: 'pendente' | 'aprovada' | 'recusada' | 'atendida' | 'cancelada';
  versao: number;
  criado_em: string;
  decidido_em: string | null;
  atendido_em: string | null;
};
export type MaterialStockRequest = MaterialRequest & { servico_nome: string; solicitante_nome: string };

function normalizeServiceList(value: unknown): { itens: { servico_id: string; titulo: string; setor: string; versao: number; atualizado_em: string }[]; tem_mais: boolean; pagina: number } | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const itens = Array.isArray(source.itens) ? source.itens.map(item => {
    if (!item || typeof item !== 'object') return null;
    const row = item as Record<string, unknown>;
    const servicoId = String(row.servico_id ?? '');
    const setor = String(row.setor ?? '');
    if (!servicoId || !isSetor(setor)) return null;
    return {
      servico_id: servicoId,
      titulo: String(row.titulo ?? 'Serviço sem título'),
      setor,
      versao: Number.isFinite(Number(row.versao)) ? Number(row.versao) : 0,
      atualizado_em: String(row.atualizado_em ?? ''),
    };
  }).filter((item): item is NonNullable<typeof item> => item !== null) : [];
  return { itens, tem_mais: source.tem_mais === true, pagina: Number.isFinite(Number(source.pagina)) ? Number(source.pagina) : 0 };
}

export const technicalSheets = {
  async execute(service:string,sector:string,action:'iniciar'|'pausar'|'concluir',version:number):Promise<Pick<ServiceSheet,'status'|'versao'|'iniciada_em'|'concluida_em'|'inicio_liberado'|'bloqueio_fluxo'>> {
    const {data,error}=await supabase.rpc('ficha_execucao_atualizar',{p_servico:service,p_setor:sector,p_acao:action,p_versao:version});
    if(error || !data)throw new Error(error?.code==='40001'?'A ficha foi alterada. Recarregue antes de continuar.':error?.message||'Não foi possível atualizar a execução.');
    return data;
  },
  async candidates(service: string, sector: string): Promise<{id:string;nome:string;cargo:string|null}[]> {
    const { data, error } = await supabase.rpc('ficha_responsaveis_disponiveis', {p_servico:service,p_setor:sector});
    if (error || !data) throw new Error(error?.message || 'Não foi possível carregar os responsáveis.');
    return data;
  },
  async assign(service: string, sector: string, employee: string | null, version: number): Promise<{responsavel_id:string|null;versao:number}> {
    const { data, error } = await supabase.rpc('ficha_responsavel_definir', {p_servico:service,p_setor:sector,p_responsavel:employee,p_versao:version});
    if (error || !data) throw new Error(error?.code === '40001' ? 'A ficha foi alterada. Recarregue antes de atribuir o responsável.' : error?.message || 'Não foi possível atualizar o responsável.');
    return data;
  },
  async checklist(service: string, sector: string, items: Record<string, boolean>, version: number): Promise<{versao:number;checklist:Record<string,boolean>}> {
    const { data, error } = await supabase.rpc('ficha_checklist_salvar', {p_servico:service,p_setor:sector,p_itens:items,p_versao:version});
    if (error || !data) throw new Error(error?.code === '40001' ? 'Outra pessoa atualizou esta ficha. Recarregue antes de continuar.' : error?.message || 'Não foi possível salvar o checklist.');
    return data;
  },
  async list(page: number, search: string): Promise<{itens: {servico_id:string;titulo:string;setor:string;versao:number;atualizado_em:string}[];tem_mais:boolean;pagina:number}> {
    const { data, error } = await supabase.rpc('minhas_fichas_servicos', { p_pagina: page, p_busca: search });
    if (error || !data) throw new Error(error?.message || 'Não foi possível carregar suas fichas.');
    const normalized = normalizeServiceList(data);
    if (!normalized) throw new Error('As fichas retornaram dados inválidos.');
    return normalized;
  },
  async load(service: string, sector: string): Promise<ServiceSheet> {
    const { data, error } = await supabase.rpc('ficha_execucao_consultar', { p_servico: service, p_setor: sector });
    if (error || !data) throw new Error(error?.message || 'Não foi possível carregar a ficha técnica.');
    return data;
  },
  async dryingLoad(service: string): Promise<FinishingDryingState> {
    const { data, error } = await supabase.rpc('acabamento_secagem_consultar', { p_servico: service });
    if (error || !data) throw new Error(error?.message || 'Não foi possível consultar a secagem do acabamento.');
    return data;
  },
  async dryingRegister(service: string, minutes: number, version: number): Promise<Pick<FinishingDryingState, 'prevista_ate' | 'em_secagem' | 'servidor_agora' | 'versao'>> {
    const { data, error } = await supabase.rpc('acabamento_secagem_registrar', { p_servico: service, p_minutos: minutes, p_versao: version });
    if (error || !data) throw new Error(error?.code === '40001' ? 'Outra pessoa atualizou esta ficha. Recarregue antes de registrar a secagem.' : error?.message || 'Não foi possível registrar a secagem.');
    return data;
  },
  async productionLoad(service: string, sector: string): Promise<ProductionState> {
    const { data, error } = await supabase.rpc('ficha_producao_consultar', { p_servico: service, p_setor: sector });
    if (error || !data) throw new Error(error?.message || 'Não foi possível consultar os registros de produção.');
    return data;
  },
  async productionRegister(service: string, sector: string, input: { request: string; type: ProductionEntry['tipo']; quantity: number; unit: string; description: string }, version: number): Promise<ProductionState & { repetida?: boolean }> {
    const { data, error } = await supabase.rpc('ficha_producao_registrar', {
      p_requisicao: input.request, p_servico: service, p_setor: sector, p_tipo: input.type,
      p_quantidade: input.quantity, p_unidade: input.unit, p_descricao: input.description, p_versao: version,
    });
    if (error || !data) throw new Error(error?.code === '40001' ? 'Outra pessoa atualizou esta ficha. Recarregue antes de registrar a produção.' : error?.message || 'Não foi possível registrar a produção.');
    return data;
  },
  async materialOptions(service: string, sector: string): Promise<MaterialOption[]> {
    const { data, error } = await supabase.rpc('material_solicitacao_materiais', { p_servico: service, p_setor: sector });
    if (error || !data) throw new Error(error?.message || 'Não foi possível consultar os materiais disponíveis.');
    return data;
  },
  async materialRequests(service: string, sector: string): Promise<MaterialRequest[]> {
    const { data, error } = await supabase.rpc('material_solicitacao_listar', { p_servico: service, p_setor: sector });
    if (error || !data) throw new Error(error?.message || 'Não foi possível consultar as solicitações de material.');
    return data;
  },
  async materialStockRequests(status: string|null = null): Promise<MaterialStockRequest[]> {
    const { data, error } = await supabase.rpc('material_solicitacao_painel_estoque', { p_status: status });
    if (error || !data) throw new Error(error?.message || 'Não foi possível consultar as solicitações do estoque.');
    return data;
  },
  async materialRequestCreate(service: string, sector: string, input: { request: string; item: string; quantity: number; unit: string; reason: string }): Promise<{ id: string; status: string; versao: number; repetida?: boolean }> {
    const { data, error } = await supabase.rpc('material_solicitacao_criar', { p_requisicao: input.request, p_servico: service, p_setor: sector, p_item_id: input.item, p_quantidade: input.quantity, p_unidade: input.unit, p_motivo: input.reason });
    if (error || !data) throw new Error(error?.code === '23505' ? 'Esta solicitação já foi enviada com outros dados.' : error?.message || 'Não foi possível solicitar o material.');
    return data;
  },
  async materialRequestUpdate(id: string, action: 'cancelar'|'aprovar'|'recusar'|'atender', version: number, reason?: string): Promise<{ id: string; status: string; versao: number }> {
    const { data, error } = await supabase.rpc('material_solicitacao_atualizar', { p_id: id, p_acao: action, p_versao: version, p_motivo: reason ?? null });
    if (error || !data) throw new Error(error?.code === '40001' ? 'A solicitação foi alterada. Atualize a lista.' : error?.message || 'Não foi possível atualizar a solicitação.');
    return data;
  },
  async save(service: string, sector: string, values: Record<string, unknown>, version: number): Promise<number> {
    const { data, error } = await supabase.rpc('ficha_servico_salvar', { p_servico: service, p_setor: sector, p_dados: values, p_versao: version });
    if (error || !data) throw new Error(error?.code === '40001' ? 'Outra pessoa atualizou esta ficha. Recarregue antes de salvar novamente.' : error?.message || 'Não foi possível salvar a ficha técnica.');
    return data.versao;
  },
};

