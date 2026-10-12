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
}

const STORAGE_KEY = 'erp-saas:auth';

interface AuthContextType {
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
}

const AuthContext = createContext<AuthContextType | null>(null);

function mapPlanoNome(planoNum: number | string | undefined): string {
  if (planoNum === 2 || planoNum === '2' || planoNum === 'Empresarial') return 'Empresarial';
  if (planoNum === 0 || planoNum === '0' || planoNum === 'Free') return 'Free';
  return 'Standard';
}

/**
 * Consulta a tabela real 'profiles' e o relacionamento com 'tenants' no Supabase.
 */
async function fetchUserProfile(userId: string): Promise<{ profile: any; isActive: boolean }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, tenants(*)')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Aviso: Consulta a profiles retornou erro ou tabela com RLS restrito:', error.message);
      return { profile: null, isActive: true };
    }

    if (data) {
      const isActive =
        data.is_active !== false &&
        data.ativo !== false &&
        data.status !== 'inativo' &&
        data.status !== 'inactive';
      return { profile: data, isActive };
    }
  } catch (err) {
    console.warn('Exceção ao consultar tabela profiles:', err);
  }
  return { profile: null, isActive: true };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLiveSupabase] = useState<boolean>(isSupabaseConfigured);

  const applySession = async (session: any): Promise<boolean> => {
    const user = session.user;
    const meta = user.user_metadata || {};

    // 1. Busca perfil real na tabela 'profiles'
    const { profile, isActive } = await fetchUserProfile(user.id);

    if (!isActive) {
      await supabase.auth.signOut();
      clearAuthState();
      return false;
    }

    // 2. Extrai dados reais com prioridade para a tabela 'profiles' e 'tenants'
    const tenantId =
      profile?.tenant_id ||
      profile?.tenants?.id ||
      meta.tenant_id ||
      meta.organization_id ||
      user.id;

    const nomeCompleto =
      profile?.nome ||
      profile?.full_name ||
      profile?.nome_completo ||
      meta.nome_completo ||
      meta.full_name ||
      user.email?.split('@')[0] ||
      'Usuário';

    const papel =
      profile?.papel ||
      profile?.role ||
      meta.papel ||
      'Usuario';

    const plano = mapPlanoNome(
      profile?.tenants?.plano ||
      profile?.plano ||
      meta.plano
    );

    const authUser: UsuarioAutenticado = {
      usuarioId: user.id,
      tenantId,
      nomeCompleto,
      email: user.email || '',
      papel,
      plano,
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
            const ok = await applySession(session);
            if (!ok) {
              console.warn('Usuário inativo ou sessão inválida.');
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
            await applySession(session);
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

    const planoNome = mapPlanoNome(payload.plano);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: payload.email.trim(),
        password: payload.senha,
        options: {
          data: {
            nome_completo: payload.nomeCompleto.trim(),
            razao_social: payload.razaoSocial.trim(),
            nome_fantasia: payload.nomeFantasia?.trim() || null,
            plano: planoNome,
          },
        },
      });

      if (error) {
        return { succeeded: false, errors: [error.message || 'Erro ao realizar cadastro no Supabase.'] };
      }

      // Se a confirmação de e-mail estiver desabilitada, a sessão já existe
      if (data.session) {
        await applySession(data.session);
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
        redirectTo: `${window.location.origin}/login`,
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
