Warning: truncated output (original token count: 4362)
Total output lines: 486

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ApiResult, UsuarioAutenticado } from '@/…4262 tokens truncated…nction useAuthStore() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthStore deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}

