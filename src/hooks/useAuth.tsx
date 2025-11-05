import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  fullName: string;
  profile?: {
    avatarUrl?: string;
    xp: number;
    level: number;
    streak: number;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      try {
        const session = api.auth.getSession();
        if (session.token && session.user) {
          console.log('[AUTH] Checking existing session for user:', session.user.email);
          // Verify token is still valid by fetching current user from server
          const currentUser = await api.auth.getCurrentUser();
          if (currentUser) {
            console.log('[AUTH] Session valid for user:', currentUser.email, 'ID:', currentUser.id);
            setUser(currentUser);
          } else {
            // Token invalid, clear storage
            console.log('[AUTH] Session invalid - clearing data');
            api.auth.logout();
            setUser(null);
          }
        } else {
          console.log('[AUTH] No active session found');
          setUser(null);
        }
      } catch (error) {
        console.error('[AUTH] Auth check error:', error);
        api.auth.logout();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('[AUTH] Signing in user:', email);
      const data = await api.auth.login(email, password);
      console.log('[AUTH] Sign in successful for user:', data.user.email, 'ID:', data.user.id);
      setUser(data.user);
    } catch (error) {
      console.error('[AUTH] Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      console.log('[AUTH] Signing up user:', email);
      const data = await api.auth.register(email, password, fullName);
      console.log('[AUTH] Sign up successful for user:', data.user.email, 'ID:', data.user.id);
      setUser(data.user);
    } catch (error) {
      console.error('[AUTH] Sign up error:', error);
      throw error;
    }
  };

  const signOut = () => {
    console.log('[AUTH] Signing out user:', user?.email);
    api.auth.logout();
    setUser(null);
    // Force reload to clear all cached data
    window.location.href = '/auth';
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
