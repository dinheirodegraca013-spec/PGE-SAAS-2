import { PaymentGatewayAdapter, CreatePaymentLinkInput, PaymentLinkResult, WebhookNotificationResult } from './types';

export class InfinitePayAdapter implements PaymentGatewayAdapter {
  readonly id = 'InfinitePay' as const;
  readonly name = 'InfinitePay Checkout Inteligente';

  async gerarLinkCheckout(input: CreatePaymentLinkInput, config?: any): Promise<PaymentLinkResult> {
    if (config?.urlCheckoutFixa && config.urlCheckoutFixa.startsWith('https://')) {
      return {
        urlCheckout: config.urlCheckoutFixa,
        idExterno: config.idExterno || `inf-link-${Date.now()}`,
        provedor: 'InfinitePay',
      };
    }

    const cleanPriceInCents = Math.round(input.preco * 100);
    const checkoutUrl = `https://pay.infinitepay.io/checkout?amount=${cleanPriceInCents}&description=${encodeURIComponent(`Assinatura ${input.planoNome}`)}&order_id=PGE_${input.planoId}_${Date.now()}`;

    return {
      urlCheckout: checkoutUrl,
      idExterno: `inf_${Date.now()}_${input.planoId}`,
      provedor: 'InfinitePay',
      metadata: {
        plano: input.planoNome,
        valor: input.preco,
        amountInCents: cleanPriceInCents,
      },
    };
  }

  validarWebhook(payload: any, _signature?: string): boolean {
    if (!payload) return false;
    if (payload.event_type || payload.transaction_id || payload.charge_id) {
      return true;
    }
    return false;
  }

  processarWebhook(payload: any): WebhookNotificationResult | null {
    if (!payload) return null;

    const txId = String(payload.transaction_id || payload.charge_id || `inf_${Date.now()}`);
    const rawStatus = (payload.status || payload.event_type || 'paid').toLowerCase();

    let status: 'confirmado' | 'pendente' | 'estornado' | 'rejeitado' = 'pendente';
    if (rawStatus.includes('paid') || rawStatus.includes('success') || rawStatus.includes('approved')) {
      status = 'confirmado';
    } else if (rawStatus.includes('refund') || rawStatus.includes('chargeback')) {
      status = 'estornado';
    } else if (rawStatus.includes('failed') || rawStatus.includes('cancelled')) {
      status = 'rejeitado';
    }

    return {
      transacaoId: txId,
      status,
      valor: Number(payload.amount ? payload.amount / 100 : payload.valor || 0),
      dataPagamento: payload.paid_at || new Date().toISOString(),
      formaPagamento: payload.payment_method === 'pix' ? 'PIX' : 'Cartao',
      idExterno: txId,
      rawPayload: payload,
    };
  }
}
