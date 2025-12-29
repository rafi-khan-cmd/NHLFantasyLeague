'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { nhlApi } from '@/lib/api';
import ProtectedRoute from '@/components/protected-route';
import Link from 'next/link';

interface GameDetails {
  gameId: number;
  homeTeam: {
    teamAbbrev: string;
    players: Array<{
      playerId: number;
      name: string;
      position: string;
      goals: number;
      assists: number;
      points: number;
      shots: number;
      hits: number;
      blocks: number;
      pim: number;
      plusMinus: number;
      toi: string;
      shotsAgainst?: number;
      saves?: number;
      goalsAgainst?: number;
      savePercentage?: number;
    }>;
  };
  awayTeam: {
    teamAbbrev: string;
    players: Array<{
      playerId: number;
      name: string;
      position: string;
      goals: number;
      assists: number;
      points: number;
      shots: number;
      hits: number;
      blocks: number;
      pim: number;
      plusMinus: number;
      toi: string;
      shotsAgainst?: number;
      saves?: number;
      goalsAgainst?: number;
      savePercentage?: number;
    }>;
  };
}

export default function GameDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params?.gameId as string;
  
  const [gameDetails, setGameDetails] = useState<GameDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [homeScore, setHomeScore] = useState<number | null>(null);
  const [awayScore, setAwayScore] = useState<number | null>(null);

  useEffect(() => {
    if (gameId) {
      loadGameDetails();
    }
  }, [gameId]);

  const loadGameDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await nhlApi.getGameDetails(parseInt(gameId));
      setGameDetails(response.data);
      
      // Try to get scores from the game details or fetch game info
      // For now, we'll calculate from goals if needed
    } catch (err: any) {
      console.error('Failed to load game details:', err);
      setError('Failed to load game details. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  if (!gameId) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen relative overflow-hidden particles animated-bg">
          <div className="absolute inset-0 bg-gradient-to-br from-nhl-blue-dark/95 via-nhl-blue/90 to-nhl-red-dark/90"></div>
          <div className="relative z-10 max-w-6xl mx-auto p-8">
            <div className="p-4 bg-nhl-red/20 border-l-4 border-nhl-red text-red-200 rounded-xl backdrop-blur-sm mb-4">
              <p className="font-semibold">Invalid game ID</p>
            </div>
            <Link href="/games" className="mt-4 inline-block text-nhl-blue-light hover:text-nhl-blue hover:underline font-semibold">
              ← Back to Games
            </Link>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen relative overflow-hidden particles animated-bg">
          <div className="absolute inset-0 bg-gradient-to-br from-nhl-blue-dark/95 via-nhl-blue/90 to-nhl-red-dark/90"></div>
          <div className="relative z-10 max-w-6xl mx-auto p-8">
            <div className="mb-6">
              <Link href="/games" className="text-nhl-blue-light hover:text-nhl-blue hover:underline mb-4 inline-block font-semibold">
                ← Back to Games
              </Link>
              <h1 className="text-4xl md:text-5xl font-sport mb-2 gradient-text-blue tracking-wider text-shadow">
                GAME DETAILS
              </h1>
            </div>
            <div className="text-center py-12 glass rounded-3xl border border-white/20">
              <p className="text-white/80 text-lg">Loading game details...</p>
            </div>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  if (error || !gameDetails) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen relative overflow-hidden particles animated-bg">
          <div className="absolute inset-0 bg-gradient-to-br from-nhl-blue-dark/95 via-nhl-blue/90 to-nhl-red-dark/90"></div>
          <div className="relative z-10 max-w-6xl mx-auto p-8">
            <div className="mb-6">
              <Link href="/games" className="text-nhl-blue-light hover:text-nhl-blue hover:underline mb-4 inline-block font-semibold">
                ← Back to Games
              </Link>
              <h1 className="text-4xl md:text-5xl font-sport mb-2 gradient-text-blue tracking-wider text-shadow">
                GAME DETAILS
              </h1>
            </div>
            <div className="p-4 bg-nhl-red/20 border-l-4 border-nhl-red text-red-200 rounded-xl backdrop-blur-sm">
              <p className="font-semibold">{error || 'Game details not found'}</p>
            </div>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  // Calculate team scores from player goals
  const calculateTeamScore = (players: GameDetails['homeTeam']['players']): number => {
    return players.reduce((sum, player) => sum + (player.goals || 0), 0);
  };

  const homeTeamScore = homeScore !== null ? homeScore : calculateTeamScore(gameDetails.homeTeam.players);
  const awayTeamScore = awayScore !== null ? awayScore : calculateTeamScore(gameDetails.awayTeam.players);

  const hasGoalies = gameDetails.homeTeam.players.some(p => p.position === 'G') || 
                     gameDetails.awayTeam.players.some(p => p.position === 'G');

  return (
    <ProtectedRoute>
      <main className="min-h-screen relative overflow-hidden particles animated-bg">
        <div className="absolute inset-0 bg-gradient-to-br from-nhl-blue-dark/95 via-nhl-blue/90 to-nhl-red-dark/90"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
        
        <div className="relative z-10 max-w-6xl mx-auto p-8 animate-fade-in">
          <div className="mb-6">
            <Link href="/games" className="text-nhl-blue-light hover:text-nhl-blue hover:underline mb-4 inline-block font-semibold">
              ← Back to Games
            </Link>
            <h1 className="text-4xl md:text-5xl font-sport mb-2 gradient-text-blue tracking-wider text-shadow">
              GAME DETAILS
            </h1>
            <p className="text-white/70">Game ID: {gameId}</p>
          </div>

          {/* Score Summary */}
          <div className="mb-6 p-6 glass border border-white/20 rounded-2xl">
            <div className="flex justify-center items-center gap-6 text-3xl font-bold text-white">
              <div className="text-center">
                <div className="text-sm text-white/70 mb-1">Away</div>
                <div className="font-sport tracking-wide text-lg mb-2">{gameDetails.awayTeam.teamAbbrev}</div>
                <div className="text-5xl mt-2 text-nhl-blue-light">{awayTeamScore}</div>
              </div>
              <div className="text-white/50 font-sport text-2xl">VS</div>
              <div className="text-center">
                <div className="text-sm text-white/70 mb-1">Home</div>
                <div className="font-sport tracking-wide text-lg mb-2">{gameDetails.homeTeam.teamAbbrev}</div>
                <div className="text-5xl mt-2 text-nhl-red-light">{homeTeamScore}</div>
              </div>
            </div>
          </div>

          {/* Away Team Players */}
          <div className="mb-6 p-6 glass border border-white/20 rounded-2xl">
            <h2 className="text-2xl font-sport mb-4 text-white tracking-wide">
              {gameDetails.awayTeam.teamAbbrev.toUpperCase()} - PLAYER STATS
            </h2>
            <div className="overflow-x-auto rounded-xl border border-white/20">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-nhl-blue/30 to-nhl-red/30">
                  <tr>
                    <th className="p-3 text-left font-sport text-white tracking-wide">PLAYER</th>
                    <th className="p-3 text-center font-sport text-white tracking-wide">POS</th>
                    <th className="p-3 text-center font-sport text-white tracking-wide">G</th>
                    <th className="p-3 text-center font-sport text-white tracking-wide">A</th>
                    <th className="p-3 text-center font-sport text-white tracking-wide">P</th>
                    <th className="p-3 text-center font-sport text-white tracking-wide">S</th>
                    <th className="p-3 text-center font-sport text-white tracking-wide">H</th>
                    <th className="p-3 text-center font-sport text-white tracking-wide">B</th>
                    <th className="p-3 text-center font-sport text-white tracking-wide">PIM</th>
                    <th className="p-3 text-center font-sport text-white tracking-wide">+/-</th>
                    <th className="p-3 text-center font-sport text-white tracking-wide">TOI</th>
                    {hasGoalies && (
                      <>
                        <th className="p-3 text-center font-sport text-white tracking-wide">SA</th>
                        <th className="p-3 text-center font-sport text-white tracking-wide">SV</th>
                        <th className="p-3 text-center font-sport text-white tracking-wide">GA</th>
                        <th className="p-3 text-center font-sport text-white tracking-wide">SV%</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {gameDetails.awayTeam.players.length === 0 ? (
                    <tr>
                      <td colSpan={hasGoalies ? 15 : 11} className="p-4 text-center text-white/80">
                        No player data available
                      </td>
                    </tr>
                  ) : (
                    gameDetails.awayTeam.players.map((player) => (
                      <tr key={player.playerId} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-medium text-white">{player.name}</td>
                        <td className="p-3 text-center text-white/80">{player.position}</td>
                        <td className="p-3 text-center text-white/80">{player.goals}</td>
                        <td className="p-3 text-center text-white/80">{player.assists}</td>
                        <td className="p-3 text-center font-semibold text-nhl-blue-light">{player.points}</td>
                        <td className="p-3 text-center text-white/80">{player.shots}</td>
                        <td className="p-3 text-center text-white/80">{player.hits}</td>
                        <td className="p-3 text-center text-white/80">{player.blocks}</td>
                        <td className="p-3 text-center text-white/80">{player.pim}</td>
                        <td className="p-3 text-center text-white/80">{player.plusMinus}</td>
                        <td className="p-3 text-center text-white/80">{player.toi}</td>
                        {hasGoalies && (
                          <>
                            <td className="p-3 text-center text-white/80">
                              {player.position === 'G' ? (player.shotsAgainst || 0) : '-'}
                            </td>
                            <td className="p-3 text-center text-white/80">
                              {player.position === 'G' ? (player.saves || 0) : '-'}
                            </td>
                            <td className="p-3 text-center text-white/80">
                              {player.position === 'G' ? (player.goalsAgainst || 0) : '-'}
                            </td>
                            <td className="p-3 text-center text-white/80">
                              {player.position === 'G' && player.savePercentage !== undefined
                                ? `${(player.savePercentage * 100).toFixed(1)}%`
                                : '-'}
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Home Team Players */}
          <div className="mb-6 p-6 glass border border-white/20 rounded-2xl">
            <h2 className="text-2xl font-sport mb-4 text-white tracking-wide">
              {gameDetails.homeTeam.teamAbbrev.toUpperCase()} - PLAYER STATS
            </h2>
            <div className="overflow-x-auto rounded-xl border border-white/20">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-nhl-blue/30 to-nhl-red/30">
                  <tr>
                    <th className="p-3 text-left font-sport text-white tracking-wide">PLAYER</th>
                    <th className="p-3 text-center font-sport text-white tracking-wide">POS</th>
                    <th className="p-3 text-center font-sport text-white tracking-wide">G</th>
                    <th className="p-3 text-center font-sport text-white tracking-wide">A</th>
                    <th className="p-3 text-center font-sport text-white tracking-wide">P</th>
                    <th className="p-3 text-center font-sport text-white tracking-wide">S</th>
                    <th className="p-3 text-center font-sport text-white tracking-wide">H</th>
                    <th className="p-3 text-center font-sport text-white tracking-wide">B</th>
                    <th className="p-3 text-center font-sport text-white tracking-wide">PIM</th>
                    <th className="p-3 text-center font-sport text-white tracking-wide">+/-</th>
                    <th className="p-3 text-center font-sport text-white tracking-wide">TOI</th>
                    {hasGoalies && (
                      <>
                        <th className="p-3 text-center font-sport text-white tracking-wide">SA</th>
                        <th className="p-3 text-center font-sport text-white tracking-wide">SV</th>
                        <th className="p-3 text-center font-sport text-white tracking-wide">GA</th>
                        <th className="p-3 text-center font-sport text-white tracking-wide">SV%</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {gameDetails.homeTeam.players.length === 0 ? (
                    <tr>
                      <td colSpan={hasGoalies ? 15 : 11} className="p-4 text-center text-white/80">
                        No player data available
                      </td>
                    </tr>
                  ) : (
                    gameDetails.homeTeam.players.map((player) => (
                      <tr key={player.playerId} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-medium text-white">{player.name}</td>
                        <td className="p-3 text-center text-white/80">{player.position}</td>
                        <td className="p-3 text-center text-white/80">{player.goals}</td>
                        <td className="p-3 text-center text-white/80">{player.assists}</td>
                        <td className="p-3 text-center font-semibold text-nhl-blue-light">{player.points}</td>
                        <td className="p-3 text-center text-white/80">{player.shots}</td>
                        <td className="p-3 text-center text-white/80">{player.hits}</td>
                        <td className="p-3 text-center text-white/80">{player.blocks}</td>
                        <td className="p-3 text-center text-white/80">{player.pim}</td>
                        <td className="p-3 text-center text-white/80">{player.plusMinus}</td>
                        <td className="p-3 text-center text-white/80">{player.toi}</td>
                        {hasGoalies && (
                          <>
                            <td className="p-3 text-center text-white/80">
                              {player.position === 'G' ? (player.shotsAgainst || 0) : '-'}
                            </td>
                            <td className="p-3 text-center text-white/80">
                              {player.position === 'G' ? (player.saves || 0) : '-'}
                            </td>
                            <td className="p-3 text-center text-white/80">
                              {player.position === 'G' ? (player.goalsAgainst || 0) : '-'}
                            </td>
                            <td className="p-3 text-center text-white/80">
                              {player.position === 'G' && player.savePercentage !== undefined
                                ? `${(player.savePercentage * 100).toFixed(1)}%`
                                : '-'}
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
