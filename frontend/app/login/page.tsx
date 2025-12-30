'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { login, error, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const validateForm = (): boolean => {
    const errors: typeof formErrors = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

        try {
          await login(email.trim(), password);
          router.push('/');
        } catch (err: any) {
          // Error is handled by store, but ensure it's displayed
          if (err?.response?.status === 502 || err?.response?.status === 503 || err?.message?.includes('unavailable')) {
            setFormErrors({ 
              email: 'Backend service is temporarily unavailable. Please try again in a moment.',
            });
          }
        }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-8 relative overflow-hidden particles animated-bg">
      <div className="absolute inset-0 bg-gradient-to-br from-nhl-blue-dark/95 via-nhl-blue/90 to-nhl-red-dark/90"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
      
      <div className="max-w-md w-full relative z-10 animate-fade-in">
        <div className="glass rounded-3xl shadow-2xl p-10 border border-white/20">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-br from-nhl-blue via-nhl-blue-light to-nhl-red rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl glow-nhl animate-float">
              <span className="text-5xl">🏒</span>
            </div>
            <h1 className="text-5xl font-sport gradient-text-blue mb-3 text-shadow tracking-wider">
              WELCOME BACK
            </h1>
            <p className="text-white/80 text-lg">Sign in to continue your fantasy journey</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-nhl-red/20 border-l-4 border-nhl-red text-red-200 rounded-xl animate-slide-in backdrop-blur-sm">
                <p className="font-semibold">{error}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-bold mb-3 text-white">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (formErrors.email) setFormErrors({ ...formErrors, email: undefined });
                }}
                className={`w-full px-5 py-4 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-nhl-blue/50 focus:border-nhl-blue-light text-white bg-white/10 backdrop-blur-sm placeholder:text-white/50 transition-all input-modern ${
                  formErrors.email ? 'border-nhl-red' : 'border-white/20 hover:border-white/40'
                }`}
                placeholder="your@email.com"
              />
              {formErrors.email && (
                <p className="mt-2 text-sm text-red-300 animate-slide-in font-medium">{formErrors.email}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold mb-3 text-white">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (formErrors.password) setFormErrors({ ...formErrors, password: undefined });
                }}
                className={`w-full px-5 py-4 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-nhl-blue/50 focus:border-nhl-blue-light text-white bg-white/10 backdrop-blur-sm placeholder:text-white/50 transition-all input-modern ${
                  formErrors.password ? 'border-nhl-red' : 'border-white/20 hover:border-white/40'
                }`}
                placeholder="••••••••"
              />
              {formErrors.password && (
                <p className="mt-2 text-sm text-red-300 animate-slide-in font-medium">{formErrors.password}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-5 py-4 bg-gradient-to-r from-nhl-blue via-nhl-blue-light to-nhl-red text-white rounded-2xl hover:from-nhl-blue-light hover:via-nhl-blue hover:to-nhl-red-light disabled:opacity-50 font-bold shadow-2xl hover:shadow-3xl transition-all transform hover:scale-[1.02] btn-modern glow-nhl"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="spinner w-5 h-5 mr-3"></span>
                  Logging in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          <p className="mt-8 text-center text-sm text-white/70">
            Don't have an account?{' '}
            <Link href="/register" className="font-bold text-nhl-blue-light hover:text-nhl-blue hover:underline transition-colors">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

