import { MercadoPagoAdapter } from './mercadopago';
import { InfinitePayAdapter } from './infinitepay';
import { PaymentGatewayAdapter, PaymentProviderType } from './types';

export * from './types';
export * from './mercadopago';
export * from './infinitepay';

export const gatewayAdapters: Record<PaymentProviderType, PaymentGatewayAdapter | null> = {
  MercadoPago: new MercadoPagoAdapter(),
  InfinitePay: new InfinitePayAdapter(),
  Manual: null,
  Outro: null,
};

export function getGatewayAdapter(provedor: PaymentProviderType): PaymentGatewayAdapter | null {
  return gatewayAdapters[provedor] || null;
}
