import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Clock3, ArrowRight, ShieldCheck, MessageCircle } from 'lucide-react';

const PLANOS: Record<string, { nome: string; descricao: string }> = {
  free: { nome: 'Free', descricao: 'Seu plano gratuito está pronto para começar.' },
  standard: { nome: 'Standard', descricao: 'Agradecemos por escolher o plano Standard do Gestio.' },
  empresarial: { nome: 'Empresarial', descricao: 'Agradecemos por escolher o plano Empresarial do Gestio.' },
};

const WHATSAPP_ATIVACAO = '5513997340823';

export default function PagamentoObrigadoView() {
  const { plano: planoParam } = useParams();
  const slug = (planoParam || (window.location.pathname.includes('empresarial') ? 'empresarial' : window.location.pathname.includes('free') ? 'free' : 'standard')).toLowerCase();
  const plano = PLANOS[slug] || PLANOS.standard;
  const gratuito = slug === 'free';
  const mensagem = encodeURIComponent(
    `Olá! Acabei de concluir o checkout do Gestio e solicito a ativação manual do meu plano ${plano.nome}.\n\nNome da empresa: \nE-mail usado no cadastro: \n\nPor favor, confiram o pagamento e ativem meu acesso. Sei que a ativação depende da conferência manual.`
  );
  const whatsappUrl = `https://wa.me/${WHATSAPP_ATIVACAO}?text=${mensagem}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-10">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">GESTIO</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {gratuito ? 'Obrigado por escolher o Gestio!' : 'Próximo passo: solicitar a ativação'}
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
                  : 'Após concluir o pagamento, toque no botão do WhatsApp para solicitar a ativação. Nossa equipe vai conferir o pagamento e o Super Admin liberará o plano manualmente. A contratação e o início de utilização serão registrados na data da ativação.'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-col justify-center gap-3">
          {!gratuito && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#15803D]"
            >
              <MessageCircle className="h-5 w-5" />
              Chamar no WhatsApp para ativar
            </a>
          )}
          <Link to="/login" className="btn-primary gap-2">
            Ir para o login <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/cadastro" className="btn-secondary">Voltar ao site</Link>
        </div>
        <p className="mt-6 text-[11px] leading-5 text-slate-400">
          {gratuito ? 'Obrigado por confiar no Gestio.' : 'O retorno do checkout não comprova, por si só, que o pagamento foi aprovado. A ativação depende da conferência manual pela equipe.'}
        </p>
      </section>
    </main>
  );
}
