import { supabase } from '@/lib/supabase';
import type { AccessGrant, EmployeeConfiguration, WorkforceContext } from '../types/access';

export const workforceAccess = {
  async context(): Promise<WorkforceContext> {
    const { data, error } = await supabase.rpc('meu_contexto_operacional');
    if (error || !data) throw new Error(error?.message || 'Não foi possível validar as permissões de trabalho.');
    return data;
  },
  async employee(userId: string): Promise<EmployeeConfiguration> {
    const { data, error } = await supabase.rpc('funcionario_configuracao',{p_usuario_id:userId});
    if (error || !data) throw new Error(error?.message || 'Funcionário não disponível.');
    return data;
  },
  async save(input: {id:string;nome:string;cargo:string;identificador_interno:string;setor:string;setores_adicionais:string[];status:string;permissoes:AccessGrant[];versao:number}): Promise<EmployeeConfiguration> {
    const { data,error } = await supabase.rpc('funcionario_configurar',{
      p_usuario_id:input.id,p_nome:input.nome.trim(),p_cargo:input.cargo.trim(),p_setor:input.setor,p_setores_adicionais:input.setores_adicionais,p_status:input.status,p_permissoes:input.permissoes,p_versao:input.versao,p_identificador_interno:input.identificador_interno.trim()||null,
    });
    if(error || !data) throw new Error(error?.message || 'Não foi possível atualizar o acesso.');
    return data;
  },
};

