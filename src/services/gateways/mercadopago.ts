import { PaymentGatewayAdapter, CreatePaymentLinkInput, PaymentLinkResult, WebhookNotificationResult } from './types';

export class MercadoPagoAdapter implements PaymentGatewayAdapter {
  readonly id = 'MercadoPago' as const;
  readonly name = 'Mercado Pago Checkout Pro / API';

  async gerarLinkCheckout(input: CreatePaymentLinkInput, config?: any): Promise<PaymentLinkResult> {
    // Se o checkout URL customizado ou link direto de plano estiver configurado
    if (config?.urlCheckoutFixa && config.urlCheckoutFixa.startsWith('https://')) {
      return {
        urlCheckout: config.urlCheckoutFixa,
        idExterno: config.idExterno || `mp-pref-${Date.now()}`,
        provedor: 'MercadoPago',
      };
    }

    // Geração de link ou payload compatível com Checkout Pro do Mercado Pago
    const cleanPrice = input.preco.toFixed(2);
    const externalRef = input.tenantId ? `TENANT_${input.tenantId}_PLAN_${input.planoId}` : `PLAN_${input.planoId}`;
    
    // URL de checkout ou link de cobrança oficial do Mercado Pago
    const checkoutUrl = `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=PGESAAS_${input.planoId}_${cleanPrice.replace('.', '')}&external_reference=${encodeURIComponent(externalRef)}`;

    return {
      urlCheckout: checkoutUrl,
      idExterno: `mp_${Date.now()}_${input.planoId}`,
      provedor: 'MercadoPago',
      metadata: {
        plano: input.planoNome,
        valor: input.preco,
        periodicidade: input.periodicidade,
        externalReference: externalRef,
      },
    };
  }

  validarWebhook(payload: any, _signature?: string): boolean {
    // Valida estrutura básica de IPN / Webhooks do Mercado Pago
    if (!payload) return false;
    if (payload.type === 'payment' || payload.action === 'payment.created' || payload.action === 'payment.updated' || payload.data?.id) {
      return true;
    }
    return false;
  }

  processarWebhook(payload: any): WebhookNotificationResult | null {
    if (!payload) return null;

    const data = payload.data || payload;
    const paymentId = String(data.id || payload.id || `mp_${Date.now()}`);
    const rawStatus = (data.status || payload.status || 'approved').toLowerCase();

    let status: 'confirmado' | 'pendente' | 'estornado' | 'rejeitado' = 'pendente';
    if (rawStatus === 'approved' || rawStatus === 'accredited') {
      status = 'confirmado';
    } else if (rawStatus === 'refunded' || rawStatus === 'charged_back') {
      status = 'estornado';
    } else if (rawStatus === 'rejected' || rawStatus === 'cancelled') {
      status = 'rejeitado';
    }

    let formaPagamento: 'PIX' | 'Boleto' | 'Cartao' | 'Transferencia' | 'Outro' = 'Cartao';
    const paymentTypeId = data.payment_type_id || data.payment_method_id;
    if (paymentTypeId === 'bank_transfer' || paymentTypeId === 'pix') {
      formaPagamento = 'PIX';
    } else if (paymentTypeId === 'ticket' || paymentTypeId === 'bolbradesco') {
      formaPagamento = 'Boleto';
    }

    return {
      transacaoId: paymentId,
      status,
      valor: Number(data.transaction_amount || data.total_paid_amount || 0),
      dataPagamento: data.date_approved || new Date().toISOString(),
      formaPagamento,
      tenantId: data.metadata?.tenant_id || undefined,
      idExterno: paymentId,
      rawPayload: payload,
    };
  }
}
