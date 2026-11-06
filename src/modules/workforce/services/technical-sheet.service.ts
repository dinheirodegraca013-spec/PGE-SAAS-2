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
const materialStatuses=['pendente','aprovada','recusada','atendida','cancelada'];
const isServiceSector=(service:unknown,sector:unknown):boolean=>typeof service==='string'&&service.trim().length>0&&typeof sector==='string'&&isSetor(sector);
const isDateOrNull=(value:unknown):value is string|null=>value===null||(typeof value==='string'&&Number.isFinite(new Date(value).getTime()));
function isMaterialOption(value: unknown): value is MaterialOption {
  if (!value || typeof value !== 'object') return false;
  const row=value as Record<string,unknown>;
  return typeof row.id==='string'&&typeof row.nome==='string'&&typeof row.unidade==='string'&&typeof row.saldo==='number'&&Number.isFinite(row.saldo)&&row.saldo>=0;
}
function isMaterialRequest(value: unknown, stock=false): value is MaterialRequest|MaterialStockRequest {
  if (!value || typeof value !== 'object') return false;
  const row=value as Record<string,unknown>;
  return typeof row.id==='string'&&row.id.length>0&&typeof row.servico_id==='string'&&row.servico_id.length>0&&typeof row.setor_solicitante==='string'&&isSetor(row.setor_solicitante)&&typeof row.item_id==='string'&&row.item_id.length>0&&typeof row.item_nome==='string'&&row.item_nome.length>0&&typeof row.quantidade==='number'&&Number.isFinite(row.quantidade)&&row.quantidade>0&&typeof row.unidade==='string'&&row.unidade.length>0&&typeof row.motivo==='string'&&row.motivo.length>0&&materialStatuses.includes(String(row.status))&&Number.isSafeInteger(row.versao)&&Number(row.versao)>=1&&typeof row.criado_em==='string'&&Number.isFinite(new Date(row.criado_em).getTime())&&isDateOrNull(row.decidido_em)&&isDateOrNull(row.atendido_em)&&(!stock||(typeof row.servico_nome==='string'&&row.servico_nome.length>0&&typeof row.solicitante_nome==='string'&&row.solicitante_nome.length>0));
}
const isMaterialMutation=(value:unknown,status?:string)=>Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&typeof (value as Record<string,unknown>).id==='string'&&typeof (value as Record<string,unknown>).status==='string'&&(!status||(value as Record<string,unknown>).status===status)&&Number.isSafeInteger((value as Record<string,unknown>).versao)&&Number((value as Record<string,unknown>).versao)>=1);

function normalizeServiceList(value: unknown): { itens: { servico_id: string; titulo: string; setor: string; versao: number; atualizado_em: string }[]; tem_mais: boolean; pagina: number } | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  if (!Array.isArray(source.itens) || typeof source.tem_mais !== 'boolean' || !Number.isSafeInteger(source.pagina) || Number(source.pagina)<0) return null;
  const itens = source.itens.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    if (typeof row.servico_id !== 'string' || !row.servico_id || typeof row.titulo !== 'string' || !row.titulo || typeof row.setor !== 'string' || !isSetor(row.setor) || !Number.isSafeInteger(row.versao) || Number(row.versao)<0 || typeof row.atualizado_em !== 'string' || !Number.isFinite(new Date(row.atualizado_em).getTime())) return null;
    return {servico_id:row.servico_id,titulo:row.titulo,setor:row.setor,versao:Number(row.versao),atualizado_em:row.atualizado_em};
  });
  if (itens.some(item=>item===null)) return null;
  return {itens:itens as { servico_id: string; titulo: string; setor: string; versao: number; atualizado_em: string }[],tem_mais:source.tem_mais,pagina:Number(source.pagina)};
}

function isTechnicalField(value: unknown): value is TechnicalField {
  if (!value || typeof value !== 'object') return false;
  const field = value as Record<string, unknown>;
  const types = ['text', 'textarea', 'number', 'integer', 'table', 'file', 'url', 'date'];
  return typeof field.key === 'string' && field.key.length>0 && typeof field.label === 'string' && field.label.length>0 && types.includes(String(field.type)) &&
    (field.columns === undefined || Array.isArray(field.columns) && field.columns.every(isTechnicalField) && new Set(field.columns.map(column => column.key)).size===field.columns.length);
}
const hasUniqueKeys=(items:unknown[]):boolean=>new Set(items.map(item => (item as {key:string}).key)).size===items.length;

