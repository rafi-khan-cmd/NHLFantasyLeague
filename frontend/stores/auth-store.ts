import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ loading: true, error: null });
        try {
          const response = await authApi.login({ email, password });
          set({
            user: response.data.user,
            token: response.data.token,
            isAuthenticated: true,
            loading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Login failed',
            loading: false,
          });
          throw error;
        }
      },

      register: async (email: string, password: string, username: string) => {
        set({ loading: true, error: null });
        try {
          const response = await authApi.register({ email, password, username });
          set({
            user: response.data.user,
            token: response.data.token,
            isAuthenticated: true,
            loading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Registration failed',
            loading: false,
          });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },

      setToken: (token) => {
        set({ token });
      },
    }),
    {
      name: 'auth-storage',
    },
  ),
);

