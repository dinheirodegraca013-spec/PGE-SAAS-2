import { supabase } from '@/lib/supabase';
import type { AccessGrant, EmployeeConfiguration, WorkforceContext } from '../types/access';

const sectors=['corte','montagem','acabamento','instalacao','estoque','financeiro'];
const isDateOrNull=(value:unknown):value is string|null=>value===null||(typeof value==='string'&&Number.isFinite(new Date(value).getTime()));
const isNonEmptyString=(value:unknown):value is string=>typeof value==='string'&&value.trim().length>0;
const permissionKey=(value:Pick<AccessGrant,'modulo'|'operacao'>):string=>`${value.modulo.trim()}:${value.operacao.trim()}`;
const hasUniquePermissions=(value:unknown[]):boolean=>new Set(value.map(item=>permissionKey(item as AccessGrant))).size===value.length;
const isGrant=(value:unknown):value is AccessGrant=>Boolean(value&&typeof value==='object'&&isNonEmptyString((value as Record<string,unknown>).modulo)&&isNonEmptyString((value as Record<string,unknown>).operacao)&&['atribuidos','setor','empresa'].includes(String((value as Record<string,unknown>).escopo)));
const isCatalogItem=(value:unknown)=>Boolean(value&&typeof value==='object'&&isNonEmptyString((value as Record<string,unknown>).modulo)&&isNonEmptyString((value as Record<string,unknown>).operacao));
const isEmployee=(value:unknown):value is EmployeeConfiguration=>{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const row=value as Record<string,unknown>;
  return typeof row.id==='string'&&row.id.length>0&&typeof row.nome==='string'&&row.nome.trim().length>0&&typeof row.email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())&&(row.cargo===null||typeof row.cargo==='string')&&(row.identificador_interno===null||typeof row.identificador_interno==='string')&&(row.setor===null||sectors.includes(String(row.setor)))&&['ativo','inativo','suspenso','suspenso_plano'].includes(String(row.status))&&typeof row.created_at==='string'&&Number.isFinite(new Date(row.created_at).getTime())&&isDateOrNull(row.ultimo_acesso)&&Number.isSafeInteger(row.versao)&&Number(row.versao)>=1&&Array.isArray(row.setores_adicionais)&&row.setores_adicionais.every(item=>sectors.includes(String(item)))&&new Set(row.setores_adicionais).size===row.setores_adicionais.length&&(row.setor===null||row.setores_adicionais.every(item=>item!==row.setor))&&Array.isArray(row.permissoes)&&row.permissoes.every(isGrant)&&hasUniquePermissions(row.permissoes);
};
const isContext=(value:unknown):value is WorkforceContext=>{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const row=value as Record<string,unknown>;
  return typeof row.empresa_id==='string'&&row.empresa_id.length>0&&typeof row.proprietario==='boolean'&&isEmployee(row.funcionario)&&Array.isArray(row.permissoes)&&row.permissoes.every(isGrant)&&hasUniquePermissions(row.permissoes)&&(row.catalogo_permissoes===null||Array.isArray(row.catalogo_permissoes)&&row.catalogo_permissoes.every(isCatalogItem)&&hasUniquePermissions(row.catalogo_permissoes));
};

export const workforceAccess = {
  async context(): Promise<WorkforceContext> {
    const { data, error } = await supabase.rpc('meu_contexto_operacional');
    if (error || !data) throw new Error(error?.message || 'Não foi possível validar as permissões de trabalho.');
    if(!isContext(data))throw new Error('As permissões retornaram dados inválidos. Entre novamente.');return data;
  },
  async employee(userId: string): Promise<EmployeeConfiguration> {
    if(!isNonEmptyString(userId))throw new Error('O identificador do funcionário é inválido.');
    const { data, error } = await supabase.rpc('funcionario_configuracao',{p_usuario_id:userId});
    if (error || !data) throw new Error(error?.message || 'Funcionário não disponível.');
    if(!isEmployee(data))throw new Error('O cadastro do funcionário retornou dados inválidos. Recarregue a tela.');return data;
  },
  async save(input: {id:string;nome:string;cargo:string;identificador_interno:string;setor:string;setores_adicionais:string[];status:string;permissoes:AccessGrant[];versao:number}): Promise<EmployeeConfiguration> {
    if(!input||!isNonEmptyString(input.id)||!isNonEmptyString(input.nome)||typeof input.cargo!=='string'||typeof input.identificador_interno!=='string'||!sectors.includes(input.setor)||!Array.isArray(input.setores_adicionais)||input.setores_adicionais.some(item=>!sectors.includes(item))||new Set(input.setores_adicionais).size!==input.setores_adicionais.length||input.setores_adicionais.includes(input.setor)||!['ativo','inativo','suspenso'].includes(input.status)||!Array.isArray(input.permissoes)||!input.permissoes.every(isGrant)||!hasUniquePermissions(input.permissoes)||!Number.isSafeInteger(input.versao)||input.versao<1)throw new Error('Os dados de acesso do funcionário são inválidos.');
    const { data,error } = await supabase.rpc('funcionario_configurar',{
      p_usuario_id:input.id,p_nome:input.nome.trim(),p_cargo:input.cargo.trim(),p_setor:input.setor,p_setores_adicionais:input.setores_adicionais,p_status:input.status,p_permissoes:input.permissoes,p_versao:input.versao,p_identificador_interno:input.identificador_interno.trim()||null,
    });
    if(error || !data) throw new Error(error?.message || 'Não foi possível atualizar o acesso.');
    if(!isEmployee(data))throw new Error('A atualização do acesso retornou dados inválidos. Recarregue a tela.');return data;
  },
};
