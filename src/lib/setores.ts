export const setores = {
  corte: 'Corte',
  montagem: 'Montagem',
  acabamento: 'Acabamento',
  instalacao: 'Instalação',
  estoque: 'Estoque',
  financeiro: 'Escritório e financeiro',
} as const;

export type SetorFuncionario = keyof typeof setores;

export function isSetor(value: unknown): value is SetorFuncionario {
  return typeof value === 'string' && Object.hasOwn(setores, value);
}

export function podeCadastrarFuncionario(papel?: string) {
  return papel === 'AdministradorTenant';
}

export function caminhoPermitido(setor: string | null | undefined, path: string) {
  if (!setor) return true;
  return path === '/meu-setor' ||
    (setor === 'estoque' && path === '/estoque') ||
    (setor === 'financeiro' && path === '/meu-financeiro');
}
