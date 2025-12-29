'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import ProtectedRoute from '@/components/protected-route';
import { rostersApi } from '@/lib/api';

interface Roster {
  id: string;
  teamName: string;
  leagueId: string;
  rosterAnnounced?: boolean;
  league?: {
    id: string;
    name: string;
  };
  players?: Array<{
    id: string;
    playerName: string;
    position: string;
    nhlTeam: string;
    lineupStatus: string;
    totalPoints?: number;
    goals?: number;
    assists?: number;
    shots?: number;
    hits?: number;
    blocks?: number;
    pim?: number;
    plusMinus?: number;
  }>;
}

export default function Home() {
  const { isAuthenticated } = useAuthStore();
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [selectedRosterForScore, setSelectedRosterForScore] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadRosters();
    }
  }, [isAuthenticated]);

  const loadRosters = async () => {
    try {
      setLoading(true);
      const response = await rostersApi.getMyRosters();
      setRosters(response.data);
    } catch (err: any) {
      console.error('Failed to load rosters:', err);
    } finally {
      setLoading(false);
    }
  };

  // Show public landing page if not authenticated
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-8">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <div className="mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <span className="text-5xl">🏒</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              NHL Fantasy League
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-4 max-w-2xl mx-auto">
              Real-time NHL fantasy league with live scoring and comprehensive league management
            </p>
            <p className="text-lg text-gray-600 mb-12">
              Build your dream team, compete with friends, and track your players' performance
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/register"
              className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 text-lg font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="inline-block px-8 py-4 border-2 border-blue-600 text-blue-600 rounded-xl hover:bg-blue-50 text-lg font-semibold transition-all transform hover:scale-105"
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen relative overflow-hidden particles animated-bg">
        {/* Animated background overlay - NHL Theme */}
        <div className="absolute inset-0 bg-gradient-to-br from-nhl-blue-dark/95 via-nhl-blue/90 to-nhl-red-dark/90"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto p-8 animate-fade-in">
        {/* Hero Section - NHL Theme */}
        <div className="text-center mb-16 mt-8">
          <div className="inline-block mb-6 animate-float">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-nhl-blue via-nhl-blue-light to-nhl-red rounded-3xl flex items-center justify-center shadow-2xl glow-nhl transform rotate-3">
              <span className="text-5xl md:text-6xl">🏒</span>
            </div>
          </div>
          <h1 className="text-6xl md:text-8xl font-sport mb-6 gradient-text-blue text-shadow tracking-wider">
            NHL FANTASY LEAGUE
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto font-light leading-relaxed">
            Experience the ultimate fantasy hockey platform with <span className="font-semibold text-white">real-time scoring</span>, 
            <span className="font-semibold text-white"> advanced analytics</span>, and <span className="font-semibold text-white">seamless league management</span>
          </p>
        </div>
        
        {/* Feature Cards Grid - Ultra Modern */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          <Link
            href="/leagues"
            className="group relative p-8 glass rounded-3xl card-hover overflow-hidden border border-white/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-nhl-blue/20 via-nhl-blue-light/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-nhl-blue to-nhl-blue-light rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-all duration-500 group-hover:scale-150"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-nhl-blue via-nhl-blue-light to-nhl-red rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg glow-blue">
                <span className="text-4xl">🏆</span>
              </div>
              <h2 className="text-3xl font-sport mb-3 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-nhl-blue-light group-hover:to-nhl-red transition-all duration-300 tracking-wide">LEAGUES</h2>
              <p className="text-white/70 text-lg leading-relaxed">Create and manage your fantasy leagues with advanced settings</p>
              <div className="mt-4 flex items-center text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-sm font-semibold">Explore →</span>
              </div>
            </div>
          </Link>

          <Link
            href="/scores"
            className="group relative p-8 glass rounded-3xl card-hover overflow-hidden border border-white/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-nhl-blue/20 via-nhl-blue-light/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-nhl-blue to-nhl-blue-light rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-all duration-500 group-hover:scale-150"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-nhl-blue via-nhl-blue-light to-nhl-red rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg glow-blue">
                <span className="text-4xl">📊</span>
              </div>
              <h2 className="text-3xl font-sport mb-3 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-nhl-blue-light group-hover:to-nhl-red transition-all duration-300 tracking-wide">STANDINGS</h2>
              <p className="text-white/70 text-lg leading-relaxed">Track league rankings and team performance in real-time</p>
              <div className="mt-4 flex items-center text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-sm font-semibold">View Rankings →</span>
              </div>
            </div>
          </Link>

          <Link
            href="/rosters"
            className="group relative p-8 glass rounded-3xl card-hover overflow-hidden border border-white/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-nhl-red/20 via-nhl-red-light/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-nhl-red to-nhl-red-light rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-all duration-500 group-hover:scale-150"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-nhl-red via-nhl-red-light to-nhl-blue rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg glow-red">
                <span className="text-4xl">👥</span>
              </div>
              <h2 className="text-3xl font-sport mb-3 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-nhl-red group-hover:to-nhl-red-light transition-all duration-300 tracking-wide">ROSTERS</h2>
              <p className="text-white/70 text-lg leading-relaxed">Build and optimize your team lineups with precision</p>
              <div className="mt-4 flex items-center text-red-300 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-sm font-semibold">Manage Team →</span>
              </div>
            </div>
          </Link>

          <Link
            href="/players"
            className="group relative p-8 glass rounded-3xl card-hover overflow-hidden border border-white/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-nhl-blue/20 via-nhl-blue-light/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-nhl-blue to-nhl-blue-light rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-all duration-500 group-hover:scale-150"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-nhl-blue via-nhl-blue-light to-nhl-red rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg glow-blue">
                <span className="text-4xl">➕</span>
              </div>
              <h2 className="text-3xl font-sport mb-3 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-nhl-blue-light group-hover:to-nhl-red transition-all duration-300 tracking-wide">ADD PLAYERS</h2>
              <p className="text-white/70 text-lg leading-relaxed">Discover and recruit top NHL talent to your roster</p>
              <div className="mt-4 flex items-center text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-sm font-semibold">Browse Players →</span>
              </div>
            </div>
          </Link>

          <Link
            href="/my-players"
            className="group relative p-8 glass rounded-3xl card-hover overflow-hidden border border-white/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-nhl-red/20 via-nhl-red-light/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-nhl-red to-nhl-red-light rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-all duration-500 group-hover:scale-150"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-nhl-red via-nhl-red-light to-nhl-blue rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg glow-red">
                <span className="text-4xl">⭐</span>
              </div>
              <h2 className="text-3xl font-sport mb-3 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-nhl-red group-hover:to-nhl-red-light transition-all duration-300 tracking-wide">MY PLAYERS</h2>
              <p className="text-white/70 text-lg leading-relaxed">Comprehensive view of all your roster players</p>
              <div className="mt-4 flex items-center text-red-300 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-sm font-semibold">View All →</span>
              </div>
            </div>
          </Link>

          <Link
            href="/games"
            className="group relative p-8 glass rounded-3xl card-hover overflow-hidden border border-white/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-nhl-blue/20 via-nhl-red/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-nhl-blue to-nhl-red rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-all duration-500 group-hover:scale-150"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-nhl-blue via-nhl-red to-nhl-red-light rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg glow-nhl">
                <span className="text-4xl">🏒</span>
              </div>
              <h2 className="text-3xl font-sport mb-3 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-nhl-blue-light group-hover:to-nhl-red transition-all duration-300 tracking-wide">NHL GAMES</h2>
              <p className="text-white/70 text-lg leading-relaxed">Live scores, schedules, and detailed game analytics</p>
              <div className="mt-4 flex items-center text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-sm font-semibold">View Games →</span>
              </div>
            </div>
          </Link>

          {/* Score Breakdown Card */}
          {rosters.some((r) => r.rosterAnnounced && r.players && r.players.length > 0) && (
            <div
              onClick={() => {
                const announcedRoster = rosters.find((r) => r.rosterAnnounced && r.players && r.players.length > 0);
                if (announcedRoster) {
                  setSelectedRosterForScore(announcedRoster.id);
                }
              }}
              className="group relative p-8 glass rounded-3xl card-hover overflow-hidden border border-white/20 cursor-pointer animate-pulse-glow"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-nhl-blue/20 via-nhl-red/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-nhl-blue to-nhl-red rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-all duration-500 group-hover:scale-150"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-nhl-blue via-nhl-red to-nhl-red-light rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg glow-nhl">
                  <span className="text-4xl">📊</span>
                </div>
                <h2 className="text-3xl font-sport mb-3 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-nhl-blue-light group-hover:to-nhl-red transition-all duration-300 tracking-wide">SCORE BREAKDOWN</h2>
                <p className="text-white/70 text-lg leading-relaxed">Detailed analytics of your team's performance</p>
                <div className="mt-4 flex items-center text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm font-semibold">View Details →</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Score Breakdown Modal */}
      {selectedRosterForScore && (() => {
        const roster = rosters.find((r) => r.id === selectedRosterForScore);
        if (!roster) return null;

        const totalRosterPoints = roster.players?.reduce((sum, p) => sum + (p.totalPoints || 0), 0) || 0;
        const playersWithPoints = (roster.players || [])
          .map((p) => ({
            ...p,
            points: p.totalPoints || 0,
          }))
          .sort((a, b) => b.points - a.points);

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="glass rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-white/20">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-sport text-white tracking-wide">{roster.teamName.toUpperCase()} - SCORE BREAKDOWN</h2>
                    <p className="text-white/80 mt-1">
                      {roster.league?.name || 'League'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedRosterForScore(null)}
                    className="w-10 h-10 rounded-full glass border border-white/20 hover:bg-white/10 text-white hover:text-white text-2xl font-bold transition-all flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>

                {/* Total Score */}
                <div className="mb-6 p-6 bg-gradient-to-br from-nhl-blue via-nhl-blue-light to-nhl-red rounded-2xl shadow-lg">
                  <div className="text-sm text-white/90 mb-2 font-medium">Total Roster Points</div>
                  <div className="text-5xl font-bold text-white">
                    {totalRosterPoints.toFixed(2)}
                  </div>
                </div>

                {/* Player Breakdown */}
                <div>
                  <h3 className="text-xl font-sport text-white mb-6 tracking-wide">PLAYER CONTRIBUTIONS</h3>
                  {playersWithPoints.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-white/20">
                      <table className="min-w-full divide-y divide-white/10">
                        <thead className="bg-gradient-to-r from-nhl-blue/30 to-nhl-red/30">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-sport text-white uppercase tracking-wider">
                              PLAYER
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-sport text-white uppercase tracking-wider">
                              POSITION
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-sport text-white uppercase tracking-wider">
                              TEAM
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-sport text-white uppercase tracking-wider">
                              STATUS
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-sport text-white uppercase tracking-wider">
                              POINTS
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-sport text-white uppercase tracking-wider">
                              STATS
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {playersWithPoints.map((player, index) => (
                            <tr key={player.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                                {player.playerName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                                {player.position}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                                {player.nhlTeam}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span
                                  className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                    player.lineupStatus === 'active'
                                      ? 'bg-green-500/30 text-green-200 border border-green-400/50'
                                      : player.lineupStatus === 'ir'
                                      ? 'bg-red-500/30 text-red-200 border border-red-400/50'
                                      : 'bg-white/10 text-white/80 border border-white/20'
                                  }`}
                                >
                                  {player.lineupStatus?.toUpperCase() || 'BENCH'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-nhl-blue-light text-right">
                                {player.points.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-xs text-white/70 text-right">
                                {player.goals !== undefined && (
                                  <div>
                                    G: {player.goals || 0} | A: {player.assists || 0} | SOG: {player.shots || 0}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 glass rounded-xl border border-white/20">
                      <p className="text-white/80">No players on roster yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </main>
    </ProtectedRoute>
  );
}

