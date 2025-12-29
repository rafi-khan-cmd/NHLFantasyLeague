'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api';
import Link from 'next/link';

type Step = 'email' | 'verify' | 'register';

export default function RegisterPage() {
  const router = useRouter();
  const { register, error, loading } = useAuthStore();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [formData, setFormData] = useState({
    password: '',
    username: '',
  });
  const [formErrors, setFormErrors] = useState<{ 
    email?: string; 
    password?: string; 
    username?: string;
    code?: string;
  }>({});
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [message, setMessage] = useState('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setFormErrors({ email: 'Email is required' });
      return false;
    } else if (!emailRegex.test(email)) {
      setFormErrors({ email: 'Please enter a valid email address' });
      return false;
    }
    setFormErrors({});
    return true;
  };

  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) return;

    try {
      setSendingCode(true);
      setMessage('');
      await authApi.sendVerification(email.trim());
      setCodeSent(true);
      setMessage('Verification code sent! Check your email (and server logs in development).');
      setStep('verify');
    } catch (err: any) {
      setFormErrors({ 
        email: err.response?.data?.message || 'Failed to send verification code' 
      });
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      setFormErrors({ code: 'Please enter the 6-digit verification code' });
      return;
    }

    try {
      setVerifying(true);
      setMessage('');
      await authApi.verifyEmail(email, verificationCode);
      setEmailVerified(true);
      setMessage('Email verified! Complete your registration below.');
      setStep('register');
    } catch (err: any) {
      setFormErrors({ 
        code: err.response?.data?.message || 'Invalid or expired verification code' 
      });
    } finally {
      setVerifying(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: typeof formErrors = {};

    // Username validation
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (formData.username.trim().length > 20) {
      errors.username = 'Username must be 20 characters or less';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    } else if (formData.password.length > 100) {
      errors.password = 'Password must be 100 characters or less';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailVerified) {
      setFormErrors({ email: 'Email must be verified first' });
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      await register(email.trim(), formData.password, formData.username.trim());
      router.push('/');
    } catch (err) {
      // Error is handled by store
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-8 relative overflow-hidden particles animated-bg">
      <div className="absolute inset-0 bg-gradient-to-br from-nhl-red-dark/95 via-nhl-red/90 to-nhl-blue-dark/90"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
      
      <div className="max-w-md w-full relative z-10 animate-fade-in">
        <div className="glass rounded-3xl shadow-2xl p-10 border border-white/20">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-br from-nhl-red via-nhl-red-light to-nhl-blue rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl glow-red animate-float">
              <span className="text-5xl">🚀</span>
            </div>
            <h1 className="text-5xl font-sport gradient-text mb-3 text-shadow tracking-wider">
              GET STARTED
            </h1>
            <p className="text-white/80 text-lg">
              {step === 'email' && 'Verify your email to begin'}
              {step === 'verify' && 'Enter verification code'}
              {step === 'register' && 'Complete your registration'}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex justify-center mb-8 gap-2">
            <div className={`w-3 h-3 rounded-full ${step === 'email' ? 'bg-nhl-red' : 'bg-white/30'}`}></div>
            <div className={`w-3 h-3 rounded-full ${step === 'verify' ? 'bg-nhl-red' : step === 'register' ? 'bg-nhl-red' : 'bg-white/30'}`}></div>
            <div className={`w-3 h-3 rounded-full ${step === 'register' ? 'bg-nhl-red' : 'bg-white/30'}`}></div>
          </div>
          
          {message && (
            <div className="mb-6 p-4 bg-green-500/20 border-l-4 border-green-400 text-green-200 rounded-xl animate-slide-in backdrop-blur-sm">
              <p className="font-semibold">{message}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border-l-4 border-red-400 text-red-200 rounded-xl animate-slide-in backdrop-blur-sm">
              <p className="font-semibold">{error}</p>
            </div>
          )}

          {/* Step 1: Email */}
          {step === 'email' && (
            <form onSubmit={handleSendVerification} className="space-y-6">
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
                  className={`w-full px-5 py-4 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-nhl-red/50 focus:border-nhl-red-light text-white bg-white/10 backdrop-blur-sm placeholder:text-white/50 transition-all input-modern ${
                    formErrors.email ? 'border-nhl-red' : 'border-white/20 hover:border-white/40'
                  }`}
                  placeholder="your@email.com"
                />
                {formErrors.email && (
                  <p className="mt-2 text-sm text-red-300 animate-slide-in font-medium">{formErrors.email}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={sendingCode}
                className="w-full px-5 py-4 bg-gradient-to-r from-nhl-red via-nhl-red-light to-nhl-blue text-white rounded-2xl hover:from-nhl-red-light hover:via-nhl-red hover:to-nhl-blue-light disabled:opacity-50 font-bold shadow-2xl hover:shadow-3xl transition-all transform hover:scale-[1.02] btn-modern glow-red"
              >
                {sendingCode ? (
                  <span className="flex items-center justify-center">
                    <span className="spinner w-5 h-5 mr-3"></span>
                    Sending Code...
                  </span>
                ) : (
                  'Send Verification Code'
                )}
              </button>
            </form>
          )}

          {/* Step 2: Verify Code */}
          {step === 'verify' && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-3 text-white">Verification Code</label>
                <p className="text-sm text-white/70 mb-3">
                  Enter the 6-digit code sent to <strong className="text-white">{email}</strong>
                </p>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setVerificationCode(value);
                    if (formErrors.code) setFormErrors({ ...formErrors, code: undefined });
                  }}
                  className={`w-full px-5 py-4 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-nhl-red/50 focus:border-nhl-red-light text-white bg-white/10 backdrop-blur-sm placeholder:text-white/50 transition-all input-modern text-center text-2xl tracking-widest ${
                    formErrors.code ? 'border-nhl-red' : 'border-white/20 hover:border-white/40'
                  }`}
                  placeholder="000000"
                />
                {formErrors.code && (
                  <p className="mt-2 text-sm text-red-300 animate-slide-in font-medium">{formErrors.code}</p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setVerificationCode('');
                    setFormErrors({});
                    setMessage('');
                  }}
                  className="flex-1 px-5 py-4 border-2 border-white/20 text-white rounded-2xl hover:border-white/40 font-bold transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={verifying || verificationCode.length !== 6}
                  className="flex-1 px-5 py-4 bg-gradient-to-r from-nhl-red via-nhl-red-light to-nhl-blue text-white rounded-2xl hover:from-nhl-red-light hover:via-nhl-red hover:to-nhl-blue-light disabled:opacity-50 font-bold shadow-2xl hover:shadow-3xl transition-all transform hover:scale-[1.02] btn-modern glow-red"
                >
                  {verifying ? (
                    <span className="flex items-center justify-center">
                      <span className="spinner w-5 h-5 mr-3"></span>
                      Verifying...
                    </span>
                  ) : (
                    'Verify Code'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Complete Registration */}
          {step === 'register' && (
            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-3 text-white">Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-5 py-4 border-2 border-white/20 rounded-2xl text-white/60 bg-white/5 backdrop-blur-sm cursor-not-allowed"
                />
                <p className="mt-2 text-xs text-green-300">✓ Email verified</p>
              </div>
              <div>
                <label className="block text-sm font-bold mb-3 text-white">Username</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={20}
                  value={formData.username}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                    setFormData({ ...formData, username: value });
                    if (formErrors.username) setFormErrors({ ...formErrors, username: undefined });
                  }}
                  className={`w-full px-5 py-4 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-nhl-red/50 focus:border-nhl-red-light text-white bg-white/10 backdrop-blur-sm placeholder:text-white/50 transition-all input-modern ${
                    formErrors.username ? 'border-nhl-red' : 'border-white/20 hover:border-white/40'
                  }`}
                  placeholder="username (letters, numbers, underscores only)"
                />
                {formErrors.username && (
                  <p className="mt-2 text-sm text-red-300 animate-slide-in font-medium">{formErrors.username}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold mb-3 text-white">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  maxLength={100}
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (formErrors.password) setFormErrors({ ...formErrors, password: undefined });
                  }}
                  className={`w-full px-5 py-4 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-nhl-red/50 focus:border-nhl-red-light text-white bg-white/10 backdrop-blur-sm placeholder:text-white/50 transition-all input-modern ${
                    formErrors.password ? 'border-nhl-red' : 'border-white/20 hover:border-white/40'
                  }`}
                  placeholder="•••••••• (min 6 characters)"
                />
                {formErrors.password && (
                  <p className="mt-2 text-sm text-red-300 animate-slide-in font-medium">{formErrors.password}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-5 py-4 bg-gradient-to-r from-nhl-red via-nhl-red-light to-nhl-blue text-white rounded-2xl hover:from-nhl-red-light hover:via-nhl-red hover:to-nhl-blue-light disabled:opacity-50 font-bold shadow-2xl hover:shadow-3xl transition-all transform hover:scale-[1.02] btn-modern glow-red"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="spinner w-5 h-5 mr-3"></span>
                    Creating Account...
                  </span>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-white/70">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-red-300 hover:text-red-200 hover:underline transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
