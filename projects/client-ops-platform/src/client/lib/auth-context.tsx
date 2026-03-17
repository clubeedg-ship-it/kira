import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type AuthState = {
  userId: string | null;
  orgId: string | null;
};

type AuthContextValue = AuthState & {
  login: (userId: string, orgId: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => ({
    userId: localStorage.getItem('userId'),
    orgId: localStorage.getItem('orgId'),
  }));

  const login = useCallback((userId: string, orgId: string) => {
    localStorage.setItem('userId', userId);
    localStorage.setItem('orgId', orgId);
    setAuth({ userId, orgId });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('userId');
    localStorage.removeItem('orgId');
    setAuth({ userId: null, orgId: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, isAuthenticated: !!auth.userId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
