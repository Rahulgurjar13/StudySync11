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
          // Verify token is still valid
          const currentUser = await api.auth.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
          } else {
            // Token invalid, clear storage
            api.auth.logout();
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
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
      const data = await api.auth.login(email, password);
      setUser(data.user);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const data = await api.auth.register(email, password, fullName);
      setUser(data.user);
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signOut = () => {
    api.auth.logout();
    setUser(null);
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
