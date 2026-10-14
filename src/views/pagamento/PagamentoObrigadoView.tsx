import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Clock3, ArrowRight, ShieldCheck, MessageCircle } from 'lucide-react';

const PLANOS: Record<string, { nome: string; descricao: string }> = {
  free: { nome: 'Free', descricao: 'Seu plano gratuito está pronto para começar.' },
  standard: { nome: 'Standard', descricao: 'Sua solicitação do plano Standard foi registrada.' },
  empresarial: { nome: 'Empresarial', descricao: 'Sua solicitação do plano Empresarial foi registrada.' },
};

const WHATSAPP = String(import.meta.env.VITE_GESTIO_WHATSAPP || '').replace(/\D/g, '');

export default function PagamentoObrigadoView() {
  const { plano: planoParam } = useParams();
  const slug = (planoParam || (window.location.pathname.includes('empresarial') ? 'empresarial' : window.location.pathname.includes('free') ? 'free' : 'standard')).toLowerCase();
  const plano = PLANOS[slug] || PLANOS.standard;
  const gratuito = slug === 'free';
  const mensagemWhatsApp = encodeURIComponent(`Olá! Acabei de me cadastrar na Gestio ERP e escolhi o plano ${plano.nome}. Já realizei o pagamento e gostaria de solicitar a ativação manual.\nE-mail cadastrado: `);
  const whatsappUrl = `https://wa.me/?text=${mensagemWhatsApp}`;
  const mensagem = encodeURIComponent(
    'Olá! Acabei de realizar o checkout do Gestio e solicito a ativação manual do meu plano ' +
    plano.nome + '. Meu e-mail de cadastro é: [INFORME SEU E-MAIL].'
  );
  const whatsappUrl = WHATSAPP ? 'https://wa.me/' + WHATSAPP + '?text=' + mensagem : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-10">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">GESTIO</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {gratuito ? 'Obrigado por escolher o Gestio!' : 'Próximo passo: ativar seu plano'}
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
                  ? 'Seu plano gratuito já pode ser utilizado conforme os limites disponíveis.'
                  : 'Após concluir o pagamento, fale com nossa equipe pelo WhatsApp. O Super Admin confirmará a solicitação e ativará seu plano manualmente. A data de contratação e o início da utilização serão contados a partir da ativação.'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-col justify-center gap-3">
          {!gratuito && whatsappUrl ? (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center justify-center gap-2">
              <MessageCircle className="h-4 w-4" /> Chamar no WhatsApp para ativar
            </a>
          ) : !gratuito ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-900">
              O WhatsApp de atendimento ainda não foi configurado. Configure a variável VITE_GESTIO_WHATSAPP no Vercel com o número no formato internacional, somente números (ex.: 5511999999999).
            </div>
          ) : null}
          <Link to="/login" className="btn-secondary inline-flex items-center justify-center gap-2">
            Ir para o login <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-6 text-[11px] leading-5 text-slate-400">
          {gratuito ? 'Obrigado por confiar no Gestio.' : 'O retorno do checkout não é confirmação automática do pagamento. A ativação será manual após a conferência.'}
        </p>
      </section>
    </main>
  );
}
