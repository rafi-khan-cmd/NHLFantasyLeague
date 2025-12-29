'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/protected-route';
import { reportsApi, leaguesApi } from '@/lib/api';

interface League {
  id: string;
  name: string;
}

interface WeeklyReport {
  week: { start: string; end: string };
  leagueName: string;
  bestPerformers: Array<{
    rosterId: string;
    teamName: string;
    points: number;
    rank: number;
  }>;
  worstPerformers: Array<{
    rosterId: string;
    teamName: string;
    points: number;
    rank: number;
  }>;
  playerOfTheWeek: {
    nhlPlayerId: number;
    playerName: string;
    points: number;
    rosterCount: number;
  } | null;
  transactionSummary: {
    totalAdds: number;
    totalDrops: number;
    mostActiveTeam: {
      rosterId: string;
      teamName: string;
      transactions: number;
    } | null;
  };
  powerRankings: Array<{
    rosterId: string;
    teamName: string;
    rank: number;
    points: number;
    trend: 'up' | 'down' | 'same';
  }>;
  upcomingDeadlines: {
    transactionDeadline: string | null;
    nextGameDay: string | null;
  };
}

export default function ReportsPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    loadLeagues();
  }, []);

  useEffect(() => {
    if (selectedLeague) {
      loadReport();
    }
  }, [selectedLeague]);

  const loadLeagues = async () => {
    try {
      setLoading(true);
      const response = await leaguesApi.getAll();
      setLeagues(response.data);
      if (response.data.length > 0) {
        setSelectedLeague(response.data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load leagues:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async () => {
    if (!selectedLeague) return;
    try {
      setLoadingReport(true);
      const response = await reportsApi.getWeeklyReport(selectedLeague);
      setReport(response.data);
    } catch (err: any) {
      console.error('Failed to load report:', err);
    } finally {
      setLoadingReport(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen relative overflow-hidden particles animated-bg">
          <div className="absolute inset-0 bg-gradient-to-br from-nhl-blue-dark/95 via-nhl-blue/90 to-nhl-red-dark/90"></div>
          <div className="relative z-10 max-w-6xl mx-auto p-8">
            <div className="text-center glass rounded-3xl border border-white/20 p-12">
              <p className="text-white/80 text-lg">Loading reports...</p>
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
              WEEKLY REPORTS
            </h1>
            <p className="text-white/80">League summaries, power rankings, and insights</p>
          </div>

          {/* League Selector */}
          {leagues.length > 0 && (
            <div className="mb-6 glass border border-white/20 rounded-2xl p-4">
              <label className="block text-white/80 mb-2">Select League:</label>
              <select
                value={selectedLeague || ''}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-4 focus:ring-nhl-blue/50 focus:border-nhl-blue-light text-white"
              >
                {leagues.map((league) => (
                  <option key={league.id} value={league.id}>
                    {league.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {loadingReport ? (
            <div className="text-center glass rounded-3xl border border-white/20 p-12">
              <p className="text-white/80 text-lg">Generating weekly report...</p>
            </div>
          ) : report ? (
            <>
              {/* Week Header */}
              <div className="glass border border-white/20 rounded-3xl p-6 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-3xl font-sport mb-2 gradient-text-blue">{report.leagueName}</h2>
                    <p className="text-white/80">
                      Week of {new Date(report.week.start).toLocaleDateString()} - {new Date(report.week.end).toLocaleDateString()}
                    </p>
                  </div>
                  {report.playerOfTheWeek && (
                    <div className="text-center p-4 glass border border-yellow-400/50 rounded-2xl bg-yellow-400/10">
                      <div className="text-yellow-400 text-sm mb-1">Player of the Week</div>
                      <div className="text-white font-bold text-xl">{report.playerOfTheWeek.playerName}</div>
                      <div className="text-yellow-400 font-semibold">{report.playerOfTheWeek.points.toFixed(1)} pts</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Best/Worst Performers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="glass border border-white/20 rounded-3xl p-6">
                  <h2 className="text-2xl font-sport mb-4 gradient-text-blue">Top Performers</h2>
                  <div className="space-y-3">
                    {report.bestPerformers.map((team) => (
                      <div key={team.rosterId} className="flex justify-between items-center p-3 glass border border-green-400/20 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-nhl-blue to-nhl-red rounded-full flex items-center justify-center text-white font-bold">
                            {team.rank}
                          </div>
                          <div className="text-white font-semibold">{team.teamName}</div>
                        </div>
                        <div className="text-green-400 font-bold">{team.points.toFixed(1)} pts</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass border border-white/20 rounded-3xl p-6">
                  <h2 className="text-2xl font-sport mb-4 gradient-text-blue">Needs Improvement</h2>
                  <div className="space-y-3">
                    {report.worstPerformers.map((team) => (
                      <div key={team.rosterId} className="flex justify-between items-center p-3 glass border border-red-400/20 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-nhl-blue to-nhl-red rounded-full flex items-center justify-center text-white font-bold">
                            {team.rank}
                          </div>
                          <div className="text-white font-semibold">{team.teamName}</div>
                        </div>
                        <div className="text-red-400 font-bold">{team.points.toFixed(1)} pts</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Transaction Summary */}
              <div className="glass border border-white/20 rounded-3xl p-6 mb-6">
                <h2 className="text-2xl font-sport mb-4 gradient-text-blue">Transaction Summary</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 glass border border-white/10 rounded-xl text-center">
                    <div className="text-white/60 text-sm mb-1">Total Adds</div>
                    <div className="text-3xl font-bold text-green-400">{report.transactionSummary.totalAdds}</div>
                  </div>
                  <div className="p-4 glass border border-white/10 rounded-xl text-center">
                    <div className="text-white/60 text-sm mb-1">Total Drops</div>
                    <div className="text-3xl font-bold text-red-400">{report.transactionSummary.totalDrops}</div>
                  </div>
                  <div className="p-4 glass border border-white/10 rounded-xl text-center">
                    <div className="text-white/60 text-sm mb-1">Most Active</div>
                    <div className="text-lg font-bold text-white">
                      {report.transactionSummary.mostActiveTeam?.teamName || 'N/A'}
                    </div>
                    <div className="text-white/60 text-xs">
                      {report.transactionSummary.mostActiveTeam?.transactions || 0} transactions
                    </div>
                  </div>
                </div>
              </div>

              {/* Power Rankings */}
              <div className="glass border border-white/20 rounded-3xl p-6 mb-6">
                <h2 className="text-2xl font-sport mb-4 gradient-text-blue">Power Rankings</h2>
                <div className="space-y-3">
                  {report.powerRankings.map((team) => (
                    <div key={team.rosterId} className="flex justify-between items-center p-4 glass border border-white/10 rounded-xl hover:bg-white/5 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-nhl-blue to-nhl-red rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {team.rank}
                        </div>
                        <div>
                          <div className="text-white font-semibold text-lg">{team.teamName}</div>
                          <div className="text-white/60 text-sm">{team.points.toFixed(1)} points this week</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {team.trend === 'up' && <span className="text-green-400 text-2xl">↑</span>}
                        {team.trend === 'down' && <span className="text-red-400 text-2xl">↓</span>}
                        {team.trend === 'same' && <span className="text-white/40 text-2xl">→</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Deadlines */}
              {report.upcomingDeadlines.transactionDeadline && (
                <div className="glass border border-yellow-400/50 rounded-3xl p-6 bg-yellow-400/10">
                  <h2 className="text-2xl font-sport mb-4 gradient-text-blue">Upcoming Deadlines</h2>
                  <div className="space-y-2">
                    {report.upcomingDeadlines.transactionDeadline && (
                      <div className="text-white">
                        <span className="font-semibold">Transaction Deadline:</span>{' '}
                        {new Date(report.upcomingDeadlines.transactionDeadline).toLocaleString()}
                      </div>
                    )}
                    {report.upcomingDeadlines.nextGameDay && (
                      <div className="text-white">
                        <span className="font-semibold">Next Game Day:</span>{' '}
                        {new Date(report.upcomingDeadlines.nextGameDay).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center glass rounded-3xl border border-white/20 p-12">
              <p className="text-white/80 text-lg">No report available. Select a league to generate a weekly report.</p>
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}

