/**
 * Tipos compartilhados por toda a aplicação, espelhando os contratos que o
 * backend (ERP.SaaS.Api, em C#) vai expor. Mantidos separados dos tipos
 * específicos de cada módulo (ver src/modules/[nome]/types).
 */

/** Espelha ERP.SaaS.Core.Common.Result<T> — todo endpoint da API deve seguir este formato. */
export interface ApiResult<T = void> {
  succeeded: boolean;
  value?: T;
  errors: string[];
}

/** Espelha ERP.SaaS.Core.Modules.ModuleType */
export enum ModuleType {
  Core = 0,
  MoveisPlanejados = 1,
  OficinaMecanica = 2,
}

/**
 * Espelha ERP.SaaS.Core.Entities.PapelUsuario. Mantido como referência dos
 * valores possíveis, mas o campo `papel` em UsuarioAutenticado é tipado como
 * `string` porque o backend serializa o enum pelo nome (ex.: "Vendedor"),
 * não pelo número.
 */
export enum PapelUsuario {
  AdministradorTenant = 0,
  Gerente = 1,
  Vendedor = 2,
  AtendenteWhatsApp = 3,
  Estoque = 4,
  Instalador = 5,
  Financeiro = 6,
  Analista = 7,
  SuperAdmin = 99,
}

/** Espelha ERP.SaaS.Core.Entities.TenantPlano — planos de assinatura do SaaS. */
export enum TenantPlano {
  Free = 0,
  Standard = 1,
  Empresarial = 2,
}

/** Usuário autenticado — populado a partir do JWT decodificado (ver stores/auth.ts). */
export interface UsuarioAutenticado {
  usuarioId: string;
  tenantId: string;
  nomeCompleto: string;
  email: string;
  /** O backend serializa o enum PapelUsuario como string (ex.: "AdministradorTenant"), não como número. */
  papel: string;
  /** O backend serializa o enum TenantPlano como string (ex.: "Standard"), não como número. */
  plano: string;
  /** Papel interno global do SaaS (SuperAdmin | SaaSFinanceiro | SaaSConsulta) independente do tenant */
  papelInterno?: 'SuperAdmin' | 'SaaSFinanceiro' | 'SaaSConsulta' | null;
}

/** Paginação padrão usada em listagens da API. */
export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}
