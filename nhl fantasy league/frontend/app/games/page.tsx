'use client';

import { useEffect, useState } from 'react';
import { nhlApi } from '@/lib/api';
import ProtectedRoute from '@/components/protected-route';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Game {
  gameId?: number;
  id?: number;
  gameDate: string;
  gameState?: string;
  homeTeam?: string | { abbrev?: string; name?: string; score?: number };
  awayTeam?: string | { abbrev?: string; name?: string; score?: number };
  homeTeamAbbrev?: string;
  awayTeamAbbrev?: string;
  homeScore?: number;
  awayScore?: number;
  startTimeUTC?: string;
}

interface GamesByDate {
  date: string;
  games: Game[];
}

export default function GamesPage() {
  const router = useRouter();
  const [recentGames, setRecentGames] = useState<GamesByDate[]>([]);
  const [upcomingGames, setUpcomingGames] = useState<GamesByDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'recent' | 'upcoming'>('recent');

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    setLoading(true);
    setError(null);
    try {
      const [recent, upcoming] = await Promise.all([
        nhlApi.getRecentGames(),
        nhlApi.getUpcomingGames(),
      ]);
      
      // Handle response format - could be array or object with games property
      const recentData = Array.isArray(recent.data) ? recent.data : recent.data?.games || [];
      const upcomingData = Array.isArray(upcoming.data) ? upcoming.data : upcoming.data?.games || [];
      
      setRecentGames(recentData);
      setUpcomingGames(upcomingData);
      
      // Check for errors in response
      if (recent.data?.error || upcoming.data?.error) {
        setError(`Error loading games: ${recent.data?.error || upcoming.data?.error}`);
      }
    } catch (err: any) {
      console.error('Failed to load games:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Unknown error';
      setError(`Failed to load games: ${errorMessage}. Is the backend running?`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return 'TBD';
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      });
    } catch {
      return 'TBD';
    }
  };

  const getTeamAbbrev = (team: string | { abbrev?: string; name?: string } | undefined): string => {
    if (!team) return 'TBD';
    if (typeof team === 'string') return team.toUpperCase();
    return team.abbrev?.toUpperCase() || team.name || 'TBD';
  };

  const getTeamScore = (game: Game, isHome: boolean): number | null => {
    if (isHome) {
      if (game.homeScore !== undefined) return game.homeScore;
      if (typeof game.homeTeam === 'object' && game.homeTeam?.score !== undefined) {
        return game.homeTeam.score;
      }
    } else {
      if (game.awayScore !== undefined) return game.awayScore;
      if (typeof game.awayTeam === 'object' && game.awayTeam?.score !== undefined) {
        return game.awayTeam.score;
      }
    }
    return null;
  };

  const getGameState = (game: Game): string => {
    const state = game.gameState || 'UNKNOWN';
    if (state === 'FINAL') return 'Final';
    if (state === 'FINAL_OT') return 'Final (OT)';
    if (state === 'FINAL_SO') return 'Final (SO)';
    if (state === 'LIVE' || state === 'IN_PROGRESS') return 'Live';
    if (state === 'PREVIEW' || state === 'PRE_GAME') return 'Upcoming';
    return state;
  };

  const handleGameClick = (game: Game) => {
    const gameId = game.gameId || game.id;
    if (!gameId) return;
    
    // Navigate to game details page
    router.push(`/games/${gameId}`);
  };

  const renderGame = (game: Game) => {
    const homeTeam = getTeamAbbrev(game.homeTeam || game.homeTeamAbbrev);
    const awayTeam = getTeamAbbrev(game.awayTeam || game.awayTeamAbbrev);
    const homeScore = getTeamScore(game, true);
    const awayScore = getTeamScore(game, false);
    const gameState = getGameState(game);
    const isCompleted = ['FINAL', 'FINAL_OT', 'FINAL_SO', 'OFF'].includes(game.gameState || '');
    const isLive = ['LIVE', 'IN_PROGRESS'].includes(game.gameState || '');

    return (
      <div
        key={game.gameId || game.id || Math.random()}
        onClick={() => isCompleted && handleGameClick(game)}
        className={`p-4 glass border rounded-2xl cursor-pointer transition-all card-hover ${
          isLive 
            ? 'border-nhl-red/50 bg-nhl-red/10 hover:bg-nhl-red/20' 
            : isCompleted 
            ? 'border-white/20 hover:border-nhl-blue-light hover:shadow-lg' 
            : 'border-white/20 hover:border-white/40'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-semibold text-white">{awayTeam}</span>
              {isCompleted && awayScore !== null && (
                <span className="text-2xl font-bold text-white">{awayScore}</span>
              )}
              {isLive && <span className="text-xs bg-nhl-red text-white px-2 py-1 rounded-lg font-semibold animate-pulse">LIVE</span>}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-white">{homeTeam}</span>
              {isCompleted && homeScore !== null && (
                <span className="text-2xl font-bold text-white">{homeScore}</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-white">{gameState}</div>
            {!isCompleted && game.startTimeUTC && (
              <div className="text-xs text-white/70 mt-1">{formatTime(game.startTimeUTC)}</div>
            )}
            {isCompleted && (
              <div className="text-xs text-nhl-blue-light mt-1 font-semibold">Click for details</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen relative overflow-hidden particles animated-bg">
        <div className="absolute inset-0 bg-gradient-to-br from-nhl-blue-dark/95 via-nhl-blue/90 to-nhl-red-dark/90"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
        
        <div className="relative z-10 max-w-6xl mx-auto p-8 animate-fade-in">
          <div className="mb-6">
            <Link href="/" className="text-nhl-blue-light hover:text-nhl-blue hover:underline mb-4 inline-block font-semibold">
              ← Back to Home
            </Link>
            <h1 className="text-4xl md:text-5xl font-sport mb-2 gradient-text-blue tracking-wider text-shadow">
              NHL GAMES
            </h1>
            <p className="text-white/80">View recent completed games and upcoming games</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-nhl-red/20 border-l-4 border-nhl-red text-red-200 rounded-xl backdrop-blur-sm">
              <p className="font-semibold">{error}</p>
            </div>
          )}

          {/* Tabs */}
          <div className="mb-6 flex gap-4 border-b border-white/20">
            <button
              onClick={() => setActiveTab('recent')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === 'recent'
                  ? 'text-nhl-blue-light border-b-2 border-nhl-blue-light'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Recent Games (Last 2 Days)
            </button>
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === 'upcoming'
                  ? 'text-nhl-blue-light border-b-2 border-nhl-blue-light'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Upcoming Games (Next 2 Days)
            </button>
            <button
              onClick={loadGames}
              className="ml-auto px-4 py-2 bg-gradient-to-r from-nhl-blue to-nhl-red text-white rounded-xl hover:from-nhl-blue-light hover:to-nhl-red-light shadow-lg btn-modern glow-nhl font-semibold"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 glass rounded-3xl border border-white/20">
              <p className="text-white/80 text-lg">Loading games...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeTab === 'recent' ? (
                recentGames.length === 0 ? (
                  <div className="text-center py-12 glass rounded-3xl border border-white/20">
                    <p className="text-white/80 text-lg">No recent completed games found.</p>
                  </div>
                ) : (
                  recentGames.map((dayGames) => (
                    <div key={dayGames.date} className="mb-6">
                      <h2 className="text-2xl font-sport mb-4 text-white tracking-wide">
                        {formatDate(dayGames.date).toUpperCase()}
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {dayGames.games.map((game) => renderGame(game))}
                      </div>
                    </div>
                  ))
                )
              ) : (
                upcomingGames.length === 0 ? (
                  <div className="text-center py-12 glass rounded-3xl border border-white/20">
                    <p className="text-white/80 text-lg">No upcoming games found.</p>
                  </div>
                ) : (
                  upcomingGames.map((dayGames) => (
                    <div key={dayGames.date} className="mb-6">
                      <h2 className="text-2xl font-sport mb-4 text-white tracking-wide">
                        {formatDate(dayGames.date).toUpperCase()}
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {dayGames.games.map((game) => renderGame(game))}
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
