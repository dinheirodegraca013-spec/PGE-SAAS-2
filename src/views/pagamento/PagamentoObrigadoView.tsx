import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Clock3, ArrowRight, ShieldCheck } from 'lucide-react';

const PLANOS: Record<string, { nome: string; descricao: string }> = {
  free: { nome: 'Free', descricao: 'Seu plano gratuito está pronto para começar.' },
  standard: { nome: 'Standard', descricao: 'Agradecemos por escolher o plano Standard do PGE SaaS.' },
  empresarial: { nome: 'Empresarial', descricao: 'Agradecemos por escolher o plano Empresarial do PGE SaaS.' },
};

export default function PagamentoObrigadoView() {
  const { plano: planoParam } = useParams();
  const slug = (planoParam || (window.location.pathname.includes('empresarial') ? 'empresarial' : window.location.pathname.includes('free') ? 'free' : 'standard')).toLowerCase();
  const plano = PLANOS[slug] || PLANOS.standard;
  const gratuito = slug === 'free';

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-10">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">PGE SaaS</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {gratuito ? 'Obrigado por escolher o PGE SaaS!' : 'Obrigado pela sua compra!'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{plano.descricao}</p>

        <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
          <div className="flex items-start gap-3">
            {gratuito ? <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" /> : <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {gratuito ? 'Plano selecionado: Free' : 'Plano selecionado: ' + plano.nome}
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {gratuito
                  ? 'Você pode entrar na plataforma e utilizar os recursos disponíveis no plano gratuito.'
                  : 'Estamos aguardando a confirmação do pagamento pelo Mercado Pago. O acesso aos recursos pagos será liberado somente após a confirmação segura do pagamento.'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/login" className="btn-primary gap-2">
            Ir para o login <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/cadastro" className="btn-secondary">Voltar ao site</Link>
        </div>
        <p className="mt-6 text-[11px] leading-5 text-slate-400">
          {gratuito ? 'Obrigado por confiar no PGE SaaS.' : 'Esta página confirma apenas o retorno do checkout, não o status financeiro da transação.'}
        </p>
      </section>
    </main>
  );
}
