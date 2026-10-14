import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { TenantPlano } from '@/types/api';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { PlanoDefinicao } from './planos';
import { GestioLogo } from '@/components/brand/GestioBrand';

export default function RegisterView() {
  const navigate = useNavigate();
  const auth = useAuthStore();

  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [planos, setPlanos] = useState<PlanoDefinicao[]>([]);
  const [carregandoPlanos, setCarregandoPlanos] = useState(true);
  const [plano, setPlano] = useState<number>(TenantPlano.Standard);

  const [erroServidor, setErroServidor] = useState<string | null>(null);
  const [estaEnviando, setEstaEnviando] = useState(false);
  const [sucessoConfirmacao, setSucessoConfirmacao] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function carregarPlanos() {
      setCarregandoPlanos(true);
      if (!isSupabaseConfigured) {
        if (mounted) {
          setErroServidor('Não foi possível carregar os planos. Tente novamente mais tarde.');
          setCarregandoPlanos(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from('saas_planos')
        .select('id, nome, descricao, preco, periodicidade, status, recursos, ordem')
        .eq('status', 'ativo')
        .order('ordem', { ascending: true });

      if (!mounted) return;
      if (error || !data || data.length === 0) {
        setErroServidor('Os planos não estão disponíveis no momento. Entre em contato com o suporte.');
        setPlanos([]);
        setCarregandoPlanos(false);
        return;
      }

      const planosBanco: PlanoDefinicao[] = data.map((p: any) => {
        const nomeNormalizado = String(p.nome || '').trim().toLowerCase();
        const valor = nomeNormalizado === 'free'
          ? TenantPlano.Free
          : nomeNormalizado === 'empresarial'
            ? TenantPlano.Empresarial
            : TenantPlano.Standard;
        const preco = Number(p.preco || 0);
        const periodicidade = p.periodicidade || 'mensal';
        return {
          valor,
          nome: p.nome,
          precoMensal: preco === 0
            ? 'Gratuito'
            : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(preco) + '/' + periodicidade,
          descricao: p.descricao || '',
          recursos: Array.isArray(p.recursos)
            ? p.recursos.map((recurso: any) => typeof recurso === 'string' ? recurso : recurso?.nome || recurso?.label || '').filter(Boolean)
            : [],
          destaque: nomeNormalizado === 'standard',
        };
      });

      setPlanos(planosBanco);
      if (planosBanco.length > 0 && !planosBanco.some((p) => p.valor === plano)) {
        setPlano(planosBanco[0].valor);
      }
      setErroServidor(null);
      setCarregandoPlanos(false);
    }

    carregarPlanos();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!razaoSocial.trim()) {
      setErroServidor('Informe o nome ou razão social da sua empresa.');
      return;
    }
    if (!nomeCompleto.trim()) {
      setErroServidor('Informe seu nome completo.');
      return;
    }
    if (!email.trim()) {
      setErroServidor('Informe seu e-mail.');
      return;
    }
    if (senha.length < 6) {
      setErroServidor('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirmarSenha) {
      setErroServidor('As senhas não coincidem.');
      return;
    }

    setErroServidor(null);
    setEstaEnviando(true);
    try {
      // Resolve o plano e o checkout configurados pelo Super Admin antes de criar a conta.
      const nomePlanoSelecionado = plano === TenantPlano.Free
        ? 'free'
        : plano === TenantPlano.Empresarial
          ? 'empresarial'
          : 'standard';

      const { data: planoBanco, error: planoError } = await supabase
        .from('saas_planos')
        .select('id, nome, preco, periodicidade, status')
        .eq('status', 'ativo')
        .ilike('nome', nomePlanoSelecionado)
        .maybeSingle();

      if (planoError || !planoBanco) {
        setErroServidor('Não foi possível validar o plano selecionado no banco. Atualize a página ou contate o suporte.');
        return;
      }

      const isPlanoFree = String(planoBanco.nome).trim().toLowerCase() === 'free' || Number(planoBanco.preco) === 0;
      let checkoutUrl: string | null = null;

      if (!isPlanoFree) {
        const periodicidade = planoBanco.periodicidade || 'mensal';
        const { data: linkCheckout, error: linkError } = await supabase
          .from('saas_planos_links')
          .select('url_checkout')
          .eq('plano_id', planoBanco.id)
          .eq('status', 'ativo')
          .eq('periodicidade', periodicidade)
          .limit(1)
          .maybeSingle();

        if (linkError || !linkCheckout?.url_checkout || !String(linkCheckout.url_checkout).startsWith('https://')) {
          setErroServidor('Este plano ainda não possui um link de pagamento ativo configurado pelo Super Admin para esta periodicidade.');
          return;
        }
        checkoutUrl = linkCheckout.url_checkout;
      }

      const resultado = await auth.register({
        razaoSocial: razaoSocial.trim(),
        nomeFantasia: nomeFantasia.trim() || undefined,
        nomeCompleto: nomeCompleto.trim(),
        email: email.trim(),
        senha,
        plano,
        planoSolicitadoId: isPlanoFree ? undefined : planoBanco.id,
      });

      if (!resultado.succeeded) {
        setErroServidor(resultado.errors.join(' ') || 'Não foi possível criar a conta.');
        return;
      }

      if (!isPlanoFree && checkoutUrl) {
        // O checkout é externo; o acesso pago só deve ser liberado após confirmação do pagamento.
        window.location.assign(checkoutUrl);
        return;
      }

      if (resultado.value?.confirmationRequired) {
        setSucessoConfirmacao(true);
        return;
      }

      navigate('/');
    } finally {
      setEstaEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-12">
      <div className="w-full max-w-3xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <GestioLogo variant="light" size="lg" withTagline={true} className="mb-2" />
          <h1 className="text-xl font-bold tracking-tight text-slate-800 mt-2">Crie sua conta no Gestio ERP</h1>
          <p className="mt-1 text-sm text-slate-500">Gestão inteligente para sua marcenaria ou empresa de serviços</p>
        </div>

        {sucessoConfirmacao ? (
          <div className="card space-y-4 p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Verifique seu e-mail</h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Enviamos um link de confirmação para <strong>{email}</strong>. Por favor, acerte o acesso pelo link para ativar sua conta no PGE SAAS 2.
            </p>
            <div className="pt-4">
              <Link to="/login" className="btn-primary w-full max-w-xs mx-auto">
                Ir para o Login
              </Link>
            </div>
          </div>
        ) : (
          <form className="card space-y-6 p-6 sm:p-8" onSubmit={handleSubmit} noValidate>
          {/* Dados da empresa */}
          <div>
            <h2 className="mb-3 text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              1. Sua empresa
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="razaoSocial" className="label-field">
                  Razão social *
                </label>
                <input
                  id="razaoSocial"
                  type="text"
                  placeholder="Ex.: Marcenaria Arte & Design Ltda"
                  className="input-field"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="nomeFantasia" className="label-field">
                  Nome fantasia (opcional)
                </label>
                <input
                  id="nomeFantasia"
                  type="text"
                  placeholder="Ex.: Arte & Design Móveis"
                  className="input-field"
                  value={nomeFantasia}
                  onChange={(e) => setNomeFantasia(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Dados do usuário */}
          <div>
            <h2 className="mb-3 text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              2. Sua conta de administrador
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="nomeCompleto" className="label-field">
                  Nome completo *
                </label>
                <input
                  id="nomeCompleto"
                  type="text"
                  placeholder="Ex.: Carlos Eduardo Oliveira"
                  className="input-field"
                  value={nomeCompleto}
                  onChange={(e) => setNomeCompleto(e.target.value)}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="email" className="label-field">
                  E-mail de acesso *
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="carlos@marcenaria.com.br"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="senha" className="label-field">
                  Senha *
                </label>
                <input
                  id="senha"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  className="input-field"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="confirmarSenha" className="label-field">
                  Confirmar senha *
                </label>
                <input
                  id="confirmarSenha"
                  type="password"
                  placeholder="Repita sua senha"
                  className="input-field"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Seleção de plano */}
          <div>
            <h2 className="mb-3 text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              3. Escolha seu plano de assinatura
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {carregandoPlanos ? (
                <p className="col-span-full py-6 text-center text-sm text-slate-500">Carregando planos disponíveis...</p>
              ) : planos.length === 0 ? (
                <p className="col-span-full rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Nenhum plano disponível para cadastro neste momento.</p>
              ) : planos.map((def) => {
                const isSelected = plano === def.valor;
                return (
                  <label
                    key={def.valor}
                    className={`relative flex cursor-pointer flex-col rounded-xl border p-4 transition-all ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50/70 ring-2 ring-brand-600 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="plano"
                      value={def.valor}
                      checked={isSelected}
                      onChange={() => setPlano(def.valor)}
                      className="sr-only"
                    />
                    {def.destaque && (
                      <span className="absolute -top-2.5 right-3 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                        Mais popular
                      </span>
                    )}
                    <span className="text-sm font-bold text-slate-900">{def.nome}</span>
                    <span className="mt-1 text-lg font-extrabold text-slate-900">{def.precoMensal}</span>
                    <span className="mt-1 text-xs text-slate-500">{def.descricao}</span>
                    <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                      {def.recursos.map((recurso) => (
                        <li key={recurso} className="flex items-start gap-1.5 text-xs text-slate-600">
                          <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-brand-600" />
                          <span>{recurso}</span>
                        </li>
                      ))}
                    </ul>
                  </label>
                );
              })}
            </div>
          </div>

          {erroServidor && <p className="text-xs text-red-600 font-medium">{erroServidor}</p>}

          <button type="submit" className="btn-primary w-full cursor-pointer py-3 text-base" disabled={estaEnviando || carregandoPlanos || planos.length === 0}>
            {estaEnviando ? 'Criando conta...' : 'Criar conta e entrar no ERP'}
          </button>
          <p className="text-center text-xs text-slate-400">
            Nenhuma cobrança é realizada neste ambiente de demonstração e homologação.
          </p>
        </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          Já tem uma conta?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
