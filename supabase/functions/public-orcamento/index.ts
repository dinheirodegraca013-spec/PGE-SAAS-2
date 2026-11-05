import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const publicOrigin = new URL(Deno.env.get("SITE_URL") || "https://gestio.dev.br").origin;
const publicUrl = new URL(publicOrigin);
const alternateOrigin = publicUrl.hostname.startsWith("www.")
  ? `${publicUrl.protocol}//${publicUrl.hostname.slice(4)}`
  : `${publicUrl.protocol}//www.${publicUrl.hostname}`;
const allowedOrigins = new Set([publicOrigin, alternateOrigin]);
function corsHeaders(request: Request) {
  const requestOrigin = request.headers.get("Origin");
  const allowOrigin = requestOrigin && allowedOrigins.has(requestOrigin) ? requestOrigin : publicOrigin;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store, max-age=0",
  "Vary": "Origin",
  };
}
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase Edge Function environment configuration.");

const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
function reply(request: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });
}
async function readBody(request: Request): Promise<Record<string, unknown>> {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > 16384) throw new RangeError("payload_too_large");
  const reader = request.body?.getReader();
  if (!reader) return {};
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16384) {
      await reader.cancel();
      throw new RangeError("payload_too_large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const body = new TextDecoder().decode(bytes);
  const parsed = JSON.parse(body || "{}");
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
}
function publicShape(row: Record<string, any>) {
  return {
    // The public token is sufficient for the customer flow; never expose the
    // internal service UUID or quote UUID in a response intended for unauthenticated clients.
    itens: Array.isArray(row.itens) ? row.itens : [],
    valor_total: Number(row.valor_total) || 0, data_validade: row.data_validade,
    observacoes_gerais: row.observacoes_gerais, status: row.status,
    tem_pdf_assinado: Boolean(row.tem_pdf_assinado), assinado_por_nome: row.assinado_por_nome,
    assinado_em: row.assinado_em,
  };
}
async function getQuote(token: string) {
  const { data, error } = await db.from("orcamentos")
    .select("id,tenant_id,servico_id,itens,valor_total,data_validade,observacoes_gerais,status,tem_pdf_assinado,assinado_por_nome,assinado_em,public_token")
    .eq("public_token", token).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (data.data_validade && new Date(data.data_validade).getTime() < Date.now()) return null;
  if (!["pendente", "enviado", "visualizado", "assinado"].includes(String(data.status).toLowerCase())) return null;
  return data;
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "GET" && req.method !== "POST") return reply(req, 405, { error: "Método não permitido." });
  try {
    const url = new URL(req.url);
    let body: Record<string, unknown> = {};
    if (req.method === "POST") {
      try { body = await readBody(req); }
      catch (error) { return reply(req, error instanceof RangeError ? 413 : 400, { error: error instanceof RangeError ? "Requisição acima do limite." : "Dados inválidos." }); }
    }
    let token = req.method === "GET" ? url.searchParams.get("token") ?? "" : String(body.token ?? "");
    token = token.trim();
    if (!token || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
      return reply(req, 400, { error: "Token público inválido." });
    }
    if (req.method === "GET") {
      const quote = await getQuote(token);
      if (!quote) return reply(req, 404, { error: "Orçamento não encontrado, expirado ou indisponível." });
      return reply(req, 200, { quote: publicShape(quote) });
    }
    if (req.method === "POST") {
      const nome = typeof body.nome === "string" ? body.nome.trim() : "";
      if (nome.length < 3 || nome.length > 160) return reply(req, 400, { error: "Informe seu nome completo (3 a 160 caracteres)." });
      const quote = await getQuote(token);
      if (!quote) return reply(req, 404, { error: "Orçamento não encontrado, expirado ou indisponível." });
      if (String(quote.status).toLowerCase() === "assinado" || quote.tem_pdf_assinado) {
        return reply(req, 200, { quote: publicShape(quote) });
      }
      if (!["pendente", "enviado", "visualizado"].includes(String(quote.status).toLowerCase())) {
        return reply(req, 409, { error: "Este orçamento não está disponível para aceite." });
      }
      const { data: signed, error: signingError } = await db.rpc("assinar_orcamento_publico", {
        p_token: token,
        p_nome: nome,
      });
      if (signingError) {
        if (signingError.message.includes("quote_unavailable")) return reply(req, 404, { error: "Orçamento não encontrado, expirado ou indisponível." });
        if (signingError.message.includes("linked_service_not_found")) return reply(req, 409, { error: "O serviço vinculado não está disponível para aceite." });
        throw signingError;
      }
      return reply(req, 200, { quote: signed });
    }
    return reply(req, 405, { error: "Método não permitido." });
  } catch (error) {
    console.error("public-orcamento error:", error);
    return reply(req, 500, { error: "Não foi possível processar o orçamento neste momento." });
  }
});