function isServiceSheet(value: unknown): value is ServiceSheet {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  const model = row.modelo;
  const checklist = model && typeof model === 'object' ? (model as Record<string, unknown>).checklist : null;
  const checklistItems = Array.isArray(checklist) ? checklist : null;
  const modelRecord = model && typeof model === 'object' ? model as Record<string, unknown> : null;
  const fields = modelRecord && Array.isArray(modelRecord.campos) ? modelRecord.campos : null;
  const actions = row.acoes_execucao;
  const privacy = row.privacidade_autorizada;
  const checklistKeys = checklistItems?.map(item => (item as Record<string, unknown>).key) ?? [];
  return typeof row.servico_id === 'string' && isSetor(row.setor) && Number.isSafeInteger(row.versao) && Number(row.versao)>=0 &&
    (row.responsavel_id===null||typeof row.responsavel_id==='string') &&
    ['pendente', 'em_andamento', 'pausada', 'concluida'].includes(String(row.status)) &&
    isDateOrNull(row.iniciada_em) && isDateOrNull(row.concluida_em) &&
    typeof row.inicio_liberado==='boolean' && (row.bloqueio_fluxo===null||row.bloqueio_fluxo==='fora_fluxo'||row.bloqueio_fluxo==='etapa_anterior') &&
    typeof row.pode_editar==='boolean' && typeof row.pode_anexar==='boolean' && typeof row.pode_comunicar==='boolean' &&
    Array.isArray(actions) && actions.every(item => typeof item === 'string') &&
    Array.isArray(privacy) && privacy.every(item => typeof item === 'string') &&
    modelRecord !== null && typeof modelRecord.titulo === 'string' &&
    fields !== null && fields.every(isTechnicalField) && hasUniqueKeys(fields) &&
    checklistItems !== null && checklistItems.every(item => item && typeof item === 'object' && typeof (item as Record<string, unknown>).key === 'string' && (item as Record<string, unknown>).key && typeof (item as Record<string, unknown>).label === 'string' && (item as Record<string, unknown>).label && ((item as Record<string, unknown>).automatic===undefined||typeof (item as Record<string, unknown>).automatic==='boolean')) && hasUniqueKeys(checklistItems) &&
    !!row.checklist && typeof row.checklist === 'object' && !Array.isArray(row.checklist) && Object.values(row.checklist as Record<string, unknown>).every(item => typeof item === 'boolean') && Object.keys(row.checklist as Record<string, unknown>).every(key => checklistKeys.includes(key)) &&
    !!row.dados && typeof row.dados === 'object' && !Array.isArray(row.dados);
}

function isExecutionResult(value: unknown): value is Pick<ServiceSheet, 'status' | 'versao' | 'iniciada_em' | 'concluida_em' | 'inicio_liberado' | 'bloqueio_fluxo'> {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return ['pendente', 'em_andamento', 'pausada', 'concluida'].includes(String(row.status)) &&
    Number.isSafeInteger(row.versao) && Number(row.versao) >= 0 && typeof row.inicio_liberado === 'boolean' &&
    (row.bloqueio_fluxo === null || row.bloqueio_fluxo === 'fora_fluxo' || row.bloqueio_fluxo === 'etapa_anterior') &&
    isDateOrNull(row.iniciada_em) && isDateOrNull(row.concluida_em);
}

function isCandidate(value: unknown): value is {id:string;nome:string;cargo:string|null} {
  if (!value || typeof value !== 'object') return false;
  const row=value as Record<string,unknown>;
  return typeof row.id==='string'&&typeof row.nome==='string'&&(row.cargo===null||typeof row.cargo==='string');
}

function isDryingState(value: unknown): value is FinishingDryingState {
  if (!value || typeof value !== 'object') return false;
  const row=value as Record<string,unknown>;
  return isDateOrNull(row.iniciada_em)&&isDateOrNull(row.prevista_ate)&&typeof row.em_secagem==='boolean'&&isDateOrNull(row.servidor_agora)&&Number.isSafeInteger(row.versao)&&Number(row.versao)>=0;
}

