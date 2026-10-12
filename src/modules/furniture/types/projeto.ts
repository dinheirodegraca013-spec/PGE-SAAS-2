/** Espelha ERP.SaaS.Modules.Furniture.Entities.StatusProjeto. */
export enum StatusProjeto {
  Orcamento = 0,
  MedicaoAgendada = 1,
  AguardandoAprovacaoCliente = 2,
  Aprovado = 3,
  EmProducao = 4,
  PronoParaEntrega = 5,
  Entregue = 6,
  InstalacaoConcluida = 7,
  Cancelado = 8,
}

export const statusProjetoLabel: Record<StatusProjeto, string> = {
  [StatusProjeto.Orcamento]: 'Orçamento',
  [StatusProjeto.MedicaoAgendada]: 'Medição agendada',
  [StatusProjeto.AguardandoAprovacaoCliente]: 'Aguardando aprovação',
  [StatusProjeto.Aprovado]: 'Aprovado',
  [StatusProjeto.EmProducao]: 'Em produção',
  [StatusProjeto.PronoParaEntrega]: 'Pronto para entrega',
  [StatusProjeto.Entregue]: 'Entregue',
  [StatusProjeto.InstalacaoConcluida]: 'Instalação concluída',
  [StatusProjeto.Cancelado]: 'Cancelado',
};

/** Espelha ERP.SaaS.Modules.Furniture.Entities.MaterialPadrao. */
export enum MaterialPadrao {
  MdfBranco = 0,
  MdfColorido = 1,
  MdfTexturizado = 2,
  Mdp = 3,
  MaterialEspecial = 4,
}

export const materialPadraoLabel: Record<MaterialPadrao, string> = {
  [MaterialPadrao.MdfBranco]: 'MDF Branco TX',
  [MaterialPadrao.MdfColorido]: 'MDF Colorido / Lacca',
  [MaterialPadrao.MdfTexturizado]: 'MDF Amadeirado Texturizado',
  [MaterialPadrao.Mdp]: 'MDP Melamínico',
  [MaterialPadrao.MaterialEspecial]: 'Material Especial / Alumínio / Vidro',
};

/** Espelha ERP.SaaS.Modules.Furniture.Entities.OrcamentoItem. */
export interface OrcamentoItem {
  id: string;
  descricao: string;
  material: MaterialPadrao;
  larguraMetros: number;
  alturaMetros: number;
  profundidadeMetros: number;
  valorUnitario: number;
  quantidade: number;
}

/** Espelha ERP.SaaS.Modules.Furniture.Entities.AmbienteProjeto. */
export interface AmbienteProjeto {
  id: string;
  nome: string;
  dimensoesDescricao?: string;
  itens: OrcamentoItem[];
}

/** Espelha ERP.SaaS.Modules.Furniture.Entities.ProjetoMovelPlanejado. */
export interface ProjetoMovelPlanejado {
  id: string;
  clienteId: string;
  titulo: string;
  status: StatusProjeto;
  dataMedicaoAgendada?: string;
  dataPrevistaEntrega?: string;
  valorTotalOrcamento: number;
  observacoes?: string;
  ambientes: AmbienteProjeto[];
}
