import { supabase } from '@/lib/supabase';
import type { AccessGrant, EmployeeConfiguration, WorkforceContext } from '../types/access';

const sectors=['corte','montagem','acabamento','instalacao','estoque','financeiro'];
const isGrant=(value:unknown):value is AccessGrant=>Boolean(value&&typeof value==='object'&&typeof (value as Record<string,unknown>).modulo==='string'&&typeof (value as Record<string,unknown>).operacao==='string'&&['atribuidos','setor','empresa'].includes(String((value as Record<string,unknown>).escopo)));
const isEmployee=(value:unknown):value is EmployeeConfiguration=>{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const row=value as Record<string,unknown>;
  return typeof row.id==='string'&&typeof row.nome==='string'&&typeof row.email==='string'&&(row.cargo===null||typeof row.cargo==='string')&&(row.identificador_interno===null||typeof row.identificador_interno==='string')&&(row.setor===null||sectors.includes(String(row.setor)))&&['ativo','inativo','suspenso','suspenso_plano'].includes(String(row.status))&&typeof row.created_at==='string'&&(row.ultimo_acesso===null||typeof row.ultimo_acesso==='string')&&Number.isSafeInteger(row.versao)&&Number(row.versao)>=1&&Array.isArray(row.setores_adicionais)&&row.setores_adicionais.every(item=>sectors.includes(String(item)))&&Array.isArray(row.permissoes)&&row.permissoes.every(isGrant);
};
const isContext=(value:unknown):value is WorkforceContext=>{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const row=value as Record<string,unknown>;
  return typeof row.empresa_id==='string'&&typeof row.proprietario==='boolean'&&isEmployee(row.funcionario)&&Array.isArray(row.permissoes)&&row.permissoes.every(isGrant)&&(row.catalogo_permissoes===null||Array.isArray(row.catalogo_permissoes)&&row.catalogo_permissoes.every(item=>Boolean(item&&typeof item==='object'&&typeof (item as Record<string,unknown>).modulo==='string'&&typeof (item as Record<string,unknown>).operacao==='string')));
};

export const workforceAccess = {
  async context(): Promise<WorkforceContext> {
    const { data, error } = await supabase.rpc('meu_contexto_operacional');
    if (error || !data) throw new Error(error?.message || 'Não foi possível validar as permissões de trabalho.');
    if(!isContext(data))throw new Error('As permissões retornaram dados inválidos. Entre novamente.');return data;
  },
  async employee(userId: string): Promise<EmployeeConfiguration> {
    const { data, error } = await supabase.rpc('funcionario_configuracao',{p_usuario_id:userId});
    if (error || !data) throw new Error(error?.message || 'Funcionário não disponível.');
    if(!isEmployee(data))throw new Error('O cadastro do funcionário retornou dados inválidos. Recarregue a tela.');return data;
  },
  async save(input: {id:string;nome:string;cargo:string;identificador_interno:string;setor:string;setores_adicionais:string[];status:string;permissoes:AccessGrant[];versao:number}): Promise<EmployeeConfiguration> {
    const { data,error } = await supabase.rpc('funcionario_configurar',{
      p_usuario_id:input.id,p_nome:input.nome.trim(),p_cargo:input.cargo.trim(),p_setor:input.setor,p_setores_adicionais:input.setores_adicionais,p_status:input.status,p_permissoes:input.permissoes,p_versao:input.versao,p_identificador_interno:input.identificador_interno.trim()||null,
    });
    if(error || !data) throw new Error(error?.message || 'Não foi possível atualizar o acesso.');
    if(!isEmployee(data))throw new Error('A atualização do acesso retornou dados inválidos. Recarregue a tela.');return data;
  },
};

