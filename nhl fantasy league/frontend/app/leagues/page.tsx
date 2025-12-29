'use client';

import { useEffect, useState } from 'react';
import { leaguesApi } from '@/lib/api';
import Link from 'next/link';
import ProtectedRoute from '@/components/protected-route';

interface League {
  id: string;
  name: string;
  description: string;
  status: string;
  currentTeams: number;
  maxTeams: number;
}

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    maxTeams: 12,
  });
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    description?: string;
    maxTeams?: string;
  }>({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeagues();
  }, []);

  const loadLeagues = async () => {
    try {
      const response = await leaguesApi.getAll();
      setLeagues(response.data);
    } catch (err: any) {
      console.error('Failed to load leagues:', err);
      setError('Failed to load leagues. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: typeof formErrors = {};

    if (!formData.name.trim()) {
      errors.name = 'League name is required';
    } else if (formData.name.trim().length < 3) {
      errors.name = 'League name must be at least 3 characters';
    } else if (formData.name.trim().length > 50) {
      errors.name = 'League name must be 50 characters or less';
    }

    if (formData.description && formData.description.length > 500) {
      errors.description = 'Description must be 500 characters or less';
    }

    if (formData.maxTeams < 2 || formData.maxTeams > 20) {
      errors.maxTeams = 'Max teams must be between 2 and 20';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await leaguesApi.create({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        maxTeams: formData.maxTeams,
      });

      setLeagues([...leagues, response.data]);
      setShowCreateModal(false);
      setFormData({ name: '', description: '', maxTeams: 12 });
      setFormErrors({});
    } catch (err: any) {
      console.error('Failed to create league:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create league');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">Loading...</div>
      </main>
    );
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen relative overflow-hidden particles animated-bg">
        <div className="absolute inset-0 bg-gradient-to-br from-nhl-blue-dark/95 via-nhl-blue/90 to-nhl-red-dark/90"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
        
        <div className="relative z-10 max-w-6xl mx-auto p-8 animate-fade-in">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-sport mb-2 gradient-text-blue tracking-wider text-shadow">
              LEAGUES
            </h1>
            <p className="text-white/80">Join or create a fantasy league</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-nhl-blue via-nhl-blue-light to-nhl-red text-white rounded-xl hover:from-nhl-blue-light hover:via-nhl-blue hover:to-nhl-red-light font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 btn-modern glow-nhl"
          >
            + Create League
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-100">
              <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Create New League
              </h2>
              <form onSubmit={handleCreateLeague}>
                <div className="mb-4">
                  <label className="block text-sm font-bold mb-3 text-white">League Name *</label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={50}
                    value={formData.name}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 50) {
                        setFormData({ ...formData, name: value });
                        if (formErrors.name) setFormErrors({ ...formErrors, name: undefined });
                      }
                    }}
                    className={`w-full px-5 py-4 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-nhl-blue/50 focus:border-nhl-blue-light text-white bg-white/10 backdrop-blur-sm placeholder:text-white/50 transition-all input-modern ${
                      formErrors.name ? 'border-nhl-red' : 'border-white/20 hover:border-white/40'
                    }`}
                    placeholder="Enter league name (3-50 characters)"
                  />
                  {formErrors.name && (
                    <p className="mt-2 text-sm text-red-300 font-medium">{formErrors.name}</p>
                  )}
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-bold mb-3 text-white">Description</label>
                  <textarea
                    maxLength={500}
                    value={formData.description}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 500) {
                        setFormData({ ...formData, description: value });
                        if (formErrors.description) setFormErrors({ ...formErrors, description: undefined });
                      }
                    }}
                    className={`w-full px-5 py-4 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-nhl-blue/50 focus:border-nhl-blue-light text-white bg-white/10 backdrop-blur-sm placeholder:text-white/50 transition-all input-modern ${
                      formErrors.description ? 'border-nhl-red' : 'border-white/20 hover:border-white/40'
                    }`}
                    placeholder="Optional description (max 500 characters)"
                    rows={3}
                  />
                  <p className="mt-2 text-xs text-white/60">
                    {formData.description.length}/500 characters
                  </p>
                  {formErrors.description && (
                    <p className="mt-2 text-sm text-red-300 font-medium">{formErrors.description}</p>
                  )}
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-bold mb-3 text-white">Max Teams</label>
                  <input
                    type="number"
                    required
                    min={2}
                    max={20}
                    value={formData.maxTeams}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 12;
                      const clamped = Math.min(20, Math.max(2, value));
                      setFormData({ ...formData, maxTeams: clamped });
                      if (formErrors.maxTeams) setFormErrors({ ...formErrors, maxTeams: undefined });
                    }}
                    className={`w-full px-5 py-4 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-nhl-blue/50 focus:border-nhl-blue-light text-white bg-white/10 backdrop-blur-sm placeholder:text-white/50 transition-all input-modern ${
                      formErrors.maxTeams ? 'border-nhl-red' : 'border-white/20 hover:border-white/40'
                    }`}
                  />
                  {formErrors.maxTeams && (
                    <p className="mt-2 text-sm text-red-300 font-medium">{formErrors.maxTeams}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setError(null);
                    }}
                    className="flex-1 px-4 py-3 border-2 border-white/30 rounded-xl hover:bg-white/10 text-white font-medium transition-all"
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-nhl-blue via-nhl-blue-light to-nhl-red text-white rounded-xl hover:from-nhl-blue-light hover:via-nhl-blue hover:to-nhl-red-light disabled:opacity-50 font-semibold shadow-lg hover:shadow-xl transition-all btn-modern glow-nhl"
                  >
                    {creating ? 'Creating...' : 'Create League'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {leagues.length === 0 ? (
          <div className="p-8 text-center text-gray-800">
            <p>No leagues found. Create your first league to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leagues.map((league) => (
              <Link
                key={league.id}
                href={`/leagues/${league.id}`}
                className="group relative p-6 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 card-hover border border-gray-100 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold mb-3 text-gray-900 group-hover:text-blue-600 transition-colors">{league.name}</h2>
                  {league.description && (
                    <p className="text-gray-600 mb-4 line-clamp-2">{league.description}</p>
                  )}
                  <div className="flex justify-between items-center text-sm">
                    <span className={`px-3 py-1 rounded-full font-medium ${
                      league.status === 'active' ? 'bg-green-100 text-green-800' :
                      league.status === 'draft' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {league.status}
                    </span>
                    <span className="font-semibold text-gray-700">
                      {league.currentTeams}/{league.maxTeams} teams
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
    </ProtectedRoute>
  );
}

