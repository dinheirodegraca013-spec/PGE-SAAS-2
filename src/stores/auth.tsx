import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '@/services/api/client';
import type { ApiResult, UsuarioAutenticado } from '@/types/api';
import { INITIAL_USER } from '@/services/api/mockData';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiraEmUtc: string;
  usuario: UsuarioAutenticado;
}

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
  login: (email: string, senha: string) => Promise<ApiResult<void>>;
  register: (payload: RegisterPayload) => Promise<ApiResult<void>>;
  logout: () => void;
  loginAsDemo: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null);

  useEffect(() => {
    // Restore from localStorage
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
    } else {
      // Default to initial demo user if fresh
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
  }, []);

  const persistToStorage = (token: string, refresh: string, user: UsuarioAutenticado) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        accessToken: token,
        refreshToken: refresh,
        usuario: user,
      }),
    );
  };

  const login = async (email: string, senha: string): Promise<ApiResult<void>> => {
    try {
      const response = await apiClient.post<ApiResult<LoginResponse>>('/auth/login', {
        email,
        senha,
      });

      if (!response.data.succeeded || !response.data.value) {
        return { succeeded: false, errors: response.data.errors || ['E-mail ou senha inválidos.'] };
      }

      const { accessToken: token, refreshToken: refresh, usuario: user } = response.data.value;
      setAccessToken(token);
      setRefreshToken(refresh);
      setUsuario(user);
      persistToStorage(token, refresh, user);
      return { succeeded: true, errors: [] };
    } catch {
      return { succeeded: false, errors: ['Não foi possível conectar ao servidor. Tente novamente.'] };
    }
  };

  const register = async (payload: RegisterPayload): Promise<ApiResult<void>> => {
    try {
      const response = await apiClient.post<ApiResult<LoginResponse>>('/auth/register', payload);

      if (!response.data.succeeded || !response.data.value) {
        return { succeeded: false, errors: response.data.errors || ['Não foi possível criar a conta.'] };
      }

      const { accessToken: token, refreshToken: refresh, usuario: user } = response.data.value;
      setAccessToken(token);
      setRefreshToken(refresh);
      setUsuario(user);
      persistToStorage(token, refresh, user);
      return { succeeded: true, errors: [] };
    } catch {
      return { succeeded: false, errors: ['Não foi possível conectar ao servidor. Tente novamente.'] };
    }
  };

  const logout = () => {
    setAccessToken(null);
    setRefreshToken(null);
    setUsuario(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const loginAsDemo = () => {
    setAccessToken('demo-jwt-token-access');
    setRefreshToken('demo-refresh-token');
    setUsuario(INITIAL_USER);
    persistToStorage('demo-jwt-token-access', 'demo-refresh-token', INITIAL_USER);
  };

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        refreshToken,
        usuario,
        isAuthenticated: !!accessToken,
        login,
        register,
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
