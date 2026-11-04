export type RecordScope = 'atribuidos' | 'setor' | 'empresa';
export interface AccessGrant { modulo: string; operacao: string; escopo: RecordScope }
export interface EmployeeConfiguration {
  id: string; nome: string; email: string; cargo: string | null; identificador_interno: string | null; setor: string | null;
  status: 'ativo' | 'inativo' | 'suspenso' | 'suspenso_plano'; created_at: string;
  ultimo_acesso: string | null; versao: number; setores_adicionais: string[]; permissoes: AccessGrant[];
}
export interface WorkforceContext {
  empresa_id: string; proprietario: boolean; funcionario: EmployeeConfiguration;
  permissoes: AccessGrant[]; catalogo_permissoes: {modulo: string; operacao: string}[] | null;
}

