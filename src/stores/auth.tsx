import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ApiResult, UsuarioAutenticado } from '@/types/api';

export interface RegisterPayload {
  razaoSocial: string;
  nomeFantasia?: string;
  nomeCompleto: string;
  email: string;
  senha: string;
  plano: number;
  planoSolicitadoId?: string;
}

const STORAGE_KEY = 'erp-saas:auth';

interface AuthContextType {
  isSuperAdmin: boolean;
  isSaaSFinanceiro: boolean;
  isSaaSInterno: boolean;
  isSaaSConsulta: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  usuario: UsuarioAutenticado | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLiveSupabase: boolean;
  login: (email: string, senha: string) => Promise<ApiResult<void>>;
  register: (payload: RegisterPayload) => Promise<ApiResult<{ confirmationRequired?: boolean }>>;
  recuperarSenha: (email: string) => Promise<ApiResult<void>>;
  logout: () => Promise<void>;
  updateUsuario: (dados: Partial<UsuarioAutenticado>) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function mapPlanoNome(planoNum: number | string | undefined): string {
  const normalized = String(planoNum ?? '').trim().toLowerCase();
  if (normalized === '2' || normalized === 'empresarial' || normalized === 'premium' || normalized === 'premium/plus') return 'Premium/Plus';
  if (normalized === '0' || normalized === 'free' || normalized === 'basico' || normalized === 'básico') return 'Básico';
  if (normalized === 'standard' || normalized === '1' || normalized === 'profissional') return 'Profissional';
  return 'Não informado';
}

/**
 * Consulta a tabela real 'profiles' e o relacionamento com 'tenants' no Supabase.
 */
async function fetchUserProfile(userId: string): Promise<{ profile: any; isActive: boolean; internalRole: 'SuperAdmin' | 'SaaSFinanceiro' | 'SaaSConsulta' | null }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, tenant_id, nome_completo, email, papel, ativo, tenants(id, plano, ativo)')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Não foi possível validar o perfil no Supabase:', error.message);
      return { profile: null, isActive: false, internalRole: null };
    }

    if (!data) {
      console.error('Conta autenticada sem perfil associado. Acesso bloqueado.');
      return { profile: null, isActive: false, internalRole: null };
    }

    const { data: internalAccess, error: internalAccessError } = await supabase
      .from('saas_usuarios_internos')
      .select('papel, ativo')
      .eq('user_id', userId)
      .maybeSingle();

    if (internalAccessError) {
      console.warn('Acesso interno do SaaS não disponível para esta conta:', internalAccessError.message);
    }
    const internalRole = internalAccess?.ativo === true
      ? (internalAccess.papel as 'SuperAdmin' | 'SaaSFinanceiro' | 'SaaSConsulta')
      : null;

    const tenantRecord = Array.isArray(data.tenants) ? data.tenants[0] : data.tenants;
    const isActive = data.ativo === true && Boolean(data.tenant_id) &&
      Boolean(data.papel) && tenantRecord?.ativo !== false;
    return { profile: { ...data, tenants: tenantRecord }, isActive, internalRole };
  } catch (err) {
    console.error('Exceção ao validar perfil no Supabase:', err);
    return { profile: null, isActive: false, internalRole: null };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLiveSupabase] = useState<boolean>(isSupabaseConfigured);

  const applySession = async (session: any): Promise<boolean> => {
    const user = session.user;
    // O perfil e o tenant são carregados exclusivamente do banco.
    // 1. Busca perfil real na tabela 'profiles'
    const { profile, isActive, internalRole } = await fetchUserProfile(user.id);

    if (!isActive || !profile?.tenant_id || !profile?.papel) {
      await supabase.auth.signOut();
      clearAuthState();
      return false;
    }

    // Perfil e tenant vêm exclusivamente do banco, nunca de metadados editáveis pelo usuário.
    const tenantId = profile.tenant_id;
    const nomeCompleto = profile.nome_completo || user.email?.split('@')[0] || 'Usuário';
    const papel = profile.papel;

    const plano = mapPlanoNome(profile?.tenants?.plano);

    const authUser: UsuarioAutenticado = {
      usuarioId: user.id,
      tenantId,
      nomeCompleto,
      email: user.email || '',
      papel,
      plano,
      avatarUrl: profile.avatar_url || null,
      logoUrl: null,
      papelInterno: internalRole,
    };

    setAccessToken(session.access_token);
    setRefreshToken(session.refresh_token || null);
    setUsuario(authUser);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        usuario: authUser,
      }),
    );

    return true;
  };

  const updateUsuario = (dados: Partial<UsuarioAutenticado>) => {
    setUsuario((prev) => {
      if (!prev) return null;
      const atualizado = { ...prev, ...dados };
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.usuario = atualizado;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
      } catch (e) {
        console.warn('Erro ao sincronizar localStorage auth:', e);
      }
      return atualizado;
    });
  };

  const refreshProfile = async () => {
    if (!usuario?.usuarioId || !isSupabaseConfigured) return;
    try {
      const { profile, isActive, internalRole } = await fetchUserProfile(usuario.usuarioId);
      if (isActive && profile) {
        const plano = mapPlanoNome(profile?.tenants?.plano);
        const atualizado: UsuarioAutenticado = {
          ...usuario,
          nomeCompleto: profile.nome_completo || usuario.nomeCompleto,
          plano,
          avatarUrl: profile.avatar_url || null,
          logoUrl: null,
          papelInterno: internalRole,
        };
        setUsuario(atualizado);
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.usuario = atualizado;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
      }
    } catch (e) {
      console.warn('Erro ao atualizar dados do perfil:', e);
    }
  };

  const clearAuthState = () => {
    setAccessToken(null);
    setRefreshToken(null);
    setUsuario(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      setIsLoading(true);

      if (isSupabaseConfigured) {
        try {
          // Obtém a sessão atual diretamente do Supabase Auth
          const { data: { session }, error } = await supabase.auth.getSession();

          if (error) {
            console.error('Erro ao verificar sessão Supabase:', error.message);
            clearAuthState();
          } else if (session?.user && mounted) {
            // A tela de recuperação não deve exigir perfil/tenant nem encerrar a sessão
            // antes que o usuário consiga atualizar a própria senha.
            if (window.location.pathname === '/redefinir-senha') {
              setAccessToken(session.access_token);
              setRefreshToken(session.refresh_token || null);
            } else {
              const ok = await applySession(session);
              if (!ok) {
                console.warn('Usuário inativo ou sessão inválida.');
              }
            }
          } else {
            clearAuthState();
          }
        } catch (err) {
          console.error('Falha ao restaurar sessão Supabase:', err);
          clearAuthState();
        }
      } else {
        // Se Supabase não estiver configurado no ambiente, não autentica ficticiamente
        clearAuthState();
      }

      if (mounted) {
        setIsLoading(false);
      }
    }

    initAuth();

    // Listener de eventos do Supabase Auth (Login, Logout, Renovação de Token)
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;

    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session?.user) {
            if (window.location.pathname === '/redefinir-senha') {
              setAccessToken(session.access_token);
              setRefreshToken(session.refresh_token || null);
            } else {
              await applySession(session);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          clearAuthState();
        }
      });
      authListener = data;
    }

    return () => {
      mounted = false;
      if (authListener) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const login = async (email: string, senha: string): Promise<ApiResult<void>> => {
    if (!isSupabaseConfigured) {
      return {
        succeeded: false,
        errors: ['Configuração do Supabase ausente. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'],
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });

      if (error) {
        return {
          succeeded: false,
          errors: [error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message],
        };
      }

      if (data.session) {
        const ok = await applySession(data.session);
        if (!ok) {
          return {
            succeeded: false,
            errors: ['Sua conta está inativa. Entre em contato com o suporte ou administrador.'],
          };
        }
        return { succeeded: true, errors: [] };
      }

      return { succeeded: false, errors: ['Não foi possível autenticar o usuário.'] };
    } catch (err: any) {
      return { succeeded: false, errors: [err.message || 'Erro inesperado ao conectar ao Supabase Auth.'] };
    }
  };

  const register = async (payload: RegisterPayload): Promise<ApiResult<{ confirmationRequired?: boolean }>> => {
    if (!isSupabaseConfigured) {
      return {
        succeeded: false,
        errors: ['Configuração do Supabase ausente no servidor.'],
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: payload.email.trim(),
        password: payload.senha,
        options: {
          // Após confirmar o e-mail, retornar ao domínio exato onde o cadastro foi iniciado.
          emailRedirectTo: `${window.location.origin}/login?confirmacao=sucesso`,
          data: {
            nome_completo: payload.nomeCompleto.trim(),
            razao_social: payload.razaoSocial.trim(),
            nome_fantasia: payload.nomeFantasia?.trim() || null,
            // O campo tenants.plano aceita apenas free, standard ou empresarial.
            // O plano comercial escolhido fica separado em plano_solicitado_id até a ativação.
            plano: 'free',
            plano_solicitado_id: payload.planoSolicitadoId || null,
          },
        },
      });

      if (error) {
        return { succeeded: false, errors: [error.message || 'Erro ao realizar cadastro no Supabase.'] };
      }

      // Contas de planos pagos ficam pendentes e sem acesso até a ativação manual pelo Super Admin.
      if (data.session && Number(payload.plano) !== 0) {
        await supabase.auth.signOut();
        clearAuthState();
        return { succeeded: true, value: { confirmationRequired: false }, errors: [] };
      }

      // Se a confirmação de e-mail estiver desabilitada, a sessão já existe
      if (data.session) {
        const profileApplied = await applySession(data.session);
        if (!profileApplied) {
          return {
            succeeded: false,
            errors: ['O cadastro foi criado, mas o perfil/empresa ainda não pôde ser validado. Entre em contato com o suporte.'],
          };
        }
        return { succeeded: true, value: { confirmationRequired: false }, errors: [] };
      }

      // Se exigir confirmação de e-mail
      if (data.user && !data.session) {
        return {
          succeeded: true,
          value: { confirmationRequired: true },
          errors: [],
        };
      }

      return { succeeded: true, errors: [] };
    } catch (err: any) {
      return { succeeded: false, errors: [err.message || 'Falha ao processar cadastro no Supabase.'] };
    }
  };

  const recuperarSenha = async (email: string): Promise<ApiResult<void>> => {
    if (!isSupabaseConfigured) {
      return {
        succeeded: false,
        errors: ['Supabase não configurado.'],
      };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });

      if (error) {
        return { succeeded: false, errors: [error.message || 'Erro ao enviar e-mail de recuperação.'] };
      }

      return { succeeded: true, errors: [] };
    } catch (err: any) {
      return { succeeded: false, errors: [err.message || 'Falha na recuperação de senha.'] };
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Erro ao efetuar signOut no Supabase:', err);
      }
    }
    clearAuthState();
  };

  return (
    <AuthContext.Provider
      value={{
        isSuperAdmin: usuario?.papelInterno === 'SuperAdmin',
        isSaaSFinanceiro: usuario?.papelInterno === 'SuperAdmin' || usuario?.papelInterno === 'SaaSFinanceiro',
        isSaaSInterno: Boolean(usuario?.papelInterno),
        isSaaSConsulta: usuario?.papelInterno === 'SaaSConsulta',
        accessToken,
        refreshToken,
        usuario,
        isAuthenticated: !!accessToken && !!usuario,
        isLoading,
        isLiveSupabase,
        login,
        register,
        recuperarSenha,
        logout,
        updateUsuario,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthStore() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthStore deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
