export type PaymentProviderType = 'MercadoPago' | 'InfinitePay' | 'Manual' | 'Outro';

export interface CreatePaymentLinkInput {
  planoId: string;
  planoNome: string;
  preco: number;
  periodicidade: string;
  tenantId?: string;
  emailCliente?: string;
  descricao?: string;
  urlSucesso?: string;
}

export interface PaymentLinkResult {
  urlCheckout: string;
  idExterno?: string;
  provedor: PaymentProviderType;
  metadata?: Record<string, any>;
}

export interface WebhookNotificationResult {
  transacaoId: string;
  status: 'confirmado' | 'pendente' | 'estornado' | 'rejeitado';
  valor: number;
  dataPagamento: string;
  formaPagamento: 'PIX' | 'Boleto' | 'Cartao' | 'Transferencia' | 'Outro';
  tenantId?: string;
  assinaturaId?: string;
  idExterno: string;
  rawPayload: any;
}

export interface PaymentGatewayAdapter {
  readonly id: PaymentProviderType;
  readonly name: string;
  gerarLinkCheckout(input: CreatePaymentLinkInput, config?: any): Promise<PaymentLinkResult>;
  validarWebhook(payload: any, signature?: string): boolean;
  processarWebhook(payload: any): WebhookNotificationResult | null;
}
