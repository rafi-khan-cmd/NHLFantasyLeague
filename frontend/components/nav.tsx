'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter, usePathname } from 'next/navigation';

export default function Nav() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <nav className="glass-dark border-b border-white/10 shadow-2xl sticky top-0 z-50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link 
              href="/" 
              className="flex items-center px-3 py-2 text-2xl font-black gradient-text-blue hover:scale-105 transition-transform"
            >
              <span className="mr-2 text-3xl animate-float">🏒</span>
              <span className="text-shadow text-white font-sport tracking-wider">NHL FANTASY</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <div className="flex items-center space-x-3 px-5 py-2.5 glass rounded-xl border border-white/20 hover:border-white/40 transition-all group">
                  <div className="w-10 h-10 bg-gradient-to-br from-nhl-blue via-nhl-blue-light to-nhl-red rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all">
                    {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm font-semibold text-white">{user?.username || user?.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-nhl-red via-nhl-red-light to-nhl-red-dark text-white rounded-xl hover:from-nhl-red-dark hover:via-nhl-red hover:to-nhl-red-light transition-all shadow-lg hover:shadow-xl hover:scale-105 btn-modern glow-red"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all btn-modern ${
                    pathname === '/login'
                      ? 'bg-gradient-to-r from-nhl-blue to-nhl-blue-light text-white shadow-lg glow-blue'
                      : 'text-white/90 hover:text-white hover:bg-white/10 border border-white/20'
                  }`}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105 btn-modern ${
                    pathname === '/register'
                      ? 'bg-gradient-to-r from-nhl-red to-nhl-red-light text-white glow-red'
                      : 'bg-gradient-to-r from-nhl-blue via-nhl-blue-light to-nhl-red text-white hover:from-nhl-blue-light hover:via-nhl-blue hover:to-nhl-red-light'
                  }`}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