function isProductionState(value: unknown): value is ProductionState {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  const totals = row.totais;
  const records = row.registros;
  if (!Number.isSafeInteger(row.versao) || Number(row.versao) < 0 || !totals || typeof totals !== 'object' || Array.isArray(totals) || !Array.isArray(records)) return false;
  const totalValues = totals as Record<string, unknown>;
  return ['produzido', 'defeito', 'desperdicio'].every(key => typeof totalValues[key] === 'number' && Number.isFinite(totalValues[key]) && Number(totalValues[key]) >= 0) &&
    records.every(item => {
      if (!item || typeof item !== 'object') return false;
      const record = item as Record<string, unknown>;
      return typeof record.id === 'string' && ['produzido', 'defeito', 'desperdicio'].includes(String(record.tipo)) &&
        typeof record.quantidade === 'number' && Number.isFinite(record.quantidade) && record.quantidade >= 0 &&
        typeof record.unidade === 'string' && typeof record.descricao === 'string' && typeof record.criado_em === 'string' && Number.isFinite(new Date(record.criado_em).getTime());
    });
}

export const technicalSheets = {
  async execute(service:string,sector:string,action:'iniciar'|'pausar'|'concluir',version:number):Promise<Pick<ServiceSheet,'status'|'versao'|'iniciada_em'|'concluida_em'|'inicio_liberado'|'bloqueio_fluxo'>> {
    const {data,error}=await supabase.rpc('ficha_execucao_atualizar',{p_servico:service,p_setor:sector,p_acao:action,p_versao:version});
    if(error || !data)throw new Error(error?.code==='40001'?'A ficha foi alterada. Recarregue antes de continuar.':error?.message||'Não foi possível atualizar a execução.');
    if (!isExecutionResult(data)) throw new Error('A atualização retornou dados inválidos. Recarregue a ficha.');
    return data;
  },
  async candidates(service: string, sector: string): Promise<{id:string;nome:string;cargo:string|null}[]> {
    const { data, error } = await supabase.rpc('ficha_responsaveis_disponiveis', {p_servico:service,p_setor:sector});
    if (error || !data) throw new Error(error?.message || 'Não foi possível carregar os responsáveis.');
    if (!Array.isArray(data) || !data.every(isCandidate)) throw new Error('Os responsáveis retornaram dados inválidos. Recarregue a ficha.');
    return data;
  },
  async assign(service: string, sector: string, employee: string | null, version: number): Promise<{responsavel_id:string|null;versao:number}> {
    const { data, error } = await supabase.rpc('ficha_responsavel_definir', {p_servico:service,p_setor:sector,p_responsavel:employee,p_versao:version});
    if (error || !data) throw new Error(error?.code === '40001' ? 'A ficha foi alterada. Recarregue antes de atribuir o responsável.' : error?.message || 'Não foi possível atualizar o responsável.');
    const result = data as Record<string, unknown>;
    if (typeof data !== 'object' || data === null || Array.isArray(data) ||
      (result.responsavel_id !== null && typeof result.responsavel_id !== 'string') ||
      !Number.isSafeInteger(result.versao) || Number(result.versao) < 0) {
      throw new Error('A atribuição retornou dados inválidos. Recarregue a ficha.');
    }
    return data;
  },
  async checklist(service: string, sector: string, items: Record<string, boolean>, version: number): Promise<{versao:number;checklist:Record<string,boolean>}> {
    const { data, error } = await supabase.rpc('ficha_checklist_salvar', {p_servico:service,p_setor:sector,p_itens:items,p_versao:version});
    if (error || !data) throw new Error(error?.code === '40001' ? 'Outra pessoa atualizou esta ficha. Recarregue antes de continuar.' : error?.message || 'Não foi possível salvar o checklist.');
    if (typeof data !== 'object' || data === null || Array.isArray(data) || !Number.isSafeInteger((data as Record<string, unknown>).versao) ||
      typeof (data as Record<string, unknown>).checklist !== 'object' || (data as Record<string, unknown>).checklist === null || Array.isArray((data as Record<string, unknown>).checklist) ||
      !Object.values((data as Record<string, unknown>).checklist as Record<string, unknown>).every(item => typeof item === 'boolean')) {
      throw new Error('O checklist retornou dados inválidos. Recarregue a ficha.');
    }
    return data;
  },
  async list(page: number, search: string): Promise<{itens: {servico_id:string;titulo:string;setor:string;versao:number;atualizado_em:string}[];tem_mais:boolean;pagina:number}> {
    if(!Number.isSafeInteger(page)||page<0)throw new Error('A página de fichas é inválida.');
    if(typeof search!=='string')throw new Error('A pesquisa de fichas é inválida.');
    const { data, error } = await supabase.rpc('minhas_fichas_servicos', { p_pagina: page, p_busca: search });
    if (error || !data) throw new Error(error?.message || 'Não foi possível carregar suas fichas.');
    const normalized = normalizeServiceList(data);
    if (!normalized) throw new Error('As fichas retornaram dados inválidos.');
    return normalized;
  },
  async load(service: string, sector: string): Promise<ServiceSheet> {
    const { data, error } = await supabase.rpc('ficha_execucao_consultar', { p_servico: service, p_setor: sector });
    if (error || !data) throw new Error(error?.message || 'Não foi possível carregar a ficha técnica.');
    if (!isServiceSheet(data)) throw new Error('A ficha retornou dados incompletos.');
    return data;
  },
  async dryingLoad(service: string): Promise<FinishingDryingState> {
    const { data, error } = await supabase.rpc('acabamento_secagem_consultar', { p_servico: service });
    if (error || !data) throw new Error(error?.message || 'Não foi possível consultar a secagem do acabamento.');
    if (!isDryingState(data)) throw new Error('A secagem retornou dados inválidos. Recarregue a ficha.');
    return data;
  },
  async dryingRegister(service: string, minutes: number, version: number): Promise<Pick<FinishingDryingState, 'prevista_ate' | 'em_secagem' | 'servidor_agora' | 'versao'>> {
    const { data, error } = await supabase.rpc('acabamento_secagem_registrar', { p_servico: service, p_minutos: minutes, p_versao: version });
    if (error || !data) throw new Error(error?.code === '40001' ? 'Outra pessoa atualizou esta ficha. Recarregue antes de registrar a secagem.' : error?.message || 'Não foi possível registrar a secagem.');
    const result = data as Record<string, unknown>;
    if (typeof data !== 'object' || data === null || Array.isArray(data) ||
      !isDateOrNull(result.prevista_ate) || typeof result.em_secagem !== 'boolean' ||
      !isDateOrNull(result.servidor_agora) || !Number.isSafeInteger(result.versao) || Number(result.versao) < 0) {
      throw new Error('A secagem retornou dados inválidos. Recarregue a ficha.');
    }
    return data;
  },
  async productionLoad(service: string, sector: string): Promise<ProductionState> {
    const { data, error } = await supabase.rpc('ficha_producao_consultar', { p_servico: service, p_setor: sector });
    if (error || !data) throw new Error(error?.message || 'Não foi possível consultar os registros de produção.');
    if (!isProductionState(data)) throw new Error('A produção retornou dados inválidos. Recarregue a ficha.');
    return data;
  },
  async productionRegister(service: string, sector: string, input: { request: string; type: ProductionEntry['tipo']; quantity: number; unit: string; description: string }, version: number): Promise<ProductionState & { repetida?: boolean }> {
    if(!isServiceSector(service,sector)||!input||typeof input.request!=='string'||!input.request.trim()||!['produzido','defeito','desperdicio'].includes(input.type)||!Number.isFinite(input.quantity)||input.quantity<=0||typeof input.unit!=='string'||!input.unit.trim()||typeof input.description!=='string'||input.description.trim().length<3||!Number.isSafeInteger(version)||version<1)throw new Error('Os dados do registro de produção são inválidos.');
    const { data, error } = await supabase.rpc('ficha_producao_registrar', {
      p_requisicao: input.request, p_servico: service, p_setor: sector, p_tipo: input.type,
      p_quantidade: input.quantity, p_unidade: input.unit, p_descricao: input.description, p_versao: version,
    });
    if (error || !data) throw new Error(error?.code === '40001' ? 'Outra pessoa atualizou esta ficha. Recarregue antes de registrar a produção.' : error?.message || 'Não foi possível registrar a produção.');
    if (!isProductionState(data)) throw new Error('O registro de produção retornou dados inválidos. Recarregue a ficha.');
    return data;
  },
  async materialOptions(service: string, sector: string): Promise<MaterialOption[]> {
    const { data, error } = await supabase.rpc('material_solicitacao_materiais', { p_servico: service, p_setor: sector });
    if (error || !data) throw new Error(error?.message || 'Não foi possível consultar os materiais disponíveis.');
    if (!Array.isArray(data) || !data.every(isMaterialOption)) throw new Error('Os materiais retornaram dados inválidos. Recarregue a ficha.');
    return data;
  },
  async materialRequests(service: string, sector: string): Promise<MaterialRequest[]> {
    if(!isServiceSector(service,sector))throw new Error('O serviço ou setor da ficha é inválido.');
    const { data, error } = await supabase.rpc('material_solicitacao_listar', { p_servico: service, p_setor: sector });
    if (error || !data) throw new Error(error?.message || 'Não foi possível consultar as solicitações de material.');
    if (!Array.isArray(data) || !data.every(item => isMaterialRequest(item))) throw new Error('As solicitações retornaram dados inválidos. Recarregue a ficha.');
    return data;
  },
  async materialStockRequests(status: string|null = null): Promise<MaterialStockRequest[]> {
    if(status!==null&&!materialStatuses.includes(status))throw new Error('O filtro de solicitações é inválido.');
    const { data, error } = await supabase.rpc('material_solicitacao_painel_estoque', { p_status: status });
    if (error || !data) throw new Error(error?.message || 'Não foi possível consultar as solicitações do estoque.');
    if (!Array.isArray(data) || !data.every(item => isMaterialRequest(item, true))) throw new Error('A fila de estoque retornou dados inválidos. Recarregue a tela.');
    return data as MaterialStockRequest[];
  },
  async materialRequestCreate(service: string, sector: string, input: { request: string; item: string; quantity: number; unit: string; reason: string }): Promise<{ id: string; status: string; versao: number; repetida?: boolean }> {
    if(typeof service!=='string'||!service.trim()||typeof sector!=='string'||!isSetor(sector)||typeof input.request!=='string'||!input.request.trim()||typeof input.item!=='string'||!input.item.trim()||!Number.isFinite(input.quantity)||input.quantity<=0||typeof input.unit!=='string'||!input.unit.trim()||typeof input.reason!=='string'||input.reason.trim().length<3)throw new Error('Os dados da solicitação de material são inválidos.');
    const { data, error } = await supabase.rpc('material_solicitacao_criar', { p_requisicao: input.request, p_servico: service, p_setor: sector, p_item_id: input.item, p_quantidade: input.quantity, p_unidade: input.unit, p_motivo: input.reason });
    if (error || !data) throw new Error(error?.code === '23505' ? 'Esta solicitação já foi enviada com outros dados.' : error?.message || 'Não foi possível solicitar o material.');
    if (!isMaterialMutation(data)) throw new Error('A solicitação retornou dados inválidos. Tente novamente.');
    return data;
  },
  async materialRequestUpdate(id: string, action: 'cancelar'|'aprovar'|'recusar'|'atender', version: number, reason?: string): Promise<{ id: string; status: string; versao: number }> {
    if(typeof id!=='string'||!id.trim()||!['cancelar','aprovar','recusar','atender'].includes(action)||!Number.isSafeInteger(version)||version<1||reason!==undefined&&typeof reason!=='string')throw new Error('A solicitação ou versão é inválida.');
    const { data, error } = await supabase.rpc('material_solicitacao_atualizar', { p_id: id, p_acao: action, p_versao: version, p_motivo: reason ?? null });
    if (error || !data) throw new Error(error?.code === '40001' ? 'A solicitação foi alterada. Atualize a lista.' : error?.message || 'Não foi possível atualizar a solicitação.');
    const expectedStatus={cancelar:'cancelada',aprovar:'aprovada',recusar:'recusada',atender:'atendida'}[action];
    if (!isMaterialMutation(data,expectedStatus)) throw new Error('A atualização da solicitação retornou dados inválidos. Recarregue a lista.');
    return data;
  },
  async save(service: string, sector: string, values: Record<string, unknown>, version: number): Promise<number> {
    const { data, error } = await supabase.rpc('ficha_servico_salvar', { p_servico: service, p_setor: sector, p_dados: values, p_versao: version });
    if (error || !data) throw new Error(error?.code === '40001' ? 'Outra pessoa atualizou esta ficha. Recarregue antes de salvar novamente.' : error?.message || 'Não foi possível salvar a ficha técnica.');
    const nextVersion = data && typeof data === 'object' && Number.isSafeInteger((data as Record<string, unknown>).versao)
      ? Number((data as Record<string, unknown>).versao) : null;
    if (nextVersion === null || nextVersion < 0) throw new Error('O salvamento retornou uma versão inválida. Recarregue a ficha.');
    return nextVersion;
  },
};

