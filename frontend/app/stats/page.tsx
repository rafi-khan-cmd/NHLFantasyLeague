'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/protected-route';
import { statsApi } from '@/lib/api';

interface PositionRanking {
  nhlPlayerId: number;
  playerName: string;
  totalPoints: number;
  gamesPlayed: number;
  pointsPerGame: number;
  rosterCount: number;
}

interface TransactionTrend {
  nhlPlayerId: number;
  playerName: string;
  count: number;
}

interface PlayerStreak {
  nhlPlayerId: number;
  playerName: string;
  recentPoints: number;
  avgPoints: number;
}

interface DashboardData {
  topForwards: PositionRanking[];
  topDefensemen: PositionRanking[];
  topGoalies: PositionRanking[];
  transactionTrends: {
    mostAdded: TransactionTrend[];
    mostDropped: TransactionTrend[];
  };
  streaks: {
    hot: PlayerStreak[];
    cold: PlayerStreak[];
  };
}

export default function StatsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState(7);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await statsApi.getDashboard();
      setData(response.data);
    } catch (err: any) {
      console.error('Failed to load stats:', err);
      setError('Failed to load statistics. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen relative overflow-hidden particles animated-bg">
          <div className="absolute inset-0 bg-gradient-to-br from-nhl-blue-dark/95 via-nhl-blue/90 to-nhl-red-dark/90"></div>
          <div className="relative z-10 max-w-6xl mx-auto p-8">
            <div className="text-center glass rounded-3xl border border-white/20 p-12">
              <p className="text-white/80 text-lg">Loading statistics...</p>
            </div>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  if (error || !data) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen relative overflow-hidden particles animated-bg">
          <div className="absolute inset-0 bg-gradient-to-br from-nhl-blue-dark/95 via-nhl-blue/90 to-nhl-red-dark/90"></div>
          <div className="relative z-10 max-w-6xl mx-auto p-8">
            <div className="mb-6">
              <Link href="/" className="text-nhl-blue-light hover:text-nhl-blue hover:underline font-semibold">
                ← Back to Home
              </Link>
            </div>
            <div className="p-4 bg-nhl-red/20 border-l-4 border-nhl-red text-red-200 rounded-xl backdrop-blur-sm">
              <p className="font-semibold">{error || 'Failed to load statistics'}</p>
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
              PLAYER STATISTICS
            </h1>
            <p className="text-white/80">Top performers, trends, and transaction insights</p>
          </div>

          {/* Top Players by Position */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Top Forwards */}
            <div className="glass border border-white/20 rounded-3xl p-6">
              <h2 className="text-2xl font-sport mb-4 gradient-text-blue">Top Forwards</h2>
              <div className="space-y-3">
                {data.topForwards.slice(0, 10).map((player, idx) => (
                  <div key={player.nhlPlayerId} className="flex justify-between items-center p-3 glass border border-white/10 rounded-xl hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-nhl-blue to-nhl-red rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-white font-semibold">{player.playerName}</div>
                        <div className="text-white/60 text-xs">{player.rosterCount} rosters</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">{player.totalPoints.toFixed(1)}</div>
                      <div className="text-white/60 text-xs">{player.pointsPerGame.toFixed(2)} PPG</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Defensemen */}
            <div className="glass border border-white/20 rounded-3xl p-6">
              <h2 className="text-2xl font-sport mb-4 gradient-text-blue">Top Defensemen</h2>
              <div className="space-y-3">
                {data.topDefensemen.slice(0, 10).map((player, idx) => (
                  <div key={player.nhlPlayerId} className="flex justify-between items-center p-3 glass border border-white/10 rounded-xl hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-nhl-blue to-nhl-red rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-white font-semibold">{player.playerName}</div>
                        <div className="text-white/60 text-xs">{player.rosterCount} rosters</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">{player.totalPoints.toFixed(1)}</div>
                      <div className="text-white/60 text-xs">{player.pointsPerGame.toFixed(2)} PPG</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Goalies */}
            <div className="glass border border-white/20 rounded-3xl p-6">
              <h2 className="text-2xl font-sport mb-4 gradient-text-blue">Top Goalies</h2>
              <div className="space-y-3">
                {data.topGoalies.slice(0, 10).map((player, idx) => (
                  <div key={player.nhlPlayerId} className="flex justify-between items-center p-3 glass border border-white/10 rounded-xl hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-nhl-blue to-nhl-red rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-white font-semibold">{player.playerName}</div>
                        <div className="text-white/60 text-xs">{player.rosterCount} rosters</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">{player.totalPoints.toFixed(1)}</div>
                      <div className="text-white/60 text-xs">{player.pointsPerGame.toFixed(2)} PPG</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Transaction Trends & Streaks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Most Added/Dropped */}
            <div className="glass border border-white/20 rounded-3xl p-6">
              <h2 className="text-2xl font-sport mb-4 gradient-text-blue">Transaction Trends</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-green-400 mb-3">Most Added</h3>
                  <div className="space-y-2">
                    {data.transactionTrends.mostAdded.slice(0, 5).map((player) => (
                      <div key={player.nhlPlayerId} className="flex justify-between items-center p-2 glass border border-green-400/20 rounded-lg">
                        <span className="text-white text-sm">{player.playerName}</span>
                        <span className="text-green-400 font-bold">{player.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-400 mb-3">Most Dropped</h3>
                  <div className="space-y-2">
                    {data.transactionTrends.mostDropped.slice(0, 5).map((player) => (
                      <div key={player.nhlPlayerId} className="flex justify-between items-center p-2 glass border border-red-400/20 rounded-lg">
                        <span className="text-white text-sm">{player.playerName}</span>
                        <span className="text-red-400 font-bold">{player.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Hot/Cold Streaks */}
            <div className="glass border border-white/20 rounded-3xl p-6">
              <h2 className="text-2xl font-sport mb-4 gradient-text-blue">Hot & Cold Streaks</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-yellow-400 mb-3">🔥 Hot</h3>
                  <div className="space-y-2">
                    {data.streaks.hot.slice(0, 5).map((player) => (
                      <div key={player.nhlPlayerId} className="flex justify-between items-center p-2 glass border border-yellow-400/20 rounded-lg">
                        <span className="text-white text-sm">{player.playerName}</span>
                        <span className="text-yellow-400 font-bold">+{player.recentPoints.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-400 mb-3">❄️ Cold</h3>
                  <div className="space-y-2">
                    {data.streaks.cold.slice(0, 5).map((player) => (
                      <div key={player.nhlPlayerId} className="flex justify-between items-center p-2 glass border border-blue-400/20 rounded-lg">
                        <span className="text-white text-sm">{player.playerName}</span>
                        <span className="text-blue-400 font-bold">{player.recentPoints.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}

