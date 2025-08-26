/**
 * Auth Provider Component
 * 
 * Optional context provider for auth state.
 * Useful for providing auth context to entire app.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './useAuth';
import type { UseAuthReturn, AuthHookConfig } from './types';

const AuthContext = createContext<UseAuthReturn | null>(null);

interface AuthProviderProps extends AuthHookConfig {
  children: ReactNode;
}

export function AuthProvider({ children, ...config }: AuthProviderProps) {
  const auth = useAuth(config);
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): UseAuthReturn {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  
  return context;
}