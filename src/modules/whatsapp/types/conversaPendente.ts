/** Espelha ERP.SaaS.Api.Dtos.ConversaPendenteResponseDto (backend). */
export interface ConversaPendente {
  id: string;
  telefoneOrigemE164: string;
  ultimaMensagemTexto?: string;
  primeiraMensagemEmUtc: string;
  ultimaMensagemEmUtc: string;
  quantidadeMensagens: number;
  /** "Pendente" | "Aprovada" | "Ignorada" */
  status: string;
}

export interface AprovarConversaInput {
  /** Opcional — se vazio, o backend usa um nome provisório ("Contato WhatsApp +55..."). */
  nome?: string;
}

export interface AprovarConversaResultado {
  clienteId: string;
  servicoId: string;
}
