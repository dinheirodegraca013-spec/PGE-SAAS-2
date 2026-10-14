import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Clock3, ArrowRight, ShieldCheck, MessageCircle } from 'lucide-react';

const PLANOS: Record<string, { nome: string; descricao: string }> = {
  free: { nome: 'Free', descricao: 'Seu plano gratuito está pronto para começar.' },
  standard: { nome: 'Standard', descricao: 'Seu cadastro no plano Standard foi recebido.' },
  empresarial: { nome: 'Empresarial', descricao: 'Seu cadastro no plano Empresarial foi recebido.' },
};

export default function PagamentoObrigadoView() {
  const { plano: planoParam } = useParams();
  const path = window.location.pathname.toLowerCase();
  const slug = (planoParam || (path.includes('empresarial') ? 'empresarial' : path.includes('free') ? 'free' : 'standard')).toLowerCase();
  const plano = PLANOS[slug] || PLANOS.standard;
  const gratuito = slug === 'free';
  const mensagemWhatsApp = encodeURIComponent(`Olá! Já realizei o pagamento do plano ${plano.nome} da Gestio ERP e preciso da ativação manual.\nEmpresa: \nE-mail do cadastro: \nData do pagamento: \nVou enviar o comprovante por aqui.`);
  const whatsappUrl = `https://wa.me/?text=${mensagemWhatsApp}`;
  const telefoneSuporte = String(import.meta.env.VITE_WHATSAPP_SUPORTE || '').replace(/\D/g, '');
  const mensagem = encodeURIComponent(
    `Olá! Fiz meu cadastro no Gestio ERP e solicito a ativação manual do plano ${plano.nome}. Vou enviar os dados para conferência do pagamento.\n\nEmpresa: \nE-mail de cadastro: `
  );
  const whatsappUrl = telefoneSuporte
    ? `https://wa.me/${telefoneSuporte}?text=${mensagem}`
    : `https://wa.me/?text=${mensagem}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-10">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">GESTIO ERP</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {gratuito ? 'Cadastro realizado!' : 'Próximo passo: ativar seu plano'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{plano.descricao}</p>

        <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
          <div className="flex items-start gap-3">
            {gratuito ? <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" /> : <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {gratuito ? 'Plano selecionado: Free' : `Plano solicitado: ${plano.nome}`}
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {gratuito
                  ? 'Você pode entrar na plataforma e utilizar os recursos que estiverem liberados no plano gratuito.'
                  : 'A ativação é manual. Entre em contato pelo WhatsApp e envie os dados do cadastro e o comprovante para conferência. O Super Admin liberará o plano após verificar o pagamento.'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-col justify-center gap-3">
          {!gratuito && (
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="btn-primary inline-flex items-center justify-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chamar no WhatsApp para ativar
              <ArrowRight className="h-4 w-4" />
            </a>
          )}
          {!gratuito && !telefoneSuporte && (
            <p className="text-xs leading-5 text-amber-700">
              O WhatsApp será aberto para você escolher o contato. Para direcionar diretamente ao atendimento, configure a variável VITE_WHATSAPP_SUPORTE com o número oficial, incluindo código do país e DDD.
            </p>
          )}
          <Link to="/login" className="btn-secondary inline-flex items-center justify-center gap-2">
            Ir para o login <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/cadastro" className="text-sm text-slate-500 hover:text-slate-700">Voltar ao site</Link>
        </div>
        <p className="mt-6 text-[11px] leading-5 text-slate-400">
          {gratuito
            ? 'Esta página não altera seu plano no banco de dados.'
            : 'O retorno do checkout não confirma o pagamento automaticamente. A contratação e o início da utilização serão registrados na data em que o Super Admin ativar o plano.'}
        </p>
      </section>
    </main>
  );
}
