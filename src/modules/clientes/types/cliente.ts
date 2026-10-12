/** Espelha ERP.SaaS.Api.Dtos.ClienteResponseDto (backend). */
export interface Cliente {
  id: string;
  nome: string;
  cpfCnpj?: string;
  email?: string;
  telefoneWhatsApp?: string;
  observacoes?: string;
  /** Serializado como string pelo backend (ex.: "Manual", "WhatsApp"). */
  origem: string;
  createdAtUtc: string;
}

/** Espelha ERP.SaaS.Api.Dtos.ClienteCreateRequestDto (backend). */
export interface ClienteCreateInput {
  nome: string;
  cpfCnpj?: string;
  email?: string;
  telefoneWhatsApp?: string;
  observacoes?: string;
}
