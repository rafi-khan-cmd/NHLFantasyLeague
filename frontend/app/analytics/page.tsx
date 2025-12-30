'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/protected-route';
import { analyticsApi, rostersApi } from '@/lib/api';

interface Roster {
  id: string;
  teamName: string;
  leagueId: string;
  league?: {
    id: string;
    name: string;
  };
}

interface TeamEfficiency {
  rosterId: string;
  teamName: string;
  totalPoints: number;
  totalSalary: number;
  pointsPerDollar: number;
  efficiencyRank: number;
}

interface TransactionAnalysis {
  bestAdds: Array<{
    nhlPlayerId: number;
    playerName: string;
    addedDate: string;
    pointsSinceAdd: number;
    salary: number;
  }>;
  worstDrops: Array<{
    nhlPlayerId: number;
    playerName: string;
    droppedDate: string;
    pointsSinceDrop: number;
  }>;
}

interface ProjectedStanding {
  rosterId: string;
  teamName: string;
  currentPoints: number;
  currentRank: number;
  projectedPoints: number;
  projectedRank: number;
  gamesRemaining: number;
}

export default function AnalyticsPage() {
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [selectedRoster, setSelectedRoster] = useState<string | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [efficiency, setEfficiency] = useState<TeamEfficiency | null>(null);
  const [transactions, setTransactions] = useState<TransactionAnalysis | null>(null);
  const [projections, setProjections] = useState<ProjectedStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    loadRosters();
  }, []);

  useEffect(() => {
    if (selectedRoster) {
      loadRosterAnalytics();
    }
  }, [selectedRoster]);

  useEffect(() => {
    if (selectedLeague) {
      loadProjections();
    }
  }, [selectedLeague]);

  const loadRosters = async () => {
    try {
      setLoading(true);
      const response = await rostersApi.getMyRosters();
      setRosters(response.data);
      if (response.data.length > 0) {
        setSelectedRoster(response.data[0].id);
        setSelectedLeague(response.data[0].leagueId);
      }
    } catch (err: any) {
      console.error('Failed to load rosters:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRosterAnalytics = async () => {
    if (!selectedRoster) return;
    try {
      setLoadingData(true);
      const [effRes, transRes] = await Promise.all([
        analyticsApi.getTeamEfficiency(selectedRoster),
        analyticsApi.getTransactionAnalysis(selectedRoster, 30),
      ]);
      setEfficiency(effRes.data);
      setTransactions(transRes.data);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadProjections = async () => {
    if (!selectedLeague) return;
    try {
      const response = await analyticsApi.getProjectedStandings(selectedLeague);
      setProjections(response.data);
    } catch (err: any) {
      console.error('Failed to load projections:', err);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen relative overflow-hidden particles animated-bg">
          <div className="absolute inset-0 bg-gradient-to-br from-nhl-blue-dark/95 via-nhl-blue/90 to-nhl-red-dark/90"></div>
          <div className="relative z-10 max-w-6xl mx-auto p-8">
            <div className="text-center glass rounded-3xl border border-white/20 p-12">
              <p className="text-white/80 text-lg">Loading analytics...</p>
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
        
        <div className="relative z-10 max-w-7xl mx-auto p-8 animate-fade-in">
          <div className="mb-6">
            <Link href="/" className="text-nhl-blue-light hover:text-nhl-blue hover:underline font-semibold">
              ← Back to Home
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-sport mb-2 gradient-text-blue tracking-wider text-shadow">
              ADVANCED ANALYTICS
            </h1>
            <p className="text-white/80">Team efficiency, transaction analysis, and projections</p>
          </div>

          {/* Roster Selector */}
          {rosters.length > 0 && (
            <div className="mb-6 glass border border-white/20 rounded-2xl p-4">
              <label className="block text-white/80 mb-2">Select Team:</label>
              <select
                value={selectedRoster || ''}
                onChange={(e) => setSelectedRoster(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-4 focus:ring-nhl-blue/50 focus:border-nhl-blue-light text-white"
              >
                {rosters.map((roster) => (
                  <option key={roster.id} value={roster.id}>
                    {roster.teamName} ({roster.league?.name || 'Unknown League'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {loadingData ? (
            <div className="text-center glass rounded-3xl border border-white/20 p-12">
              <p className="text-white/80 text-lg">Loading analytics...</p>
            </div>
          ) : (
            <>
              {/* Team Efficiency */}
              {efficiency && (
                <div className="glass border border-white/20 rounded-3xl p-6 mb-6">
                  <h2 className="text-2xl font-sport mb-4 gradient-text-blue">Team Efficiency</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 glass border border-white/10 rounded-xl">
                      <div className="text-white/60 text-sm mb-1">Total Points</div>
                      <div className="text-2xl font-bold text-white">{efficiency.totalPoints.toFixed(1)}</div>
                    </div>
                    <div className="p-4 glass border border-white/10 rounded-xl">
                      <div className="text-white/60 text-sm mb-1">Total Salary</div>
                      <div className="text-2xl font-bold text-white">${(efficiency.totalSalary / 1000000).toFixed(2)}M</div>
                    </div>
                    <div className="p-4 glass border border-white/10 rounded-xl">
                      <div className="text-white/60 text-sm mb-1">Points/$M</div>
                      <div className="text-2xl font-bold text-white">{efficiency.pointsPerDollar.toFixed(2)}</div>
                    </div>
                    <div className="p-4 glass border border-white/10 rounded-xl">
                      <div className="text-white/60 text-sm mb-1">Efficiency Rank</div>
                      <div className="text-2xl font-bold text-white">#{efficiency.efficiencyRank}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction Analysis */}
              {transactions && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div className="glass border border-white/20 rounded-3xl p-6">
                    <h2 className="text-2xl font-sport mb-4 gradient-text-blue">Best Adds</h2>
                    <div className="space-y-3">
                      {transactions.bestAdds.slice(0, 5).map((add) => (
                        <div key={add.nhlPlayerId} className="p-3 glass border border-green-400/20 rounded-xl">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="text-white font-semibold">{add.playerName}</div>
                              <div className="text-white/60 text-xs">
                                Added {new Date(add.addedDate).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-green-400 font-bold">+{add.pointsSinceAdd.toFixed(1)}</div>
                              <div className="text-white/60 text-xs">${(add.salary / 1000000).toFixed(2)}M</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="glass border border-white/20 rounded-3xl p-6">
                    <h2 className="text-2xl font-sport mb-4 gradient-text-blue">Worst Drops</h2>
                    <div className="space-y-3">
                      {transactions.worstDrops.slice(0, 5).map((drop) => (
                        <div key={drop.nhlPlayerId} className="p-3 glass border border-red-400/20 rounded-xl">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="text-white font-semibold">{drop.playerName}</div>
                              <div className="text-white/60 text-xs">
                                Dropped {new Date(drop.droppedDate).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-red-400 font-bold">+{drop.pointsSinceDrop.toFixed(1)}</div>
                              <div className="text-white/60 text-xs">points since drop</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Projected Standings */}
              {projections.length > 0 && (
                <div className="glass border border-white/20 rounded-3xl p-6">
                  <h2 className="text-2xl font-sport mb-4 gradient-text-blue">Projected Standings</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/20">
                          <th className="text-left p-3 text-white/80">Rank</th>
                          <th className="text-left p-3 text-white/80">Team</th>
                          <th className="text-right p-3 text-white/80">Current</th>
                          <th className="text-right p-3 text-white/80">Projected</th>
                          <th className="text-right p-3 text-white/80">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projections.map((standing) => (
                          <tr key={standing.rosterId} className="border-b border-white/10 hover:bg-white/5">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-bold">#{standing.projectedRank}</span>
                                {standing.projectedRank < standing.currentRank && (
                                  <span className="text-green-400">↑</span>
                                )}
                                {standing.projectedRank > standing.currentRank && (
                                  <span className="text-red-400">↓</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-white font-semibold">{standing.teamName}</td>
                            <td className="p-3 text-right text-white">#{standing.currentRank} ({standing.currentPoints.toFixed(1)})</td>
                            <td className="p-3 text-right text-white font-bold">{standing.projectedPoints.toFixed(1)}</td>
                            <td className="p-3 text-right">
                              <span className={standing.projectedRank < standing.currentRank ? 'text-green-400' : standing.projectedRank > standing.currentRank ? 'text-red-400' : 'text-white/60'}>
                                {standing.currentRank - standing.projectedRank > 0 ? '+' : ''}
                                {standing.currentRank - standing.projectedRank}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}

