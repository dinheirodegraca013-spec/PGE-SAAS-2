import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ApiResult, UsuarioAutenticado } from '@/types/api';
import { INITIAL_USER } from '@/services/api/mockData';

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
  isLiveSupabase: boolean;
  login: (email: string, senha: string) => Promise<ApiResult<void>>;
  register: (payload: RegisterPayload) => Promise<ApiResult<void>>;
  recuperarSenha: (email: string) => Promise<ApiResult<void>>;
  logout: () => Promise<void>;
  loginAsDemo: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function mapPlanoNome(planoNum: number | string): string {
  if (planoNum === 2 || planoNum === '2' || planoNum === 'Empresarial') return 'Empresarial';
  if (planoNum === 0 || planoNum === '0' || planoNum === 'Free') return 'Free';
  return 'Standard';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null);
  const [isLiveSupabase] = useState<boolean>(isSupabaseConfigured);

  useEffect(() => {
    if (isSupabaseConfigured) {
      // 1. Busca sessão inicial do Supabase Auth
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          applySupabaseSession(session);
        } else {
          // Tenta restaurar do cache local se houver
          restoreFromLocalStorage();
        }
      });

      // 2. Escuta mudanças de autenticação em tempo real
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          applySupabaseSession(session);
        } else {
          clearAuthState();
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      restoreFromLocalStorage();
    }
  }, []);

  const applySupabaseSession = (session: any) => {
    const user = session.user;
    const meta = user.user_metadata || {};

    const authUser: UsuarioAutenticado = {
      usuarioId: user.id,
      tenantId: meta.organization_id || meta.tenant_id || user.id,
      nomeCompleto: meta.nome_completo || meta.full_name || user.email?.split('@')[0] || 'Usuário',
      email: user.email || '',
      papel: meta.papel || 'AdministradorTenant',
      plano: mapPlanoNome(meta.plano),
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
  };

  const restoreFromLocalStorage = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setAccessToken(parsed.accessToken);
        setRefreshToken(parsed.refreshToken);
        setUsuario(parsed.usuario);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    } else if (!isSupabaseConfigured) {
      // Modo demonstração quando não houver Supabase configurado
      const defaultState = {
        accessToken: 'demo-jwt-token-access',
        refreshToken: 'demo-refresh-token',
        usuario: INITIAL_USER,
      };
      setAccessToken(defaultState.accessToken);
      setRefreshToken(defaultState.refreshToken);
      setUsuario(defaultState.usuario);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
    }
  };

  const clearAuthState = () => {
    setAccessToken(null);
    setRefreshToken(null);
    setUsuario(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const login = async (email: string, senha: string): Promise<ApiResult<void>> => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: senha,
        });

        if (error) {
          return { succeeded: false, errors: [error.message || 'Credenciais inválidas.'] };
        }

        if (data.session) {
          applySupabaseSession(data.session);
          return { succeeded: true, errors: [] };
        }

        return { succeeded: false, errors: ['Não foi possível iniciar a sessão.'] };
      } catch (err: any) {
        return { succeeded: false, errors: [err.message || 'Erro ao conectar ao Supabase Auth.'] };
      }
    }

    // Fallback de demonstração offline
    const demoUser: UsuarioAutenticado = {
      usuarioId: 'usr-' + Date.now(),
      tenantId: 'tnt-01',
      nomeCompleto: email.split('@')[0].toUpperCase(),
      email: email,
      papel: 'AdministradorTenant',
      plano: 'Standard',
    };
    const token = 'jwt-token-' + Date.now();
    setAccessToken(token);
    setRefreshToken('refresh-token');
    setUsuario(demoUser);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        accessToken: token,
        refreshToken: 'refresh-token',
        usuario: demoUser,
      }),
    );
    return { succeeded: true, errors: [] };
  };

  const register = async (payload: RegisterPayload): Promise<ApiResult<void>> => {
    const planoNome = mapPlanoNome(payload.plano);

    if (isSupabaseConfigured) {
      try {
        // Gera um ID de organização único para o novo tenant
        const orgId = 'org_' + Math.random().toString(36).substring(2, 10);

        const { data, error } = await supabase.auth.signUp({
          email: payload.email.trim(),
          password: payload.senha,
          options: {
            data: {
              nome_completo: payload.nomeCompleto.trim(),
              razao_social: payload.razaoSocial.trim(),
              nome_fantasia: payload.nomeFantasia?.trim() || null,
              organization_id: orgId,
              tenant_id: orgId,
              plano: planoNome,
              papel: 'AdministradorTenant',
            },
          },
        });

        if (error) {
          return { succeeded: false, errors: [error.message || 'Falha ao registrar usuário.'] };
        }

        // Se a confirmação por e-mail estiver desativada no Supabase, a sessão já vem preenchida
        if (data.session) {
          applySupabaseSession(data.session);
          return { succeeded: true, errors: [] };
        }

        // Se exigir confirmação de e-mail
        if (data.user && !data.session) {
          return {
            succeeded: true,
            errors: [],
          };
        }

        return { succeeded: true, errors: [] };
      } catch (err: any) {
        return { succeeded: false, errors: [err.message || 'Erro ao comunicar com Supabase.'] };
      }
    }

    // Fallback de demonstração
    const demoUser: UsuarioAutenticado = {
      usuarioId: 'usr-' + Date.now(),
      tenantId: 'org_' + Date.now(),
      nomeCompleto: payload.nomeCompleto,
      email: payload.email,
      papel: 'AdministradorTenant',
      plano: planoNome,
    };
    const token = 'jwt-token-' + Date.now();
    setAccessToken(token);
    setRefreshToken('refresh-token');
    setUsuario(demoUser);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        accessToken: token,
        refreshToken: 'refresh-token',
        usuario: demoUser,
      }),
    );
    return { succeeded: true, errors: [] };
  };

  const recuperarSenha = async (email: string): Promise<ApiResult<void>> => {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/login`,
        });
        if (error) {
          return { succeeded: false, errors: [error.message] };
        }
        return { succeeded: true, errors: [] };
      } catch (err: any) {
        return { succeeded: false, errors: [err.message] };
      }
    }
    return { succeeded: true, errors: [] };
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Continua para limpar o estado local
      }
    }
    clearAuthState();
  };

  const loginAsDemo = () => {
    const demoUser = INITIAL_USER;
    const token = 'demo-jwt-token-access';
    setAccessToken(token);
    setRefreshToken('demo-refresh-token');
    setUsuario(demoUser);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        accessToken: token,
        refreshToken: 'demo-refresh-token',
        usuario: demoUser,
      }),
    );
  };

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        refreshToken,
        usuario,
        isAuthenticated: !!accessToken,
        isLiveSupabase,
        login,
        register,
        recuperarSenha,
        logout,
        loginAsDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthStore() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthStore must be used within an AuthProvider');
  }
  return context;
}
