/** Espelha ERP.SaaS.Api.Dtos.WhatsAppConfiguracaoResponseDto (backend). */
export interface WhatsAppConfiguracao {
  configurado: boolean;
  numeroOrigem?: string;
  /** Nunca vem completo — só os últimos 4 caracteres (ex.: "••••••1234"), o backend nunca devolve o token. */
  phoneNumberIdMascarado?: string;
  businessAccountIdMascarado?: string;
  configuradoEmUtc?: string;
  /** URL pronta para colar no painel da Meta (WhatsApp > Configuration > Webhook). */
  webhookUrl: string;
}

/** Espelha ERP.SaaS.Api.Dtos.WhatsAppConfiguracaoRequestDto (backend). */
export interface WhatsAppConfiguracaoInput {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId?: string;
  numeroOrigem?: string;
  webhookVerifyToken: string;
}
