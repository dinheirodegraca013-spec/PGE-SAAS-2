/**
-- Tipos exclusivos dos módulos Administrativo e Financeiro do PGE SAAS 2
*/

export type SaaSPapelInterno = 'SuperAdmin' | 'SaaSFinanceiro' | 'SaaSConsulta';

export interface SaaSUsuarioInterno {
  id: string;
  userId: string;
  email: string;
  nome: string;
  papel: SaaSPapelInterno;
  ativo: boolean;
  permissoes: {
    acessoAdmin: boolean;
    acessoFinanceiro: boolean;
    leituraApenas: boolean;
  };
  concedidoPor?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SaaSPlano {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  periodicidade: 'mensal' | 'trimestral' | 'semestral' | 'anual';
  status: 'ativo' | 'inativo';
  recursos: string[];
  ordem: number;
  createdAt: string;
  updatedAt?: string;
}

export interface SaaSPlanoLink {
  id: string;
  planoId: string;
  planoNome?: string;
  provedor: 'MercadoPago' | 'InfinitePay' | 'Manual' | 'Outro';
  urlCheckout: string;
  periodicidade: string;
  status: 'ativo' | 'inativo';
  idExterno?: string;
  observacoes?: string;
  createdAt: string;
}

export interface SaaSAssinatura {
  id: string;
  tenantId: string;
  planoId?: string;
  status: 'ativa' | 'pendente' | 'suspensa' | 'cancelada' | 'vencida';
  valor: number;
  periodicidade: string;
  dataInicio: string;
  dataProximoVencimento: string;
  canceladaEm?: string;
  motivoCancelamento?: string;
  tenantNome?: string;
  tenantDocumento?: string;
  planoNome?: string;
}

export interface SaaSCobranca {
  id: string;
  tenantId: string;
  tenantNome?: string;
  assinaturaId?: string;
  valor: number;
  dataVencimento: string;
  status: 'pendente' | 'paga' | 'vencida' | 'cancelada';
  linkPagamentoUtilizado?: string;
  provedor?: string;
  descricao?: string;
  observacoes?: string;
  createdAt: string;
}

export interface SaaSPagamento {
  id: string;
  cobrancaId?: string;
  tenantId: string;
  tenantNome?: string;
  assinaturaId?: string;
  valor: number;
  dataPagamento: string;
  formaPagamento: 'PIX' | 'Boleto' | 'Cartao' | 'Transferencia' | 'Dinheiro' | 'Outro';
  status: 'confirmado' | 'pendente' | 'estornado' | 'rejeitado';
  comprovanteReferencia?: string;
  descontoAjuste: number;
  registradoPor?: string;
  conferidoManualmente: boolean;
  conferidoPor?: string;
  conferidoEm?: string;
  idTransacaoGateway?: string;
  provedor?: string;
  createdAt: string;
}

export interface SaaSGatewayConfig {
  id: string;
  provedor: 'MercadoPago' | 'InfinitePay';
  ativo: boolean;
  modoAmbiente: 'sandbox' | 'producao';
  publicKey?: string;
  accessTokenMascarado?: string;
  webhookSecretMascarado?: string;
  webhookUrl?: string;
  updatedAt?: string;
}

export interface SaaSAuditLog {
  id: string;
  usuarioId?: string;
  usuarioEmail?: string;
  papelOperador?: string;
  acao: string;
  modulo: 'Administracao' | 'Financeiro' | 'Planos' | 'Assinaturas' | 'Seguranca' | 'Gateways';
  registroId?: string;
  detalhes?: any;
  createdAt: string;
}

export interface SaaSEmpresaItem {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string;
  documento?: string;
  plano: string;
  status: 'ativo' | 'suspenso' | 'cancelado';
  createdAt: string;
  totalUsuarios: number;
  totalProjetos: number;
  assinaturaStatus?: string;
  valorAssinatura?: number;
  dataVencimento?: string;
}
