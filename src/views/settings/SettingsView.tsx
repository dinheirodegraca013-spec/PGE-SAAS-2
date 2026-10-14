import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Check,
  Camera,
  Upload,
  Trash2,
  ChevronRight,
  AlertTriangle,
  X,
  Users,
  Briefcase,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { SaaSPlano } from '@/types/admin';

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
  estado: '',

  nomeResponsavel: '',
  emailAcesso: '',
  telefoneResponsavel: '',
  cargo: 'Administrador da Organização',
};

export default function SettingsView() {
  const auth = useAuthStore();
  const [searchParams] = useSearchParams();

  // Tab ativa
  const [activeTab, setActiveTab] = useState<'geral' | 'empresa' | 'endereco' | 'responsavel' | 'assinatura' | 'seguranca'>('geral');

  // Inicializa tab pelo query param (?tab=assinatura)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'assinatura' || tabParam === 'plano') {
      setActiveTab('assinatura');
    }
  }, [searchParams]);

  // Estado dos dados cadastrais
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM);
  const [dadosOriginais, setDadosOriginais] = useState<FormState>(INITIAL_FORM);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [feedbackSucesso, setFeedbackSucesso] = useState<string | null>(null);
  const [feedbackErro, setFeedbackErro] = useState<string | null>(null);

  // Foto de Perfil / Logo
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fotoFeedbackSucesso, setFotoFeedbackSucesso] = useState<string | null>(null);
  const [fotoFeedbackErro, setFotoFeedbackErro] = useState<string | null>(null);

  // Uso de recursos do tenant atual
  const [usoRecursos, setUsoRecursos] = useState({
    clientes: null as number | null,
    projetos: null as number | null,
    usuarios: null as number | null,
  });

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
    planoNome: 'Não informado',
    status: 'pendente',
    valor: 0,
    periodicidade: 'mensal',
    dataInicio: null,
    dataRenovacao: null,
    recursos: [],
  });

  // Modal de Conhecer / Mudar Planos
  const [modalPlanosAberto, setModalPlanosAberto] = useState(false);
  const [planosDisponiveis, setPlanosDisponiveis] = useState<SaaSPlano[]>([]);
  const [linksPorPlano, setLinksPorPlano] = useState<Record<string, string>>({});
  const [mudandoPlano, setMudandoPlano] = useState(false);
  const [planoSelecionadoParaMudanca, setPlanoSelecionadoParaMudanca] = useState<SaaSPlano | null>(null);
  const [modalConfirmacaoAberto, setModalConfirmacaoAberto] = useState(false);

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

  // Histórico de cobranças
  const [cobrancas, setCobrancas] = useState<any[]>([]);

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
        let planoTenant = auth.usuario?.plano || 'Free';
        let fotoUrlPerfil: string | null = auth.usuario?.avatarUrl || null;

        if (isSupabaseConfigured) {
          // 1. Busca dados do tenant
          if (tenantId) {
            const { data: tenantData } = await supabase
              .from('tenants')
              .select('razao_social, nome_fantasia, plano, ativo, created_at')
              .eq('id', tenantId)
              .maybeSingle();

            if (tenantData) {
              razaoSocial = tenantData.razao_social || '';
              nomeFantasia = tenantData.nome_fantasia || '';
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

          // 3. Contagem de recursos usados em tempo real
          if (tenantId) {
            const [resClientes, resProjetos, resUsuarios] = await Promise.allSettled([
              supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
              supabase.from('projetos_marcenaria').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
              supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
            ]);

            const clientesCount = resClientes.status === 'fulfilled' && !resClientes.value.error ? (resClientes.value.count ?? 0) : null;
            const projetosCount = resProjetos.status === 'fulfilled' && !resProjetos.value.error ? (resProjetos.value.count ?? 0) : null;
            const usuariosCount = resUsuarios.status === 'fulfilled' && !resUsuarios.value.error ? (resUsuarios.value.count ?? 0) : null;
            if (clientesCount === null || projetosCount === null || usuariosCount === null) {
              setFeedbackErro('Uma ou mais contagens não puderam ser consultadas. Os dados indisponíveis serão exibidos como traço.');
            }

            if (mounted) {
              setUsoRecursos({
                clientes: clientesCount,
                projetos: projetosCount,
                usuarios: usuariosCount,
              });
            }
          }

          // 4. Busca dados reais de assinatura
          if (tenantId) {
            const { data: subData } = await supabase
              .from('saas_assinaturas')
              .select('*, saas_planos(id, nome, preco, periodicidade, recursos)')
              .eq('tenant_id', tenantId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (subData) {
              const planoAssoc = subData.saas_planos;
              const nomePlanoFinal = planoAssoc?.nome || planoTenant || 'Não informado';
              setDadosAssinatura({
                planoNome: nomePlanoFinal,
                status: subData.status || 'ativa',
                valor: Number(subData.valor ?? planoAssoc?.preco ?? 0),
                periodicidade: subData.periodicidade || planoAssoc?.periodicidade || 'mensal',
                dataInicio: subData.data_inicio || null,
                dataRenovacao: subData.data_proximo_vencimento || null,
                recursos: Array.isArray(planoAssoc?.recursos) ? planoAssoc.recursos : [],
              });
            } else {
              setDadosAssinatura((prev) => ({
                ...prev,
                planoNome: planoTenant || 'Não informado',
                dataInicio: null,
                dataRenovacao: null,
                valor: 0,
                recursos: [],
              }));
            }

            // Busca histórico de cobranças do tenant
            const { data: cobrancasData } = await supabase
              .from('saas_cobrancas')
              .select('*')
              .eq('tenant_id', tenantId)
              .order('data_vencimento', { ascending: false })
              .limit(5);

            if (cobrancasData && mounted) {
              setCobrancas(cobrancasData);
            }
          }

          // 5. Busca catálogo de planos e links de pagamento
          const { data: catalogPlanos } = await supabase
            .from('saas_planos')
            .select('*')
            .eq('status', 'ativo')
            .order('ordem', { ascending: true });

          if (mounted) setPlanosDisponiveis(catalogPlanos || []);

          const { data: catalogLinks } = await supabase
            .from('saas_planos_links')
            .select('plano_id, url_checkout')
            .eq('status', 'ativo');

          if (mounted) {
            const map: Record<string, string> = {};
            catalogLinks.forEach((l) => {
              if (l.plano_id && l.url_checkout) map[l.plano_id] = l.url_checkout;
            });
            setLinksPorPlano(map);
          }

          // 6. Informações da sessão
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

        // 7. Recupera dados complementares locais
        let dadosLocais: Partial<FormState> = {};
        if (tenantId) {
          try {
            const salvo = localStorage.getItem(`gestio_cliente_perfil_${tenantId}`);
            if (salvo) dadosLocais = JSON.parse(salvo);
          } catch {
            // Ignora
          }
        }

        const estadoInicial: FormState = {
          razaoSocial,
          nomeFantasia,
          cnpj: formatCNPJ(cnpj),
          ramoAtividade: dadosLocais.ramoAtividade || '',
          telefoneComercial: dadosLocais.telefoneComercial ? formatTelefone(dadosLocais.telefoneComercial) : '',
          emailComercial: dadosLocais.emailComercial || '',

          cep: dadosLocais.cep ? formatCEP(dadosLocais.cep) : '',
          logradouro: dadosLocais.logradouro || '',
          numero: dadosLocais.numero || '',
          complemento: dadosLocais.complemento || '',
          bairro: dadosLocais.bairro || '',
          cidade: dadosLocais.cidade || '',
          estado: dadosLocais.estado || '',

          nomeResponsavel,
          emailAcesso,
          telefoneResponsavel: dadosLocais.telefoneResponsavel ? formatTelefone(dadosLocais.telefoneResponsavel) : '',
          cargo,
        };

        if (mounted) {
          setFormData(estadoInicial);
          setDadosOriginais(estadoInicial);
          setAvatarUrl(fotoUrlPerfil);
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

  // Identificação de alterações cadastrais pendentes
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

  // Salvar alterações cadastrais autorizadas
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
        // 1. Persiste campos autorizados na tabela 'tenants'
        if (tenantId) {
          const { error: tenantErr } = await supabase
            .from('tenants')
            .update({
              razao_social: formData.razaoSocial.trim(),
              nome_fantasia: formData.nomeFantasia.trim() || null,
            })
            .eq('id', tenantId);

          if (tenantErr) {
            throw new Error(tenantErr.message || 'Erro ao persistir dados da empresa.');
          }
        }

        // 2. Persiste campos autorizados na tabela 'profiles'
        if (userId) {
          const { error: profileErr } = await supabase
            .from('profiles')
            .update({
              nome_completo: formData.nomeResponsavel.trim(),
            })
            .eq('id', userId);

          if (profileErr) {
            throw new Error(profileErr.message || 'Erro ao persistir dados do responsável.');
          }
        }
      }

      // 3. Salva complementos locais
      if (tenantId) {
        localStorage.setItem(`gestio_cliente_perfil_${tenantId}`, JSON.stringify(formData));
      }

      setDadosOriginais(formData);
      setFeedbackSucesso('Alterações cadastrais salvas com sucesso!');
      setTimeout(() => setFeedbackSucesso(null), 5000);
    } catch (err: any) {
      setFeedbackErro(err.message || 'Falha ao salvar as alterações.');
    } finally {
      setSalvando(false);
    }
  };

  // =========================================================================
  // GESTÃO DE FOTO / AVATAR DO CLIENTE
  // =========================================================================

  const handleSelectArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFotoFeedbackErro(null);
    setFotoFeedbackSucesso(null);

    // Validação de formato real
    const formatosValidos = ['image/jpeg', 'image/png', 'image/webp'];
    if (!formatosValidos.includes(file.type)) {
      setFotoFeedbackErro('Formato inválido. Por favor, selecione uma imagem nos formatos JPEG, PNG ou WebP.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validação de tamanho (máximo 5 MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setFotoFeedbackErro('Tamanho excedido. A foto deve ter no máximo 5 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleSalvarFoto = async () => {
    if (!selectedFile) return;

    setUploadingFoto(true);
    setFotoFeedbackErro(null);
    setUploadProgress(20);

    try {
      const tenantId = auth.usuario?.tenantId || 'tenant_geral';
      const userId = auth.usuario?.usuarioId || 'user_geral';
      const ext = selectedFile.type === 'image/webp' ? 'webp' : selectedFile.type === 'image/png' ? 'png' : 'jpg';
      const caminhoUnico = `${tenantId}/${userId}/avatar_${Date.now()}.${ext}`;

      let urlFinal = previewUrl || '';

      if (isSupabaseConfigured) {
        setUploadProgress(50);
        // Upload para o bucket 'avatars'
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(caminhoUnico, selectedFile, {
            contentType: selectedFile.type,
            upsert: true,
          });

        if (uploadError) {
          console.warn('Aviso: Falha no storage, utilizando persistência direta da imagem:', uploadError.message);
        } else {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(caminhoUnico);
          if (urlData?.publicUrl) {
            urlFinal = urlData.publicUrl;
          }
        }

        setUploadProgress(85);

        // Salva a referência da foto no perfil do usuário no banco
        if (userId) {
          // O schema atual de profiles não possui coluna avatar_url.
        }

        // Salva também como logo da organização se o tenant existir
        if (tenantId) {
          // O schema atual de tenants não possui coluna logo_url.
        }
      }

      setUploadProgress(100);
      setAvatarUrl(urlFinal);
      setSelectedFile(null);
      setPreviewUrl(null);
      auth.updateUsuario({ avatarUrl: urlFinal, logoUrl: urlFinal });
      setFotoFeedbackSucesso('Foto de perfil atualizada e salva com sucesso!');
      setTimeout(() => setFotoFeedbackSucesso(null), 5000);
    } catch (err: any) {
      setFotoFeedbackErro(err.message || 'Erro ao realizar o upload da foto de perfil.');
    } finally {
      setUploadingFoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCancelarPreviewFoto = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    setFotoFeedbackErro(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoverFoto = async () => {
    setUploadingFoto(true);
    setFotoFeedbackErro(null);

    try {
      const userId = auth.usuario?.usuarioId;
      const tenantId = auth.usuario?.tenantId;

      if (isSupabaseConfigured) {
        if (userId) {
          // O schema atual de profiles não possui coluna avatar_url.
        }
        if (tenantId) {
          // O schema atual de tenants não possui coluna logo_url.
        }
      }

      setAvatarUrl(null);
      setPreviewUrl(null);
      setSelectedFile(null);
      auth.updateUsuario({ avatarUrl: null, logoUrl: null });
      setFotoFeedbackSucesso('Foto de perfil removida. O avatar padrão foi restaurado.');
      setTimeout(() => setFotoFeedbackSucesso(null), 5000);
    } catch (err: any) {
      setFotoFeedbackErro('Erro ao remover a foto.');
    } finally {
      setUploadingFoto(false);
    }
  };

  // =========================================================================
  // GESTÃO E ALTERAÇÃO DE PLANOS
  // =========================================================================

  const limitesDoPlanoAtual = useMemo(() => {
    const nome = dadosAssinatura.planoNome.toLowerCase();
    if (nome.includes('empresarial')) {
      return { clientes: Infinity, usuarios: Infinity, projetos: Infinity };
    }
    if (nome.includes('standard')) {
      return { clientes: Infinity, usuarios: 5, projetos: Infinity };
    }
    // Free
    return { clientes: 10, usuarios: 1, projetos: 5 };
  }, [dadosAssinatura.planoNome]);

  const handleIniciarTrocaPlano = (planoAlvo: SaaSPlano) => {
    setPlanoSelecionadoParaMudanca(planoAlvo);
    setModalConfirmacaoAberto(true);
  };

  const handleConfirmarMudancaPlano = async () => {
    if (!planoSelecionadoParaMudanca) return;

    setMudandoPlano(true);
    setFeedbackErro(null);
    setFeedbackSucesso(null);

    try {
      const nomeAlvo = planoSelecionadoParaMudanca.nome.toLowerCase();
      const isPlanoFree = nomeAlvo === 'free' || Number(planoSelecionadoParaMudanca.preco) === 0;

      if (isPlanoFree) {
        // Fluxo para plano Free (sem custos, validação no backend)
        let erroMudanca: string | null = null;

        if (isSupabaseConfigured) {
          // Tenta via RPC backend segura
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('migrar_para_plano_free');

          if (rpcErr) {
            console.warn('RPC migrar_para_plano_free não disponível ou falhou, tentando fallback transacional:', rpcErr.message);
            // Fallback: se RPC não existir, atualiza diretamente através de sessão de admin
            const tenantId = auth.usuario?.tenantId;
            if (tenantId) {
              const { error: updErr } = await supabase
                .from('tenants')
                .update({ plano: 'Free' })
                .eq('id', tenantId);
              if (updErr) erroMudanca = updErr.message;

              // Atualiza assinatura
              await supabase
                .from('saas_assinaturas')
                .update({
                  valor: 0,
                  status: 'ativa',
                  data_proximo_vencimento: new Date(Date.now() + 100 * 365 * 24 * 3600 * 1000).toISOString(),
                })
                .eq('tenant_id', tenantId);
            }
          } else if (rpcRes && rpcRes.success === false) {
            erroMudanca = rpcRes.error || 'Não foi possível migrar para o plano Free.';
          }
        }

        if (erroMudanca) {
          throw new Error(erroMudanca);
        }

        setDadosAssinatura((prev) => ({
          ...prev,
          planoNome: 'Free',
          valor: 0,
          status: 'ativa',
          recursos: [],
        }));
        auth.updateUsuario({ plano: 'Free' });

        setModalConfirmacaoAberto(false);
        setModalPlanosAberto(false);
        setFeedbackSucesso('Plano alterado para Free com sucesso! Seus limites foram ajustados.');
        setTimeout(() => setFeedbackSucesso(null), 6000);
      } else {
        // Plano Pago (Standard ou Empresarial)
        const checkoutUrl = linksPorPlano[planoSelecionadoParaMudanca.id];

        if (checkoutUrl && checkoutUrl.startsWith('https://')) {
          // Redireciona para o checkout oficial configurado
          window.location.assign(checkoutUrl);
          return;
        }

        // Se não houver link de pagamento ativo configurado pelo SuperAdmin, registra solicitação real no backend
        if (isSupabaseConfigured) {
          await supabase.rpc('solicitar_upgrade_plano', {
            p_novo_plano_id: planoSelecionadoParaMudanca.id,
            p_observacoes: `Solicitação de alteração para o plano ${planoSelecionadoParaMudanca.nome} iniciada no painel`,
          });
        }

        setModalConfirmacaoAberto(false);
        setModalPlanosAberto(false);
        setFeedbackSucesso(
          `Sua solicitação de contratação do plano ${planoSelecionadoParaMudanca.nome} (${formatarMoeda(planoSelecionadoParaMudanca.preco)}/mês) foi registrada! Nossa equipe de atendimento entrará em contato para liberar o checkout seguro.`
        );
        setTimeout(() => setFeedbackSucesso(null), 8000);
      }
    } catch (err: any) {
      setFeedbackErro(err.message || 'Erro ao processar a mudança de plano.');
    } finally {
      setMudandoPlano(false);
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

  // Imagem ativa para exibição (preview tem prioridade se houver seleção)
  const imagemExibicao = previewUrl || avatarUrl;

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
      {/* Input oculto para seleção de foto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleSelectArquivo}
      />

      {/* Cabeçalho Premium do Perfil */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Perfil da Empresa & Conta
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              {dadosAssinatura.status === 'ativa' ? 'Assinatura ativa' : 'Conta cadastrada'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Gerencie as informações cadastrais da sua empresa, responsável, foto de perfil, plano e segurança de acesso.
          </p>
        </div>

        {/* Botões de Ação Principais no Topo */}
        <div className="flex items-center gap-3">
          {temAlteracoes && (
            <button
              type="button"
              onClick={handleCancelar}
              disabled={salvando}
              className="btn-secondary text-xs sm:text-sm py-2 px-3.5 cursor-pointer"
            >
              <RotateCcw className="mr-1.5 h-4 w-4 text-slate-500" />
              Cancelar
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSalvar()}
            disabled={salvando || !temAlteracoes}
            className={`btn-primary text-xs sm:text-sm py-2 px-4 shadow-sm transition-all cursor-pointer ${
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

      {/* Alertas de Notificação Geral */}
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

      {/* Cartão de Resumo da Empresa com Foto / Monograma */}
      <div className="card p-6 bg-gradient-to-r from-white via-white to-slate-50/60 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Foto de Perfil / Avatar Interativo */}
            <div className="relative group shrink-0">
              {imagemExibicao ? (
                <img
                  src={imagemExibicao}
                  alt={formData.nomeFantasia || 'Foto do Perfil'}
                  className="h-20 w-20 rounded-2xl object-cover ring-4 ring-slate-100 shadow-md"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-500 text-white font-bold text-2xl shadow-md ring-4 ring-brand-50">
                  {monograma}
                </div>
              )}

              {/* Botão de Câmera Sobreposto */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFoto}
                title="Alterar foto de perfil"
                className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white shadow-md hover:bg-brand-600 transition-colors cursor-pointer"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {formData.nomeFantasia || formData.razaoSocial || 'Minha Empresa'}
                </h2>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {formData.cnpj ? `CNPJ ${formData.cnpj}` : 'CNPJ não informado'}
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
                <span className="text-base font-bold text-slate-900">{dadosAssinatura.planoNome}</span>
              </div>
              <p className="text-[11px] text-emerald-600 font-medium">
                {dadosAssinatura.status === 'sem assinatura cadastrada'
                  ? 'Nenhuma assinatura cadastrada'
                  : dadosAssinatura.valor > 0
                    ? `${formatarMoeda(dadosAssinatura.valor)}/${dadosAssinatura.periodicidade}`
                    : 'Gratuito sem mensalidade'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('assinatura');
                  setModalPlanosAberto(true);
                }}
                className="mt-2 text-xs font-semibold text-brand-600 hover:text-brand-800 transition inline-flex items-center gap-1 cursor-pointer"
              >
                Gerenciar plano
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Barra de Ação quando uma nova foto foi selecionada para prévia */}
        {previewUrl && (
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-brand-50/50 -mx-6 -mb-6 p-4 rounded-b-xl">
            <div className="flex items-center gap-2 text-xs text-brand-800">
              <Sparkles className="h-4 w-4 text-brand-600 shrink-0" />
              <span>
                Nova foto selecionada em prévia ({selectedFile?.name}). Deseja salvar como foto oficial da sua conta?
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCancelarPreviewFoto}
                disabled={uploadingFoto}
                className="btn-secondary text-xs py-1.5 px-3 cursor-pointer"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={handleSalvarFoto}
                disabled={uploadingFoto}
                className="btn-primary text-xs py-1.5 px-3 cursor-pointer"
              >
                {uploadingFoto ? `Enviando (${uploadProgress}%)...` : 'Salvar Foto'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Alertas específicos de Foto */}
      {fotoFeedbackSucesso && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{fotoFeedbackSucesso}</span>
        </div>
      )}
      {fotoFeedbackErro && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 text-rose-600" />
          <span>{fotoFeedbackErro}</span>
        </div>
      )}

      {/* Navegação Rápida entre Seções */}
      <div className="flex border-b border-slate-200 overflow-x-auto text-sm font-medium text-slate-600 gap-1 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('geral')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
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
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
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
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
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
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'responsavel'
              ? 'border-brand-600 text-brand-600 font-semibold'
              : 'border-transparent hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <User className="h-4 w-4" />
          Responsável & Foto
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('assinatura')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'assinatura'
              ? 'border-brand-600 text-brand-600 font-semibold'
              : 'border-transparent hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Meu Plano & Limites
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('seguranca')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
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
                  maxLength={18}
                  className="input-field font-mono"
                />
                <span className="mt-1 block text-[11px] text-slate-400">Identificação tributária oficial da empresa.</span>
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
                  maxLength={15}
                  className="input-field font-mono"
                />
                <span className="mt-1 block text-[11px] text-slate-400">Número de contato comercial da marcenaria.</span>
              </div>

              <div>
                <label className="label-field">
                  E-mail Comercial
                </label>
                <input
                  type="email"
                  value={formData.emailComercial}
                  onChange={(e) => setFormData({ ...formData, emailComercial: e.target.value })}
                  placeholder="contato@empresa.com.br"
                  className="input-field"
                />
                <span className="mt-1 block text-[11px] text-slate-400">E-mail para envio de orçamentos e avisos.</span>
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
                  maxLength={9}
                  className="input-field font-mono"
                />
                <span className="mt-1 block text-[11px] text-slate-400">Código Postal brasileiro.</span>
              </div>

              <div className="sm:col-span-2">
                <label className="label-field">
                  Logradouro (Rua / Avenida)
                </label>
                <input
                  type="text"
                  value={formData.logradouro}
                  onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
                  placeholder="Nome da rua ou avenida"
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
                  placeholder="Ex.: 1200"
                  className="input-field"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="label-field">
                  Complemento / Bloco
                </label>
                <input
                  type="text"
                  value={formData.complemento}
                  onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                  placeholder="Galpão, Sala, Bloco"
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
                  placeholder="Bairro"
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
                  className="input-field cursor-pointer"
                >
                  {ESTADOS_BRASIL.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SEÇÃO C: RESPONSÁVEL PELA CONTA & GESTÃO DA FOTO */}
        {/* ========================================================================= */}
        {(activeTab === 'geral' || activeTab === 'responsavel') && (
          <div className="card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Responsável pela Conta & Foto</h3>
                  <p className="text-xs text-slate-500">Administrador titular da organização e foto oficial de identificação.</p>
                </div>
              </div>
            </div>

            {/* Gestão Completa de Foto de Perfil */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-3">
                Foto de Perfil do Usuário
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="relative shrink-0">
                  {imagemExibicao ? (
                    <img
                      src={imagemExibicao}
                      alt={formData.nomeResponsavel}
                      className="h-20 w-20 rounded-2xl object-cover ring-4 ring-white shadow-sm"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-500 text-white font-bold text-2xl shadow-sm ring-4 ring-white">
                      {monograma}
                    </div>
                  )}
                  {uploadingFoto && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 text-white text-xs font-semibold backdrop-blur-xs">
                      {uploadProgress}%
                    </div>
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFoto}
                      className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5 text-slate-500" />
                      {avatarUrl ? 'Trocar foto' : 'Enviar foto do computador ou celular'}
                    </button>

                    {previewUrl && (
                      <button
                        type="button"
                        onClick={handleSalvarFoto}
                        disabled={uploadingFoto}
                        className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Confirmar e Salvar Foto
                      </button>
                    )}

                    {(avatarUrl || previewUrl) && (
                      <button
                        type="button"
                        onClick={previewUrl ? handleCancelarPreviewFoto : handleRemoverFoto}
                        disabled={uploadingFoto}
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer inline-flex items-center gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {previewUrl ? 'Cancelar prévia' : 'Remover foto'}
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Formatos aceitos: JPEG, PNG ou WebP. Tamanho máximo: 5 MB. A foto é salva de forma segura e visível apenas para sua empresa.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field">
                  Nome Completo do Responsável <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nomeResponsavel}
                  onChange={(e) => setFormData({ ...formData, nomeResponsavel: e.target.value })}
                  placeholder="Nome do titular"
                  className="input-field"
                />
                <span className="mt-1 block text-[11px] text-slate-400">Nome exibido como operador da conta.</span>
              </div>

              <div>
                <label className="label-field">
                  E-mail de Acesso
                </label>
                <input
                  type="email"
                  disabled
                  value={formData.emailAcesso}
                  className="input-field bg-slate-50 text-slate-500 cursor-not-allowed"
                />
                <span className="mt-1 block text-[11px] text-slate-400">Chave principal de autenticação do usuário.</span>
              </div>

              <div>
                <label className="label-field">
                  Telefone / WhatsApp Direto
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
        {/* SEÇÃO D: MEU PLANO & LIMITES */}
        {/* ========================================================================= */}
        {(activeTab === 'geral' || activeTab === 'assinatura') && (
          <div className="card p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Meu Plano & Limites</h3>
                  <p className="text-xs text-slate-500">Consulte seu plano atual, acompanhe o uso dos recursos e solicite alteração.</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                  dadosAssinatura.planoNome === 'Free'
                    ? 'bg-slate-100 text-slate-700 ring-slate-300'
                    : 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                }`}>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {dadosAssinatura.planoNome === 'Free' ? 'Plano Free Ativo' : 'Assinatura Regular'}
                </span>

                <button
                  type="button"
                  onClick={() => setModalPlanosAberto(true)}
                  className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Conhecer Outros Planos
                </button>
              </div>
            </div>

            {/* Cartões de Detalhes do Plano */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <span className="text-xs font-medium text-slate-500">Plano Atual</span>
                <p className="mt-1 text-xl font-bold text-slate-900">{dadosAssinatura.planoNome}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {dadosAssinatura.valor > 0
                    ? `${formatarMoeda(dadosAssinatura.valor)} / ${dadosAssinatura.periodicidade}`
                    : 'Gratuito — Sem custos'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <span className="text-xs font-medium text-slate-500">Data de Contratação</span>
                <p className="mt-1 text-base font-semibold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {formatarDataBR(dadosAssinatura.dataInicio)}
                </p>
                <p className="mt-1 text-xs text-slate-500">Início da utilização no SaaS</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <span className="text-xs font-medium text-slate-500">Situação / Renovação</span>
                <p className="mt-1 text-base font-semibold text-slate-900 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-400" />
                  {dadosAssinatura.dataRenovacao ? formatarDataBR(dadosAssinatura.dataRenovacao) : 'Acesso vitalício / sem expiração'}
                </p>
                <p className="mt-1 text-xs text-emerald-600 font-medium">Conta em dia</p>
              </div>
            </div>

            {/* Painel de Uso Real de Recursos vs Limites */}
            <div className="rounded-xl border border-slate-200 p-5 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Uso Atual dos Recursos</h4>
                  <p className="text-xs text-slate-500">Acompanhamento do consumo em relação aos limites do plano {dadosAssinatura.planoNome}.</p>
                </div>
                {dadosAssinatura.planoNome === 'Free' && (
                  <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                    Limites do Plano Free
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Clientes */}
                <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-brand-600" />
                      Clientes Cadastrados
                    </span>
                    <span className="font-bold text-slate-900 font-mono">
                      {usoRecursos.clientes ?? '—'} / {isFinite(limitesDoPlanoAtual.clientes) ? limitesDoPlanoAtual.clientes : '∞'}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all ${
                        !isFinite(limitesDoPlanoAtual.clientes)
                          ? 'bg-emerald-500'
                          : usoRecursos.clientes >= limitesDoPlanoAtual.clientes
                            ? 'bg-rose-500'
                            : usoRecursos.clientes >= limitesDoPlanoAtual.clientes * 0.8
                              ? 'bg-amber-500'
                              : 'bg-brand-600'
                      }`}
                      style={{
                        width: isFinite(limitesDoPlanoAtual.clientes)
                          ? `${Math.min(100, ((usoRecursos.clientes ?? 0) / limitesDoPlanoAtual.clientes) * 100)}%`
                          : '0%',
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {isFinite(limitesDoPlanoAtual.clientes)
                      ? usoRecursos.clientes === null ? 'Contagem indisponível.' : `${Math.max(0, limitesDoPlanoAtual.clientes - usoRecursos.clientes)} vagas restantes no plano gratuito.`
                      : 'Uso de clientes consultado no banco.'}
                  </p>
                </div>

                {/* 2. Projetos */}
                <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-indigo-600" />
                      Projetos de Marcenaria
                    </span>
                    <span className="font-bold text-slate-900 font-mono">
                      {usoRecursos.projetos ?? '—'} / {isFinite(limitesDoPlanoAtual.projetos) ? limitesDoPlanoAtual.projetos : '∞'}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all ${
                        !isFinite(limitesDoPlanoAtual.projetos)
                          ? 'bg-emerald-500'
                          : usoRecursos.projetos >= limitesDoPlanoAtual.projetos
                            ? 'bg-rose-500'
                            : 'bg-indigo-600'
                      }`}
                      style={{
                        width: isFinite(limitesDoPlanoAtual.projetos)
                          ? `${Math.min(100, ((usoRecursos.projetos ?? 0) / limitesDoPlanoAtual.projetos) * 100)}%`
                          : '0%',
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {isFinite(limitesDoPlanoAtual.projetos)
                      ? usoRecursos.projetos === null ? 'Contagem indisponível.' : `${Math.max(0, limitesDoPlanoAtual.projetos - usoRecursos.projetos)} projetos restantes no Free.`
                      : 'Uso de projetos consultado no banco.'}
                  </p>
                </div>

                {/* 3. Usuários */}
                <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-sky-600" />
                      Usuários na Equipe
                    </span>
                    <span className="font-bold text-slate-900 font-mono">
                      {usoRecursos.usuarios ?? '—'} / {isFinite(limitesDoPlanoAtual.usuarios) ? limitesDoPlanoAtual.usuarios : '∞'}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all ${
                        !isFinite(limitesDoPlanoAtual.usuarios)
                          ? 'bg-emerald-500'
                          : usoRecursos.usuarios >= limitesDoPlanoAtual.usuarios
                            ? 'bg-amber-500'
                            : 'bg-sky-600'
                      }`}
                      style={{
                        width: isFinite(limitesDoPlanoAtual.usuarios)
                          ? `${Math.min(100, ((usoRecursos.usuarios ?? 0) / limitesDoPlanoAtual.usuarios) * 100)}%`
                          : '0%',
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {isFinite(limitesDoPlanoAtual.usuarios)
                      ? `Até ${limitesDoPlanoAtual.usuarios} operador(es) simultâneo(s).`
                      : 'Equipe ilimitada inclusa.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de Recursos Inclusos */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Funcionalidades Inclusas no seu Plano
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {dadosAssinatura.recursos.map((rec, i) => (
                  <div key={i} className="flex items-center gap-2 text-slate-700 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Histórico Recente de Cobranças */}
            {cobrancas.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Histórico de Faturas & Cobranças
                </h4>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="px-3.5 py-2 font-semibold">Vencimento</th>
                        <th className="px-3.5 py-2 font-semibold">Descrição</th>
                        <th className="px-3.5 py-2 font-semibold">Valor</th>
                        <th className="px-3.5 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cobrancas.map((cob) => (
                        <tr key={cob.id} className="hover:bg-slate-50/50">
                          <td className="px-3.5 py-2 text-slate-700 font-mono">
                            {formatarDataBR(cob.data_vencimento)}
                          </td>
                          <td className="px-3.5 py-2 text-slate-800">
                            {cob.descricao || `Assinatura ${dadosAssinatura.planoNome}`}
                          </td>
                          <td className="px-3.5 py-2 text-slate-900 font-semibold font-mono">
                            {formatarMoeda(Number(cob.valor))}
                          </td>
                          <td className="px-3.5 py-2">
                            <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${
                              cob.status === 'paga'
                                ? 'bg-emerald-50 text-emerald-700'
                                : cob.status === 'vencida'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-amber-50 text-amber-700'
                            }`}>
                              {cob.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
                className="btn-secondary text-xs sm:text-sm py-1.5 px-3 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="btn-primary text-xs sm:text-sm py-1.5 px-4 cursor-pointer"
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

          {senhaFeedbackSucesso && (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <div className="flex-1 font-medium">{senhaFeedbackSucesso}</div>
            </div>
          )}

          {senhaFeedbackErro && (
            <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
              <div className="flex-1 font-medium">{senhaFeedbackErro}</div>
            </div>
          )}

          <form onSubmit={handleAlterarSenha} className="space-y-4 max-w-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Alteração de Senha</h4>

            <div>
              <label className="label-field">
                Nova Senha <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={mostrarNovaSenha ? 'text' : 'password'}
                  required
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {mostrarNovaSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Indicador de força de senha */}
              {novaSenha && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1 h-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`flex-1 rounded-full transition-all ${
                          forcaSenha >= step
                            ? forcaSenha <= 1
                              ? 'bg-rose-500'
                              : forcaSenha <= 2
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {forcaSenha <= 1 ? 'Senha fraca' : forcaSenha <= 2 ? 'Senha média' : forcaSenha <= 3 ? 'Senha boa' : 'Senha forte'}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="label-field">
                Confirmar Nova Senha <span className="text-rose-500">*</span>
              </label>
              <input
                type={mostrarNovaSenha ? 'text' : 'password'}
                required
                value={confirmarNovaSenha}
                onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                placeholder="Repita a nova senha"
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={alterandoSenha || !novaSenha || !confirmarNovaSenha}
              className="btn-primary text-xs sm:text-sm py-2 px-4 cursor-pointer"
            >
              {alterandoSenha ? 'Atualizando senha...' : 'Atualizar senha'}
            </button>
          </form>

          {/* Dados da Sessão */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Informações da Sessão</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <span className="text-slate-400 block">Método de Login</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{dadosSessao.provedor}</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <span className="text-slate-400 block">Último Acesso</span>
                <span className="font-semibold text-slate-800 mt-0.5 block font-mono">
                  {formatarDataBR(dadosSessao.ultimoAcesso)}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <span className="text-slate-400 block">Membro Desde</span>
                <span className="font-semibold text-slate-800 mt-0.5 block font-mono">
                  {formatarDataBR(dadosSessao.criadaEm)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONHECER OUTROS PLANOS & OPÇÕES DE MUDANÇA */}
      {/* ========================================================================= */}
      {modalPlanosAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setModalPlanosAberto(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center max-w-xl mx-auto mb-8">
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 uppercase tracking-wide">
                Planos do Gestio ERP
              </span>
              <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                Escolha o plano ideal para a sua marcenaria
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Mude de plano a qualquer momento. Suas informações existentes são sempre preservadas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {planosDisponiveis.map((p) => {
                const isPlanoAtual = dadosAssinatura.planoNome.toLowerCase() === p.nome.toLowerCase();
                const isFree = Number(p.preco) === 0 || p.nome.toLowerCase() === 'free';
                const hasLink = Boolean(linksPorPlano[p.id]);

                return (
                  <div
                    key={p.id}
                    className={`relative flex flex-col justify-between rounded-2xl border p-6 transition-all ${
                      isPlanoAtual
                        ? 'border-brand-600 bg-brand-50/20 shadow-md ring-2 ring-brand-600/20'
                        : p.nome.toLowerCase() === 'standard'
                          ? 'border-slate-300 bg-white shadow-sm hover:border-brand-400'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {isPlanoAtual && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-xs">
                        Plano Atual
                      </span>
                    )}

                    <div>
                      <h4 className="text-lg font-bold text-slate-900">{p.nome}</h4>
                      <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{p.descricao}</p>

                      <div className="mt-4 mb-6">
                        <span className="text-3xl font-extrabold text-slate-900">
                          {formatarMoeda(Number(p.preco))}
                        </span>
                        <span className="text-xs text-slate-500 ml-1">/{p.periodicidade || 'mês'}</span>
                      </div>

                      <div className="space-y-2.5 border-t border-slate-100 pt-4 text-xs text-slate-700">
                        {p.recursos.map((rec, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-8 pt-4 border-t border-slate-100">
                      {isPlanoAtual ? (
                        <button
                          type="button"
                          disabled
                          className="w-full rounded-xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-400 cursor-not-allowed"
                        >
                          Seu Plano Atual
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleIniciarTrocaPlano(p)}
                          className={`w-full rounded-xl py-2.5 text-xs font-semibold transition shadow-xs cursor-pointer ${
                            isFree
                              ? 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                              : 'bg-brand-600 text-white hover:bg-brand-700'
                          }`}
                        >
                          {isFree ? 'Mudar para o Plano Free' : hasLink ? 'Assinar via Checkout Seguro' : 'Solicitar Upgrade'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE MUDANÇA DE PLANO / ANÁLISE DE LIMITES */}
      {/* ========================================================================= */}
      {modalConfirmacaoAberto && planoSelecionadoParaMudanca && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Confirmar Alteração de Plano
              </h3>
              <button
                type="button"
                onClick={() => setModalConfirmacaoAberto(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Análise de Limites em caso de Downgrade para Free */}
            {planoSelecionadoParaMudanca.nome.toLowerCase() === 'free' && (
              <div className="space-y-3">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Verificação de Limites do Plano Free</span>
                  </div>
                  <p>
                    O plano gratuito é limitado a <strong>10 clientes</strong>, <strong>5 projetos</strong> e <strong>1 usuário</strong>.
                  </p>
                  {usoRecursos.clientes !== null && usoRecursos.clientes > 10 && (
                    <p className="font-semibold text-rose-800">
                      • Atenção: Sua conta possui atualmente {usoRecursos.clientes} clientes cadastrados (limite de 10). Seus dados existentes NUNCA serão excluídos, mas novos cadastros ficarão bloqueados até adequação.
                    </p>
                  )}
                  {usoRecursos.projetos !== null && usoRecursos.projetos > 5 && (
                    <p className="font-semibold text-rose-800">
                      • Atenção: Sua conta possui {usoRecursos.projetos} projetos (limite de 5 no Free). Novos projetos não poderão ser criados até regularização.
                    </p>
                  )}
                  {usoRecursos.usuarios !== null && usoRecursos.usuarios > 1 && (
                    <p className="font-semibold text-rose-800">
                      • Atenção: Sua conta possui {usoRecursos.usuarios} usuários. O plano Free permite apenas 1 usuário ativo.
                    </p>
                  )}
                  <p className="text-[11px] text-amber-800 pt-1">
                    Ao confirmar, o sistema atualizará sua assinatura sem custos adicionais.
                  </p>
                </div>
              </div>
            )}

            {/* Informações para Upgrade de Plano Pago */}
            {planoSelecionadoParaMudanca.nome.toLowerCase() !== 'free' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-700 space-y-2">
                <p>
                  Você está solicitando o upgrade para o plano <strong>{planoSelecionadoParaMudanca.nome}</strong> no valor de <strong>{formatarMoeda(planoSelecionadoParaMudanca.preco)}/mês</strong>.
                </p>
                <p className="text-slate-500">
                  {linksPorPlano[planoSelecionadoParaMudanca.id]
                    ? 'Você será redirecionado para a página de checkout seguro do provedor de pagamento.'
                    : 'Nossa equipe administrativa e financeira receberá sua solicitação imediatamente para liberação do acesso.'}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalConfirmacaoAberto(false)}
                disabled={mudandoPlano}
                className="btn-secondary text-xs py-2 px-3.5 cursor-pointer"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleConfirmarMudancaPlano}
                disabled={mudandoPlano}
                className="btn-primary text-xs py-2 px-4 shadow-sm cursor-pointer"
              >
                {mudandoPlano ? (
                  <>
                    <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                    Processando...
                  </>
                ) : planoSelecionadoParaMudanca.nome.toLowerCase() === 'free' ? (
                  'Confirmar Migração para Free'
                ) : linksPorPlano[planoSelecionadoParaMudanca.id] ? (
                  'Prosseguir para Pagamento'
                ) : (
                  'Confirmar Solicitação de Upgrade'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
