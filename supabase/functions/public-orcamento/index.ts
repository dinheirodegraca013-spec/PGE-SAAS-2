import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase Edge Function environment configuration.");

const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
function publicShape(row: Record<string, any>) {
  return {
    id: row.id, servico_id: row.servico_id, itens: Array.isArray(row.itens) ? row.itens : [],
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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    let body: Record<string, unknown> = {};
    if (req.method === "POST") body = await req.json().catch(() => ({}));
    let token = req.method === "GET" ? url.searchParams.get("token") ?? "" : String(body.token ?? "");
    token = token.trim();
    if (!token || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
      return reply(400, { error: "Token público inválido." });
    }
    if (req.method === "GET") {
      const quote = await getQuote(token);
      if (!quote) return reply(404, { error: "Orçamento não encontrado, expirado ou indisponível." });
      return reply(200, { quote: publicShape(quote) });
    }
    if (req.method === "POST") {
      const nome = typeof body.nome === "string" ? body.nome.trim() : "";
      if (nome.length < 3 || nome.length > 160) return reply(400, { error: "Informe seu nome completo (3 a 160 caracteres)." });
      const quote = await getQuote(token);
      if (!quote) return reply(404, { error: "Orçamento não encontrado, expirado ou indisponível." });
      if (String(quote.status).toLowerCase() === "assinado" || quote.tem_pdf_assinado) {
        return reply(200, { quote: publicShape(quote) });
      }
      if (!["pendente", "enviado", "visualizado"].includes(String(quote.status).toLowerCase())) {
        return reply(409, { error: "Este orçamento não está disponível para aceite." });
      }
      const { data: updated, error: updateError } = await db.from("orcamentos")
        .update({ status: "Assinado", tem_pdf_assinado: true, assinado_por_nome: nome,
          assinado_em: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", quote.id).eq("public_token", token).eq("tem_pdf_assinado", false)
        .select("id,tenant_id,servico_id,itens,valor_total,data_validade,observacoes_gerais,status,tem_pdf_assinado,assinado_por_nome,assinado_em,public_token")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!updated) return reply(409, { error: "O orçamento já foi assinado ou alterado. Atualize a página." });
      if (updated.servico_id) {
        const { error: serviceError } = await db.from("servicos")
          .update({ status: "Aprovado", updated_at: new Date().toISOString() })
          .eq("id", updated.servico_id).eq("tenant_id", updated.tenant_id);
        if (serviceError) throw serviceError;
      }
      const { error: auditError } = await db.from("audit_logs").insert({
        tenant_id: updated.tenant_id, actor_id: null, acao: "ASSINAR_PUBLICO",
        tabela: "orcamentos", registro_id: String(updated.id), detalhes: { nome, canal: "link_publico" },
      });
      if (auditError) console.error("Public quote audit log failed:", auditError.message);
      return reply(200, { quote: publicShape(updated) });
    }
    return reply(405, { error: "Método não permitido." });
  } catch (error) {
    console.error("public-orcamento error:", error);
    return reply(500, { error: "Não foi possível processar o orçamento neste momento." });
  }
});
