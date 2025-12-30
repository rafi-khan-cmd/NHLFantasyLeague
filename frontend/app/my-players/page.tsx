'use client';

import { useEffect, useState } from 'react';
import { rostersApi } from '@/lib/api';
import ProtectedRoute from '@/components/protected-route';
import Link from 'next/link';

interface Player {
  id: string;
  playerName: string;
  position: string;
  nhlTeam: string;
  salary: number;
  lineupStatus: string;
  totalPoints?: number;
  goals?: number;
  assists?: number;
  shots?: number;
  hits?: number;
  blocks?: number;
  pim?: number;
  plusMinus?: number;
}

interface Roster {
  id: string;
  teamName: string;
  leagueId: string;
  salaryCap: number;
  totalSalary: number;
  league?: {
    id: string;
    name: string;
  };
  players?: Player[];
}

export default function MyPlayersPage() {
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRoster, setFilterRoster] = useState<string>('all');
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'salary' | 'roster' | 'points'>('points');

  useEffect(() => {
    loadRosters();
  }, []);

  const loadRosters = async () => {
    try {
      const response = await rostersApi.getMyRosters();
      setRosters(response.data);
    } catch (err: any) {
      console.error('Failed to load rosters:', err);
      setError('Failed to load rosters. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePlayer = async (rosterId: string, playerId: string, playerName: string) => {
    if (!confirm(`Remove ${playerName} from your roster?`)) return;

    try {
      await rostersApi.removePlayer(rosterId, playerId);
      await loadRosters(); // Refresh to update cap usage
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove player');
    }
  };

  // Get all players from all rosters
  const allPlayers = rosters.flatMap((roster) =>
    (roster.players || []).map((player) => ({
      ...player,
      rosterId: roster.id,
      rosterName: roster.teamName,
      leagueName: roster.league?.name || 'Unknown League',
      leagueId: roster.leagueId,
    })),
  );

  // Filter players
  const filteredPlayers = allPlayers.filter((player) => {
    if (filterRoster !== 'all' && player.rosterId !== filterRoster) return false;
    if (filterPosition !== 'all' && player.position !== filterPosition) return false;
    return true;
  });

  // Sort players
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    switch (sortBy) {
      case 'points':
        return (b.totalPoints || 0) - (a.totalPoints || 0);
      case 'name':
        return a.playerName.localeCompare(b.playerName);
      case 'salary':
        return (b.salary || 0) - (a.salary || 0);
      case 'roster':
      default:
        return a.rosterName.localeCompare(b.rosterName) || a.playerName.localeCompare(b.playerName);
    }
  });

  // Calculate totals
  const totalPlayers = sortedPlayers.length;
  const totalSalary = sortedPlayers.reduce((sum, p) => {
    const salary = Number(p.salary) || 0;
    // Check for NaN or invalid numbers
    if (isNaN(salary) || !isFinite(salary)) {
      return sum;
    }
    return sum + salary;
  }, 0);
  const byPosition = sortedPlayers.reduce(
    (acc, p) => {
      acc[p.position] = (acc[p.position] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen relative overflow-hidden particles animated-bg">
          <div className="absolute inset-0 bg-gradient-to-br from-nhl-blue-dark/95 via-nhl-blue/90 to-nhl-red-dark/90"></div>
          <div className="relative z-10 max-w-6xl mx-auto p-8">
            <div className="text-center glass rounded-3xl border border-white/20 p-12">
              <p className="text-white/80 text-lg">Loading...</p>
            </div>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen relative overflow-hidden particles animated-bg">
        <div className="absolute inset-0 bg-gradient-to-br from-nhl-blue-dark/95 via-nhl-blue/90 to-nhl-red-dark/90"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
        
        <div className="relative z-10 max-w-6xl mx-auto p-8 animate-fade-in">
          <div className="mb-6">
            <Link href="/" className="text-nhl-blue-light hover:text-nhl-blue hover:underline font-semibold">
              ← Back to Home
            </Link>
          </div>
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-sport mb-2 gradient-text-blue tracking-wider text-shadow">
              MY PLAYERS
            </h1>
            <p className="text-white/80">View and manage all your players across all rosters</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-nhl-red/20 border-l-4 border-nhl-red text-red-200 rounded-xl backdrop-blur-sm">
              <p className="font-semibold">{error}</p>
            </div>
          )}

          {/* Summary Stats */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 glass border border-nhl-blue/50 rounded-2xl">
              <div className="text-sm text-white/80">Total Players</div>
              <div className="text-2xl font-bold text-white">{totalPlayers}</div>
            </div>
            <div className="p-4 glass border border-green-400/50 rounded-2xl">
              <div className="text-sm text-white/80">Total Salary</div>
              <div className="text-2xl font-bold text-white">
                ${isNaN(totalSalary) || !isFinite(totalSalary) ? '0.00' : (totalSalary / 1000000).toFixed(2)}M
              </div>
            </div>
            <div className="p-4 glass border border-purple-400/50 rounded-2xl">
              <div className="text-sm text-white/80">Forwards</div>
              <div className="text-2xl font-bold text-white">{byPosition.F || 0}</div>
            </div>
            <div className="p-4 glass border border-orange-400/50 rounded-2xl">
              <div className="text-sm text-white/80">Defensemen</div>
              <div className="text-2xl font-bold text-white">{byPosition.D || 0}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 p-4 glass border border-white/20 rounded-2xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold mb-3 text-white">Filter by Roster</label>
                <select
                  value={filterRoster}
                  onChange={(e) => setFilterRoster(e.target.value)}
                  className="w-full px-5 py-4 border-2 border-white/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-nhl-blue/50 focus:border-nhl-blue-light text-white bg-white/10 backdrop-blur-sm transition-all input-modern"
                >
                  <option value="all">All Rosters</option>
                  {rosters.map((roster) => (
                    <option key={roster.id} value={roster.id}>
                      {roster.teamName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-3 text-white">Filter by Position</label>
                <select
                  value={filterPosition}
                  onChange={(e) => setFilterPosition(e.target.value)}
                  className="w-full px-5 py-4 border-2 border-white/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-nhl-blue/50 focus:border-nhl-blue-light text-white bg-white/10 backdrop-blur-sm transition-all input-modern"
                >
                  <option value="all">All Positions</option>
                  <option value="F">Forwards</option>
                  <option value="D">Defensemen</option>
                  <option value="G">Goalies</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-3 text-white">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-5 py-4 border-2 border-white/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-nhl-blue/50 focus:border-nhl-blue-light text-white bg-white/10 backdrop-blur-sm transition-all input-modern"
                >
                  <option value="points">Points (High to Low)</option>
                  <option value="roster">Roster</option>
                  <option value="name">Name</option>
                  <option value="salary">Salary (High to Low)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Players List */}
          {sortedPlayers.length === 0 ? (
            <div className="p-8 text-center glass rounded-3xl border border-white/20">
              <p className="mb-4 text-white/80 text-lg">No players found.</p>
              <Link href="/players" className="text-nhl-blue-light hover:text-nhl-blue hover:underline font-semibold">
                Add players to your rosters
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedPlayers.map((player) => (
                <div
                  key={`${player.rosterId}-${player.id}`}
                  className="p-4 glass border border-white/20 rounded-2xl card-hover"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{player.playerName}</h3>
                        <span className="px-2 py-1 text-xs glass border border-white/20 text-white/80 rounded">
                          {player.position}
                        </span>
                        <span className="px-2 py-1 text-xs glass border border-nhl-blue/50 text-nhl-blue-light rounded">
                          {player.nhlTeam.toUpperCase()}
                        </span>
                        {player.lineupStatus === 'active' && (
                          <span className="px-2 py-1 text-xs bg-green-500/30 text-green-200 border border-green-400/50 rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-white/80">
                        <span>
                          <strong className="text-white">Roster:</strong>{' '}
                          <Link
                            href={`/leagues/${player.leagueId}`}
                            className="text-nhl-blue-light hover:text-nhl-blue hover:underline"
                          >
                            {player.rosterName}
                          </Link>
                        </span>
                        <span>
                          <strong className="text-white">League:</strong> {player.leagueName}
                        </span>
                        <span className="text-white font-semibold">
                          ${((player.salary || 0) / 1000000).toFixed(2)}M
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemovePlayer(player.rosterId, player.id, player.playerName)}
                      className="ml-4 px-4 py-2 glass border border-nhl-red/50 text-red-300 rounded-xl hover:bg-nhl-red/20 transition-all font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}

