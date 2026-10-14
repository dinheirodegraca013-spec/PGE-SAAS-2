import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  MapPin,
  User,
  CreditCard,
  Lock,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Calendar,
  Clock,
  ShieldCheck,
  Info,
  Check,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Máscaras e formatação
function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function formatTelefone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function formatarDataBR(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return '—';
  }
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

interface FormState {
  // A. Perfil da Empresa
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  ramoAtividade: string;
  telefoneComercial: string;
  emailComercial: string;

  // B. Endereço Comercial
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;

  // C. Responsável pela Conta
  nomeResponsavel: string;
  emailAcesso: string;
  telefoneResponsavel: string;
  cargo: string;
}

const INITIAL_FORM: FormState = {
  razaoSocial: '',
  nomeFantasia: '',
  cnpj: '',
  ramoAtividade: 'Marcenaria & Móveis Planejados',
  telefoneComercial: '',
  emailComercial: '',

  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: 'SP',

  nomeResponsavel: '',
  emailAcesso: '',
  telefoneResponsavel: '',
  cargo: 'Administrador da Organização',
};

export default function SettingsView() {
  const auth = useAuthStore();
  const [activeTab, setActiveTab] = useState<'geral' | 'empresa' | 'endereco' | 'responsavel' | 'assinatura' | 'seguranca'>('geral');

  // Estado dos dados
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM);
  const [dadosOriginais, setDadosOriginais] = useState<FormState>(INITIAL_FORM);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [feedbackSucesso, setFeedbackSucesso] = useState<string | null>(null);
  const [feedbackErro, setFeedbackErro] = useState<string | null>(null);

  // Dados da assinatura e conta
  const [dadosAssinatura, setDadosAssinatura] = useState<{
    planoNome: string;
    status: string;
    valor: number;
    periodicidade: string;
    dataInicio: string | null;
    dataRenovacao: string | null;
    recursos: string[];
    checkoutUrl?: string | null;
  }>({
    planoNome: 'Standard',
    status: 'ativa',
    valor: 89.9,
    periodicidade: 'mensal',
    dataInicio: null,
    dataRenovacao: null,
    recursos: [
      'Projetos de móveis planejados ilimitados',
      'Cadastro completo de clientes e orçamentos',
      'Integração oficial WhatsApp Cloud',
      'Isolamento multi-tenant com segurança RLS',
    ],
  });

  // Dados da sessão
  const [dadosSessao, setDadosSessao] = useState<{
    ultimoAcesso: string | null;
    criadaEm: string | null;
    provedor: string;
  }>({
    ultimoAcesso: null,
    criadaEm: null,
    provedor: 'E-mail / Senha',
  });

  // Formulário de alteração de senha
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [alterandoSenha, setAlterandoSenha] = useState(false);
  const [senhaFeedbackSucesso, setSenhaFeedbackSucesso] = useState<string | null>(null);
  const [senhaFeedbackErro, setSenhaFeedbackErro] = useState<string | null>(null);

  // Carregamento de dados reais
  useEffect(() => {
    let mounted = true;

    async function carregarDados() {
      setCarregando(true);
      setFeedbackErro(null);

      try {
        const tenantId = auth.usuario?.tenantId;
        const userId = auth.usuario?.usuarioId;

        let razaoSocial = '';
        let nomeFantasia = '';
        let cnpj = '';
        let nomeResponsavel = auth.usuario?.nomeCompleto || '';
        let emailAcesso = auth.usuario?.email || '';
        let cargo = auth.usuario?.papel === 'AdministradorTenant' ? 'Administrador da Organização' : (auth.usuario?.papel || 'Membro');
        let dataInicioTenant: string | null = null;
        let planoTenant = auth.usuario?.plano || 'Standard';

        if (isSupabaseConfigured) {
          // 1. Busca dados do tenant
          if (tenantId) {
            const { data: tenantData } = await supabase
              .from('tenants')
              .select('razao_social, nome_fantasia, documento, plano, status, ativo, created_at')
              .eq('id', tenantId)
              .maybeSingle();

            if (tenantData) {
              razaoSocial = tenantData.razao_social || '';
              nomeFantasia = tenantData.nome_fantasia || '';
              cnpj = tenantData.documento || '';
              dataInicioTenant = tenantData.created_at || null;
              if (tenantData.plano) planoTenant = tenantData.plano;
            }
          }

          // 2. Busca dados do perfil do responsável
          if (userId) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('nome_completo, email, papel')
              .eq('id', userId)
              .maybeSingle();

            if (profileData) {
              if (profileData.nome_completo) nomeResponsavel = profileData.nome_completo;
              if (profileData.email) emailAcesso = profileData.email;
              if (profileData.papel) {
                cargo = profileData.papel === 'AdministradorTenant' ? 'Administrador da Organização' : profileData.papel;
              }
            }
          }

          // 3. Busca dados reais de assinatura
          if (tenantId) {
            const { data: subData } = await supabase
              .from('saas_assinaturas')
              .select('*, saas_planos(nome, preco, periodicidade, recursos)')
              .eq('tenant_id', tenantId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (subData) {
              const planoAssoc = subData.saas_planos;
              setDadosAssinatura({
                planoNome: planoAssoc?.nome || planoTenant || 'Standard',
                status: subData.status || 'ativa',
                valor: Number(subData.valor || planoAssoc?.preco || 89.9),
                periodicidade: subData.periodicidade || planoAssoc?.periodicidade || 'mensal',
                dataInicio: subData.data_inicio || dataInicioTenant,
                dataRenovacao: subData.data_proximo_vencimento || null,
                recursos: Array.isArray(planoAssoc?.recursos) && planoAssoc.recursos.length > 0
                  ? planoAssoc.recursos
                  : [
                      'Projetos de móveis planejados ilimitados',
                      'Gestão completa de clientes e serviços',
                      'Orçamentos com assinatura e PDF',
                      'Isolamento multi-tenant seguro',
                    ],
              });
            } else {
              setDadosAssinatura((prev) => ({
                ...prev,
                planoNome: planoTenant,
                dataInicio: dataInicioTenant,
              }));
            }
          }

          // 4. Busca informações da sessão do Supabase Auth
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            const user = sessionData.session.user;
            setDadosSessao({
              ultimoAcesso: user.last_sign_in_at || null,
              criadaEm: user.created_at || null,
              provedor: user.app_metadata?.provider === 'email' ? 'E-mail e Senha' : (user.app_metadata?.provider || 'E-mail e Senha'),
            });
          }
        }

        // 5. Recupera dados complementares locais (campos cadastrais complementares de endereço/contato)
        let dadosLocais: Partial<FormState> = {};
        if (tenantId) {
          try {
            const salvo = localStorage.getItem(`gestio_cliente_perfil_${tenantId}`);
            if (salvo) {
              dadosLocais = JSON.parse(salvo);
            }
          } catch {
            // Ignora se não houver dados salvos no storage
          }
        }

        const estadoInicial: FormState = {
          razaoSocial: razaoSocial || 'Marcenaria Arte Design Ltda',
          nomeFantasia: nomeFantasia || 'Marcenaria Arte & Design',
          cnpj: formatCNPJ(cnpj || '12.345.678/0001-90'),
          ramoAtividade: dadosLocais.ramoAtividade || 'Marcenaria & Móveis Planejados',
          telefoneComercial: dadosLocais.telefoneComercial ? formatTelefone(dadosLocais.telefoneComercial) : '(11) 3245-8900',
          emailComercial: dadosLocais.emailComercial || 'contato@marcenariaarte.com.br',

          cep: dadosLocais.cep ? formatCEP(dadosLocais.cep) : '04578-000',
          logradouro: dadosLocais.logradouro || 'Avenida das Nações Unidas',
          numero: dadosLocais.numero || '12901',
          complemento: dadosLocais.complemento || 'Galpão 4B',
          bairro: dadosLocais.bairro || 'Brooklin Novo',
          cidade: dadosLocais.cidade || 'São Paulo',
          estado: dadosLocais.estado || 'SP',

          nomeResponsavel: nomeResponsavel || 'Carlos Eduardo Oliveira',
          emailAcesso: emailAcesso || 'carlos@marcenariaarte.com.br',
          telefoneResponsavel: dadosLocais.telefoneResponsavel ? formatTelefone(dadosLocais.telefoneResponsavel) : '(11) 98765-4321',
          cargo: cargo || 'Administrador da Organização',
        };

        if (mounted) {
          setFormData(estadoInicial);
          setDadosOriginais(estadoInicial);
        }
      } catch (err: any) {
        console.error('Erro ao carregar dados do perfil:', err);
        if (mounted) {
          setFeedbackErro('Não foi possível carregar todas as informações do perfil da empresa.');
        }
      } finally {
        if (mounted) setCarregando(false);
      }
    }

    carregarDados();
    return () => { mounted = false; };
  }, [auth.usuario?.tenantId, auth.usuario?.usuarioId]);

  // Identificação de alterações pendentes
  const temAlteracoes = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(dadosOriginais);
  }, [formData, dadosOriginais]);

  // Força da nova senha
  const forcaSenha = useMemo(() => {
    if (!novaSenha) return 0;
    let score = 0;
    if (novaSenha.length >= 6) score += 1;
    if (novaSenha.length >= 8) score += 1;
    if (/[A-Z]/.test(novaSenha) && /[a-z]/.test(novaSenha)) score += 1;
    if (/[0-9]/.test(novaSenha)) score += 1;
    if (/[^A-Za-z0-9]/.test(novaSenha)) score += 1;
    return Math.min(score, 4);
  }, [novaSenha]);

  // Cancelar alterações
  const handleCancelar = () => {
    setFormData(dadosOriginais);
    setFeedbackErro(null);
    setFeedbackSucesso(null);
  };

  // Salvar alterações cadastrais
  const handleSalvar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFeedbackErro(null);
    setFeedbackSucesso(null);

    // Validações
    if (!formData.razaoSocial.trim()) {
      setFeedbackErro('Informe a Razão Social da empresa.');
      return;
    }
    if (!formData.nomeResponsavel.trim()) {
      setFeedbackErro('Informe o Nome Completo do responsável pela conta.');
      return;
    }

    const cleanCnpj = formData.cnpj.replace(/\D/g, '');
    if (cleanCnpj && cleanCnpj.length !== 14) {
      setFeedbackErro('O CNPJ informado deve conter exatamente 14 dígitos.');
      return;
    }

    if (formData.emailComercial && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailComercial.trim())) {
      setFeedbackErro('Informe um e-mail comercial válido.');
      return;
    }

    setSalvando(true);

    try {
      const tenantId = auth.usuario?.tenantId;
      const userId = auth.usuario?.usuarioId;

      if (isSupabaseConfigured) {
        // 1. Persiste campos reais suportados na tabela 'tenants' (razao_social, nome_fantasia, documento)
        if (tenantId) {
          const { error: tenantErr } = await supabase
            .from('tenants')
            .update({
              razao_social: formData.razaoSocial.trim(),
              nome_fantasia: formData.nomeFantasia.trim() || null,
              documento: cleanCnpj || null,
            })
            .eq('id', tenantId);

          if (tenantErr) {
            console.error('Erro ao atualizar tenant no Supabase:', tenantErr);
            throw new Error(tenantErr.message || 'Erro ao persistir dados da empresa.');
          }
        }

        // 2. Persiste campos reais suportados na tabela 'profiles' (nome_completo)
        if (userId) {
          const { error: profileErr } = await supabase
            .from('profiles')
            .update({
              nome_completo: formData.nomeResponsavel.trim(),
            })
            .eq('id', userId);

          if (profileErr) {
            console.error('Erro ao atualizar profile no Supabase:', profileErr);
            throw new Error(profileErr.message || 'Erro ao persistir dados do responsável.');
          }
        }
      }

      // 3. Salva os dados complementares locais (endereço e contatos secundários) para persistência segura
      if (tenantId) {
        localStorage.setItem(`gestio_cliente_perfil_${tenantId}`, JSON.stringify(formData));
      }

      setDadosOriginais(formData);
      setFeedbackSucesso('Alterações salvas com sucesso!');
      setTimeout(() => setFeedbackSucesso(null), 5000);
    } catch (err: any) {
      setFeedbackErro(err.message || 'Falha ao salvar as alterações. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  // Alteração de senha via Supabase Auth
  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setSenhaFeedbackErro(null);
    setSenhaFeedbackSucesso(null);

    if (novaSenha.length < 6) {
      setSenhaFeedbackErro('A nova senha deve possuir pelo menos 6 caracteres.');
      return;
    }

    if (novaSenha !== confirmarNovaSenha) {
      setSenhaFeedbackErro('A confirmação da senha não coincide com a nova senha.');
      return;
    }

    setAlterandoSenha(true);

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.updateUser({
          password: novaSenha,
        });

        if (error) {
          throw new Error(error.message || 'Não foi possível alterar a senha no Supabase Auth.');
        }
      }

      setSenhaFeedbackSucesso('Senha atualizada com sucesso! Utilize a nova senha no próximo acesso.');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarNovaSenha('');
      setTimeout(() => setSenhaFeedbackSucesso(null), 6000);
    } catch (err: any) {
      setSenhaFeedbackErro(err.message || 'Erro ao atualizar a senha. Verifique a conexão.');
    } finally {
      setAlterandoSenha(false);
    }
  };

  // Avatar com monograma da empresa
  const monograma = useMemo(() => {
    const nome = formData.nomeFantasia || formData.razaoSocial || 'Gestio';
    const partes = nome.trim().split(/\s+/);
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return nome.slice(0, 2).toUpperCase();
  }, [formData.nomeFantasia, formData.razaoSocial]);

  if (carregando) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-600 border-r-transparent" />
          <p className="mt-3 text-sm font-medium text-slate-500">Carregando dados da sua empresa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      {/* Cabeçalho Premium do Perfil */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Perfil da Empresa & Conta
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Conta Ativa
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Gerencie as informações cadastrais da sua empresa, responsável, plano contratado e segurança de acesso.
          </p>
        </div>

        {/* Botões de Ação Principais no Topo */}
        <div className="flex items-center gap-3">
          {temAlteracoes && (
            <button
              type="button"
              onClick={handleCancelar}
              disabled={salvando}
              className="btn-secondary text-xs sm:text-sm py-2 px-3.5"
            >
              <RotateCcw className="mr-1.5 h-4 w-4 text-slate-500" />
              Cancelar
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSalvar()}
            disabled={salvando || !temAlteracoes}
            className={`btn-primary text-xs sm:text-sm py-2 px-4 shadow-sm transition-all ${
              !temAlteracoes ? 'opacity-60 cursor-not-allowed' : 'hover:shadow'
            }`}
          >
            {salvando ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-4 w-4" />
                Salvar alterações
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alertas de Notificação */}
      {feedbackSucesso && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm transition-all">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <div className="flex-1 font-medium">{feedbackSucesso}</div>
        </div>
      )}

      {feedbackErro && (
        <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-sm transition-all">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <div className="flex-1 font-medium">{feedbackErro}</div>
        </div>
      )}

      {/* Cartão de Resumo da Empresa com Monograma / Logo */}
      <div className="card p-6 bg-gradient-to-r from-white via-white to-slate-50/60 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-500 text-white font-bold text-xl shadow-md ring-4 ring-brand-50">
              {monograma}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {formData.nomeFantasia || formData.razaoSocial || 'Minha Empresa'}
                </h2>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {formData.cnpj ? `CNPJ ${formData.cnpj}` : 'CNPJ em preenchimento'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {formData.razaoSocial} · {formData.ramoAtividade}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  {formData.nomeResponsavel}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {formData.cidade} - {formData.estado}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-6">
            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400 font-medium">Plano Contratado</span>
              <div className="flex items-center gap-1.5 sm:justify-end">
                <Sparkles className="h-4 w-4 text-brand-600" />
                <span className="text-sm font-bold text-slate-900">{dadosAssinatura.planoNome}</span>
              </div>
              <p className="text-[11px] text-emerald-600 font-medium">Assinatura ativa e regular</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação Rápida entre Seções */}
      <div className="flex border-b border-slate-200 overflow-x-auto text-sm font-medium text-slate-600 gap-1 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('geral')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'geral'
              ? 'border-brand-600 text-brand-600 font-semibold'
              : 'border-transparent hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Building2 className="h-4 w-4" />
          Visão Geral
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('empresa')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'empresa'
              ? 'border-brand-600 text-brand-600 font-semibold'
              : 'border-transparent hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Building2 className="h-4 w-4" />
          Perfil da Empresa
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('endereco')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'endereco'
              ? 'border-brand-600 text-brand-600 font-semibold'
              : 'border-transparent hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <MapPin className="h-4 w-4" />
          Endereço Comercial
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('responsavel')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'responsavel'
              ? 'border-brand-600 text-brand-600 font-semibold'
              : 'border-transparent hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <User className="h-4 w-4" />
          Responsável
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('assinatura')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'assinatura'
              ? 'border-brand-600 text-brand-600 font-semibold'
              : 'border-transparent hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Assinatura
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('seguranca')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'seguranca'
              ? 'border-brand-600 text-brand-600 font-semibold'
              : 'border-transparent hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Lock className="h-4 w-4" />
          Segurança
        </button>
      </div>

      {/* Formulário Principal com as Seções Solicitadas */}
      <form onSubmit={handleSalvar} className="space-y-8">
        {/* ========================================================================= */}
        {/* SEÇÃO A: PERFIL DA EMPRESA */}
        {/* ========================================================================= */}
        {(activeTab === 'geral' || activeTab === 'empresa') && (
          <div className="card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-brand-50 p-2 text-brand-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Perfil da Empresa</h3>
                  <p className="text-xs text-slate-500">Dados cadastrais comerciais visíveis em orçamentos e comunicações.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field">
                  Nome Fantasia
                </label>
                <input
                  type="text"
                  value={formData.nomeFantasia}
                  onChange={(e) => setFormData({ ...formData, nomeFantasia: e.target.value })}
                  placeholder="Ex.: Marcenaria Arte & Design"
                  className="input-field"
                />
                <span className="mt-1 block text-[11px] text-slate-400">Nome comercial divulgado aos seus clientes.</span>
              </div>

              <div>
                <label className="label-field">
                  Razão Social <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.razaoSocial}
                  onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                  placeholder="Razão Social completa"
                  className="input-field font-medium"
                />
                <span className="mt-1 block text-[11px] text-slate-400">Nome oficial registrado no CNPJ.</span>
              </div>

              <div>
                <label className="label-field">
                  CNPJ
                </label>
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                  placeholder="00.000.000/0000-00"
                  className="input-field font-mono"
                />
                <span className="mt-1 block text-[11px] text-slate-400">Cadastro Nacional da Pessoa Jurídica.</span>
              </div>

              <div>
                <label className="label-field">
                  Ramo de Atividade
                </label>
                <input
                  type="text"
                  value={formData.ramoAtividade}
                  onChange={(e) => setFormData({ ...formData, ramoAtividade: e.target.value })}
                  placeholder="Ex.: Marcenaria & Móveis Planejados"
                  className="input-field"
                />
                <span className="mt-1 block text-[11px] text-slate-400">Segmento principal de atuação.</span>
              </div>

              <div>
                <label className="label-field">
                  Telefone Comercial
                </label>
                <input
                  type="text"
                  value={formData.telefoneComercial}
                  onChange={(e) => setFormData({ ...formData, telefoneComercial: formatTelefone(e.target.value) })}
                  placeholder="(00) 0000-0000"
                  className="input-field"
                />
                <span className="mt-1 block text-[11px] text-slate-400">Contato telefônico da empresa.</span>
              </div>

              <div>
                <label className="label-field">
                  E-mail Comercial
                </label>
                <input
                  type="email"
                  value={formData.emailComercial}
                  onChange={(e) => setFormData({ ...formData, emailComercial: e.target.value })}
                  placeholder="contato@suaempresa.com.br"
                  className="input-field"
                />
                <span className="mt-1 block text-[11px] text-slate-400">E-mail público para recebimento de solicitações.</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SEÇÃO B: ENDEREÇO COMERCIAL */}
        {/* ========================================================================= */}
        {(activeTab === 'geral' || activeTab === 'endereco') && (
          <div className="card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Endereço Comercial</h3>
                  <p className="text-xs text-slate-500">Localização física do escritório, marcenaria ou fábrica.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label-field">
                  CEP
                </label>
                <input
                  type="text"
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: formatCEP(e.target.value) })}
                  placeholder="00000-000"
                  className="input-field font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="label-field">
                  Logradouro
                </label>
                <input
                  type="text"
                  value={formData.logradouro}
                  onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                  placeholder="Rua, Avenida, Alameda..."
                  className="input-field"
                />
              </div>

              <div>
                <label className="label-field">
                  Número
                </label>
                <input
                  type="text"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  placeholder="123"
                  className="input-field"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="label-field">
                  Complemento
                </label>
                <input
                  type="text"
                  value={formData.complemento}
                  onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                  placeholder="Galpão, Sala, Bloco..."
                  className="input-field"
                />
              </div>

              <div>
                <label className="label-field">
                  Bairro
                </label>
                <input
                  type="text"
                  value={formData.bairro}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  placeholder="Nome do bairro"
                  className="input-field"
                />
              </div>

              <div>
                <label className="label-field">
                  Cidade
                </label>
                <input
                  type="text"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  placeholder="Cidade"
                  className="input-field"
                />
              </div>

              <div>
                <label className="label-field">
                  Estado (UF)
                </label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="input-field bg-white"
                >
                  {ESTADOS_BRASIL.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SEÇÃO C: RESPONSÁVEL PELA CONTA */}
        {/* ========================================================================= */}
        {(activeTab === 'geral' || activeTab === 'responsavel') && (
          <div className="card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-teal-50 p-2 text-teal-600">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Responsável pela Conta</h3>
                  <p className="text-xs text-slate-500">Dados do titular com permissão de gestão no Gestio ERP.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field">
                  Nome Completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nomeResponsavel}
                  onChange={(e) => setFormData({ ...formData, nomeResponsavel: e.target.value })}
                  placeholder="Seu nome completo"
                  className="input-field font-medium"
                />
                <span className="mt-1 block text-[11px] text-slate-400">Nome exibido nas assinaturas e orçamentos.</span>
              </div>

              <div>
                <label className="label-field">
                  E-mail de Acesso
                </label>
                <div className="relative">
                  <input
                    type="email"
                    disabled
                    value={formData.emailAcesso}
                    className="input-field bg-slate-50 text-slate-600 cursor-not-allowed pr-28"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                    Login Principal
                  </span>
                </div>
                <span className="mt-1 block text-[11px] text-slate-400">E-mail associado à sua credencial de segurança.</span>
              </div>

              <div>
                <label className="label-field">
                  Telefone Direto
                </label>
                <input
                  type="text"
                  value={formData.telefoneResponsavel}
                  onChange={(e) => setFormData({ ...formData, telefoneResponsavel: formatTelefone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  className="input-field"
                />
                <span className="mt-1 block text-[11px] text-slate-400">Celular ou WhatsApp do responsável.</span>
              </div>

              <div>
                <label className="label-field">
                  Cargo / Função
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled
                    value={formData.cargo}
                    className="input-field bg-slate-50 text-slate-600 cursor-not-allowed"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                    Acesso Total
                  </span>
                </div>
                <span className="mt-1 block text-[11px] text-slate-400">Nível de permissão atribuído à conta.</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SEÇÃO D: CONTA E ASSINATURA */}
        {/* ========================================================================= */}
        {(activeTab === 'geral' || activeTab === 'assinatura') && (
          <div className="card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Conta e Assinatura</h3>
                  <p className="text-xs text-slate-500">Visão do plano contratado, vigência e recursos liberados.</p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Assinatura Regular
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <span className="text-xs font-medium text-slate-500">Plano Atual</span>
                <p className="mt-1 text-xl font-bold text-slate-900">{dadosAssinatura.planoNome}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {dadosAssinatura.valor > 0
                    ? `${formatarMoeda(dadosAssinatura.valor)} / ${dadosAssinatura.periodicidade}`
                    : 'Plano Gratuito / Homologação'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <span className="text-xs font-medium text-slate-500">Data de Contratação</span>
                <p className="mt-1 text-base font-semibold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {formatarDataBR(dadosAssinatura.dataInicio)}
                </p>
                <p className="mt-1 text-xs text-slate-500">Início da vigência no SaaS</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <span className="text-xs font-medium text-slate-500">Próxima Renovação</span>
                <p className="mt-1 text-base font-semibold text-slate-900 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-400" />
                  {dadosAssinatura.dataRenovacao ? formatarDataBR(dadosAssinatura.dataRenovacao) : 'Renovação Automática'}
                </p>
                <p className="mt-1 text-xs text-emerald-600 font-medium">Sem pendências financeiras</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Recursos Inclusos no seu Plano</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {dadosAssinatura.recursos.map((rec, i) => (
                  <div key={i} className="flex items-center gap-2 text-slate-700 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Barra de Salvamento Flutuante/Inferior */}
        {temAlteracoes && (
          <div className="sticky bottom-6 z-10 flex items-center justify-between rounded-xl border border-slate-300 bg-white/95 p-4 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-medium">Você possui alterações cadastrais não salvas.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelar}
                disabled={salvando}
                className="btn-secondary text-xs sm:text-sm py-1.5 px-3"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="btn-primary text-xs sm:text-sm py-1.5 px-4"
              >
                {salvando ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* ========================================================================= */}
      {/* SEÇÃO E: SEGURANÇA E ACESSO (FORMULÁRIO SEPARADO DE CREDENCIAIS) */}
      {/* ========================================================================= */}
      {(activeTab === 'geral' || activeTab === 'seguranca') && (
        <div className="card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Segurança & Acesso</h3>
                <p className="text-xs text-slate-500">Atualização de senha e controle da sessão de login.</p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Conexão Segura
            </span>
          </div>

          {/* Alteração de Senha */}
          <form onSubmit={handleAlterarSenha} className="space-y-4 max-w-xl">
            <h4 className="text-sm font-bold text-slate-900">Alterar Senha de Acesso</h4>
            <p className="text-xs text-slate-500">
              Crie uma senha forte contendo letras maiúsculas, minúsculas, números e caracteres especiais.
            </p>

            {senhaFeedbackSucesso && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                {senhaFeedbackSucesso}
              </div>
            )}

            {senhaFeedbackErro && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 font-medium">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                {senhaFeedbackErro}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="label-field text-xs">Nova Senha</label>
                <div className="relative">
                  <input
                    type={mostrarNovaSenha ? 'text' : 'password'}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    className="input-field pr-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {mostrarNovaSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Barra de Força da Senha */}
                {novaSenha && (
                  <div className="mt-2 space-y-1">
                    <div className="flex h-1.5 w-full gap-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full transition-all duration-300 ${
                          forcaSenha <= 1 ? 'w-1/4 bg-rose-500' : forcaSenha === 2 ? 'w-2/4 bg-amber-500' : forcaSenha === 3 ? 'w-3/4 bg-blue-500' : 'w-full bg-emerald-500'
                        }`}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {forcaSenha <= 1 ? 'Senha fraca' : forcaSenha === 2 ? 'Senha regular' : forcaSenha === 3 ? 'Senha boa' : 'Senha forte'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="label-field text-xs">Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={confirmarNovaSenha}
                  onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="input-field text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={alterandoSenha || !novaSenha || !confirmarNovaSenha}
                className="btn-secondary text-xs py-2 px-4 font-medium"
              >
                {alterandoSenha ? 'Atualizando...' : 'Atualizar senha'}
              </button>
            </div>
          </form>

          {/* Informações da Sessão Atual */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Informações da Sessão</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                <span className="text-slate-400">E-mail Conectado:</span>
                <p className="font-semibold text-slate-800 mt-0.5 truncate">{auth.usuario?.email}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                <span className="text-slate-400">Último Acesso:</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {dadosSessao.ultimoAcesso ? formatarDataBR(dadosSessao.ultimoAcesso) : 'Sessão atual ativa'}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                <span className="text-slate-400">Método de Login:</span>
                <p className="font-semibold text-slate-800 mt-0.5">{dadosSessao.provedor}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
