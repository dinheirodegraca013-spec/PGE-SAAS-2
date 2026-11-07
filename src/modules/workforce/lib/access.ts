import type { WorkforceContext } from '../types/access';

const validSectorKeys = new Set(['corte', 'montagem', 'acabamento', 'instalacao', 'estoque', 'financeiro']);
const employeePanelModules = ['painel', 'ordens', 'tarefas', 'agenda', 'documentos', 'notificacoes', 'atividades', 'ocorrencias', 'perfil', 'estoque', 'financeiro'];

export function hasPermission(context: WorkforceContext | null, module: string, operation = 'visualizar'): boolean {
  return Boolean(context?.permissoes.some(grant => grant.modulo === module && grant.operacao === operation));
}
export function authorizedSectors(context: WorkforceContext | null): string[] {
  if (!context) return [];
  return [...new Set([context.funcionario.setor, ...(context.funcionario.setores_adicionais || [])]
    .filter((sector): sector is string => typeof sector === 'string' && validSectorKeys.has(sector)))];
}
export function workforcePathAllowed(context: WorkforceContext | null,path:string):boolean {
  if(!context)return false;
  if(context.proprietario)return true;
  if(path==='/meu-setor')return employeePanelModules.some(module => hasPermission(context, module));
  if(path==='/estoque')return hasPermission(context,'estoque')&&authorizedSectors(context).includes('estoque');
  if(path==='/meu-financeiro')return hasPermission(context,'financeiro')&&authorizedSectors(context).includes('financeiro');
  return false;
}
export const permissionLabels: Record<string,string> = {
  visualizar:'Visualizar',criar:'Criar',editar:'Editar',excluir:'Excluir',iniciar:'Iniciar',pausar:'Pausar',concluir:'Concluir',aprovar:'Aprovar',reprovar:'Reprovar',exportar:'Exportar',anexar:'Anexar documentos',
  registrar_entrada:'Registrar entrada',registrar_saida:'Registrar saída',registrar_devolucao:'Registrar devolução',registrar_ajuste:'Registrar ajuste',transferir:'Transferir',reservar:'Reservar materiais',inventariar:'Inventário',
  registrar_pagamento:'Registrar pagamentos',registrar_recebimento:'Registrar recebimentos',relatorios:'Consultar relatórios',ver_sensiveis:'Consultar informações sensíveis',
};
export const moduleLabels: Record<string,string> = {
  painel:'Meu painel',ordens:'Ordens de serviço',tarefas:'Tarefas',agenda:'Agenda',documentos:'Documentos e arquivos',notificacoes:'Notificações',atividades:'Histórico de atividades',ocorrencias:'Ocorrências',perfil:'Meu perfil',
  clientes:'Clientes e atendimento',orcamentos:'Orçamentos',pedidos:'Pedidos',descontos:'Descontos',estoque:'Estoque',financeiro:'Financeiro',relatorios:'Relatórios',
};

