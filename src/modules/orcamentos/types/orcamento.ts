/** Espelha ERP.SaaS.Api.Dtos.ItemOrcamentoResponseDto (backend). */
export interface ItemOrcamento {
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

/** Espelha ERP.SaaS.Api.Dtos.OrcamentoResponseDto (backend). */
export interface Orcamento {
  id: string;
  servicoId: string;
  itens: ItemOrcamento[];
  valorTotal: number;
  dataValidade?: string;
  observacoesGerais?: string;
  status: string;
  temPdfAssinado: boolean;
  assinadoPorNome?: string;
  assinadoEmUtc?: string;
}

export interface ItemOrcamentoInput {
  descricao: string;
  quantidade: number;
  valorUnitario: number;
}

/** Espelha ERP.SaaS.Api.Dtos.CriarOrcamentoRequestDto (backend). */
export interface CriarOrcamentoInput {
  itens: ItemOrcamentoInput[];
  dataValidade?: string;
  observacoesGerais?: string;
}

/** Espelha ERP.SaaS.Api.Dtos.AssinarOrcamentoRequestDto (backend). */
export interface AssinarOrcamentoInput {
  nome: string;
}
