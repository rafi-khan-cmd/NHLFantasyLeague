'use client';

import { useEffect, useState } from 'react';
import { rostersApi, leaguesApi } from '@/lib/api';
import ProtectedRoute from '@/components/protected-route';
import Link from 'next/link';

interface LeagueStandings {
  rosterId: string;
  teamName: string;
  totalPoints: number;
}

interface League {
  id: string;
  name: string;
}

export default function ScoresPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [standings, setStandings] = useState<Record<string, LeagueStandings[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user's rosters to find which leagues they're in
      const rostersResponse = await rostersApi.getMyRosters();
      const rosters = rostersResponse.data;

      // Extract unique league IDs
      const leagueIds = [...new Set(rosters.map((r: any) => r.leagueId).filter(Boolean))];

      // Fetch standings for each league
      const standingsData: Record<string, LeagueStandings[]> = {};
      const leagueData: League[] = [];

      for (const leagueId of leagueIds) {
        try {
          const leagueResponse = await leaguesApi.getOne(leagueId);
          leagueData.push({
            id: leagueId,
            name: leagueResponse.data.name,
          });

          const standingsResponse = await leaguesApi.getStandings(leagueId);
          standingsData[leagueId] = standingsResponse.data;
        } catch (err: any) {
          console.error(`Failed to load standings for league ${leagueId}:`, err);
        }
      }

      setLeagues(leagueData);
      setStandings(standingsData);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.response?.data?.message || 'Failed to load standings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-8 text-gray-800">Loading standings...</div>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
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
              LEAGUE STANDINGS
            </h1>
            <p className="text-white/80">View rankings and team performance</p>
          </div>

          {leagues.length === 0 ? (
            <div className="p-8 text-center glass rounded-3xl border border-white/20">
              <p className="mb-4 text-white/80 text-lg">You're not in any leagues yet.</p>
              <a href="/leagues" className="text-nhl-blue-light hover:text-nhl-blue hover:underline font-semibold">
                Join a league to see standings
              </a>
            </div>
          ) : (
            <div className="space-y-6">
              {leagues.map((league) => {
                const leagueStandings = standings[league.id] || [];
                return (
                  <div key={league.id} className="glass rounded-3xl shadow-lg border border-white/20 overflow-hidden">
                    <div className="p-6 bg-gradient-to-r from-nhl-blue via-nhl-blue-light to-nhl-red">
                      <h2 className="text-2xl font-sport text-white tracking-wide">{league.name.toUpperCase()}</h2>
                    </div>
                    <div className="p-6">
                      {leagueStandings.length === 0 ? (
                        <div className="text-center py-12 glass rounded-xl border border-white/20">
                          <p className="text-white/80">No standings available yet.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-white/20">
                          <table className="w-full">
                            <thead className="bg-gradient-to-r from-nhl-blue/30 to-nhl-red/30">
                              <tr>
                                <th className="text-left p-4 font-sport text-white tracking-wide">RANK</th>
                                <th className="text-left p-4 font-sport text-white tracking-wide">TEAM</th>
                                <th className="text-right p-4 font-sport text-white tracking-wide">TOTAL POINTS</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                              {leagueStandings.map((team, index) => (
                                <tr key={team.rosterId} className="hover:bg-white/5 transition-colors">
                                  <td className="p-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                      index === 0 ? 'bg-yellow-400/30 text-yellow-200 border border-yellow-400/50' :
                                      index === 1 ? 'bg-white/20 text-white border border-white/30' :
                                      index === 2 ? 'bg-orange-400/30 text-orange-200 border border-orange-400/50' :
                                      'bg-white/10 text-white/60 border border-white/20'
                                    }`}>
                                      {index + 1}
                                    </div>
                                  </td>
                                  <td className="p-4 font-semibold text-white">{team.teamName}</td>
                                  <td className="p-4 text-right font-bold text-nhl-blue-light">{team.totalPoints.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}

