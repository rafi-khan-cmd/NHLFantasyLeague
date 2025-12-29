'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { leaguesApi } from '@/lib/api';
import Link from 'next/link';
import ProtectedRoute from '@/components/protected-route';
import { useAuthStore } from '@/stores/auth-store';

interface Standing {
  rosterId: string;
  teamName: string;
  ownerId: string;
  totalPoints: number;
  players: number;
}

interface League {
  id: string;
  name: string;
  description: string;
  status: string;
  currentTeams: number;
  maxTeams: number;
  commissionerId: string;
  rosters?: Array<{
    id: string;
    teamName: string;
    ownerId: string;
    players?: Array<{
      id: string;
      playerName: string;
      position: string;
      nhlTeam: string;
    }>;
  }>;
  drafts?: Array<{
    id: string;
    status: string;
  }>;
}

// Draft interface removed - we're skipping drafts
// interface Draft {
//   id: string;
//   status: string;
//   currentPick: number;
// }

export default function LeagueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leagueId = params.id as string;
  const { user } = useAuthStore();
  
  const [league, setLeague] = useState<League | null>(null);
  // Draft removed - we're skipping drafts
  // const [draft, setDraft] = useState<Draft | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState('');

  useEffect(() => {
    loadLeague();
    loadStandings();
  }, [leagueId]);

  // Draft loading removed - we're skipping drafts
  // useEffect(() => {
  //   if (league && league.drafts && league.drafts.length > 0) {
  //     loadDraft();
  //   }
  // }, [league]);

  const loadLeague = async () => {
    try {
      const response = await leaguesApi.getOne(leagueId);
      setLeague(response.data);
    } catch (err: any) {
      console.error('Failed to load league:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load league');
    } finally {
      setLoading(false);
    }
  };

  const loadDraft = async () => {
    try {
      // Check if league has a draft (from league data)
      if (league?.drafts && league.drafts.length > 0) {
        const draftId = league.drafts[0].id;
        const response = await draftsApi.getOne(draftId);
        setDraft(response.data);
      }
    } catch (err) {
      // Draft might not exist yet, that's okay
      console.log('No draft found for league');
    }
  };

  const loadStandings = async () => {
    try {
      const response = await leaguesApi.getStandings(leagueId);
      setStandings(response.data || []);
    } catch (err: any) {
      console.error('Failed to load standings:', err);
      // Don't show error, just leave standings empty
    }
  };

  const handleJoinLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    setJoining(true);
    setJoinError(null);
    try {
      await leaguesApi.join(leagueId, {
        teamName: teamName.trim(),
      });
      setTeamName('');
      setJoinError(null);
      loadLeague(); // Refresh league data
      alert('Successfully joined the league!');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to join league';
      setJoinError(errorMessage);
      // Show alert for important errors
      if (errorMessage.includes('already in') || errorMessage.includes('one league')) {
        alert(errorMessage);
      }
    } finally {
      setJoining(false);
    }
  };

  // Draft functionality removed - we're skipping drafts
  // const handleStartDraft = async () => {
  //   try {
  //     let draftId = draft?.id;
  //     if (!draftId) {
  //       const createResponse = await draftsApi.create({ leagueId });
  //       draftId = createResponse.data.id;
  //     }
  //     await draftsApi.start(draftId);
  //     await loadLeague();
  //   } catch (err: any) {
  //     setError(err.response?.data?.message || err.message || 'Failed to start draft');
  //   }
  // };

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen relative overflow-hidden particles animated-bg">
          <div className="absolute inset-0 bg-gradient-to-br from-nhl-blue-dark/95 via-nhl-blue/90 to-nhl-red-dark/90"></div>
          <div className="relative z-10 max-w-6xl mx-auto p-8">
            <div className="text-center py-12 glass rounded-3xl border border-white/20">
              <p className="text-white/80 text-lg">Loading...</p>
            </div>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  if (error && !league) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen relative overflow-hidden particles animated-bg">
          <div className="absolute inset-0 bg-gradient-to-br from-nhl-blue-dark/95 via-nhl-blue/90 to-nhl-red-dark/90"></div>
          <div className="relative z-10 max-w-6xl mx-auto p-8">
            <div className="p-4 bg-nhl-red/20 border-l-4 border-nhl-red text-red-200 rounded-xl backdrop-blur-sm mb-4">
              <p className="font-semibold">{error}</p>
            </div>
            <Link href="/leagues" className="mt-4 inline-block text-nhl-blue-light hover:text-nhl-blue hover:underline font-semibold">
              ← Back to Leagues
            </Link>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  if (!league) return null;

  return (
    <ProtectedRoute>
      <main className="min-h-screen relative overflow-hidden particles animated-bg">
        <div className="absolute inset-0 bg-gradient-to-br from-nhl-blue-dark/95 via-nhl-blue/90 to-nhl-red-dark/90"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
        
        <div className="relative z-10 max-w-6xl mx-auto p-8 animate-fade-in">
        <div className="mb-6">
          <Link href="/leagues" className="text-nhl-blue-light hover:text-nhl-blue hover:underline font-semibold">
            ← Back to Leagues
          </Link>
        </div>

        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl md:text-5xl font-sport mb-2 gradient-text-blue tracking-wider text-shadow">{league.name.toUpperCase()}</h1>
            {league.description && (
              <p className="text-white/80 mb-4">{league.description}</p>
            )}
            <div className="flex gap-4 text-sm text-white/80">
              <span>Status: <strong className="text-white">{league.status.toUpperCase()}</strong></span>
              <span>
                Teams: <strong className="text-white">{league.currentTeams}/{league.maxTeams}</strong>
              </span>
            </div>
          </div>
          <Link
            href={`/leagues/${league.id}/chat`}
            className="px-6 py-3 bg-gradient-to-r from-nhl-blue to-nhl-red text-white rounded-xl font-semibold hover:from-nhl-blue-light hover:to-nhl-red-light transition-all"
          >
            💬 Chat
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-nhl-red/20 border-l-4 border-nhl-red text-red-200 rounded-xl backdrop-blur-sm">
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {/* League Constraints & Rules */}
        <div className="mb-6 p-6 glass border border-white/20 rounded-2xl">
          <h2 className="text-2xl font-sport mb-4 text-white tracking-wide">LEAGUE RULES & CONSTRAINTS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-white/80">
            <div className="p-3 glass border border-nhl-blue/50 rounded-xl">
              <h3 className="font-semibold mb-2 text-white">Roster Requirements</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Total Roster: 16-20 players</li>
                <li>Minimum: 9 Forwards (F), 6 Defensemen (D), 2 Goalies (G)</li>
                <li>Maximum: 20 players total</li>
              </ul>
            </div>
            <div className="p-3 glass border border-green-400/50 rounded-xl">
              <h3 className="font-semibold mb-2 text-white">Active Lineup</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Exactly 9 Forwards active</li>
                <li>Exactly 6 Defensemen active</li>
                <li>Exactly 2 Goalies active</li>
                <li>Total: 17 players in active lineup</li>
              </ul>
            </div>
            <div className="p-3 glass border border-yellow-400/50 rounded-xl">
              <h3 className="font-semibold mb-2 text-white">Weekly Limits</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Max 4 goalie starts per week</li>
                <li>Max 3 player adds per week</li>
                <li>Max 3 player drops per week</li>
              </ul>
            </div>
            <div className="p-3 glass border border-purple-400/50 rounded-xl">
              <h3 className="font-semibold mb-2 text-white">Deadlines & Features</h3>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Transaction Deadline: Sunday</li>
                <li>Lineup Deadline: Game time</li>
                <li>2 IR spots available</li>
                <li>$95.5M salary cap per team</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Start Season Button (Commissioner Only) */}
        {league.commissionerId === user?.id && league.status === 'draft' && (
          <div className="mb-6 p-4 glass border border-nhl-blue/50 rounded-2xl">
            <h3 className="font-sport mb-2 text-white tracking-wide">READY TO START THE SEASON?</h3>
            <p className="text-sm text-white/80 mb-3">
              Teams can add players directly via the Players page. Once everyone has built their rosters, click below to start the season and begin scoring.
            </p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  try {
                    await leaguesApi.updateStatus(leagueId, { status: 'active' });
                    loadLeague();
                    alert('League is now active! Season has started and scoring will begin.');
                  } catch (err: any) {
                    alert(err.response?.data?.message || 'Failed to start league');
                  }
                }}
                className="px-4 py-2 bg-gradient-to-r from-nhl-blue to-nhl-red text-white rounded-xl hover:from-nhl-blue-light hover:to-nhl-red-light shadow-lg btn-modern glow-nhl font-semibold"
              >
                Start Season
              </button>
              <Link
                href="/players"
                className="px-4 py-2 bg-gradient-to-r from-nhl-blue to-nhl-red text-white rounded-xl hover:from-nhl-blue-light hover:to-nhl-red-light inline-block shadow-lg btn-modern glow-nhl font-semibold"
              >
                Add Players to Your Team
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Join League Section */}
          {league.currentTeams < league.maxTeams && league.status === 'draft' && (
            <div className="p-6 glass border border-white/20 rounded-2xl">
              <h2 className="text-2xl font-sport mb-4 text-white tracking-wide">JOIN LEAGUE</h2>
              <p className="text-sm text-white/80 mb-4 glass border border-yellow-400/50 p-3 rounded-xl">
                ⚠️ Note: You can only be in one league at a time. If you're already in a league, you'll need to leave it first.
              </p>
              {joinError && (
                <div className="mb-4 p-3 bg-nhl-red/20 border-l-4 border-nhl-red text-red-200 rounded-xl backdrop-blur-sm">
                  <p className="font-semibold">{joinError}</p>
                </div>
              )}
              <form onSubmit={handleJoinLeague}>
                <div className="mb-4">
                  <label className="block text-sm font-bold mb-3 text-white">Team Name</label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 30) {
                        setTeamName(value);
                      }
                    }}
                    minLength={2}
                    maxLength={30}
                    className="w-full px-5 py-4 border-2 border-white/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-nhl-blue/50 focus:border-nhl-blue-light text-white bg-white/10 backdrop-blur-sm placeholder:text-white/50 transition-all input-modern"
                    placeholder="Enter your team name (2-30 characters)"
                    required
                  />
                  <p className="mt-2 text-xs text-white/70">
                    {teamName.length}/30 characters
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={joining}
                  className="w-full px-4 py-2 bg-gradient-to-r from-nhl-blue to-nhl-red text-white rounded-xl hover:from-nhl-blue-light hover:to-nhl-red-light disabled:opacity-50 shadow-lg btn-modern glow-nhl font-semibold"
                >
                  {joining ? 'Joining...' : 'Join League'}
                </button>
              </form>
            </div>
          )}

          {/* Draft Section - Hidden since we're skipping drafts */}
          {/* Draft functionality is available but not shown by default */}
          {/* Teams add players directly via the Players page */}

          {/* League Standings */}
          {standings.length > 0 && (
            <div className="p-6 glass border border-white/20 rounded-2xl lg:col-span-2">
              <h2 className="text-2xl font-sport mb-4 text-white tracking-wide">LEAGUE STANDINGS</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-nhl-blue/30 to-nhl-red/30">
                    <tr>
                      <th className="p-3 text-left font-sport text-white tracking-wide">RANK</th>
                      <th className="p-3 text-left font-sport text-white tracking-wide">TEAM</th>
                      <th className="p-3 text-center font-sport text-white tracking-wide">PLAYERS</th>
                      <th className="p-3 text-right font-sport text-white tracking-wide">TOTAL POINTS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {standings.map((standing, index) => (
                      <tr key={standing.rosterId} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-semibold text-white">#{index + 1}</td>
                        <td className="p-3 font-medium text-white">{standing.teamName}</td>
                        <td className="p-3 text-center text-white/80">{standing.players}</td>
                        <td className="p-3 text-right font-semibold text-nhl-blue-light">
                          {standing.totalPoints.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Rosters Section */}
          <div className="p-6 glass border border-white/20 rounded-2xl lg:col-span-2">
            <h2 className="text-2xl font-sport mb-4 text-white tracking-wide">TEAMS ({league.rosters?.length || 0})</h2>
            {league.rosters && league.rosters.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {league.rosters.map((roster) => (
                  <div key={roster.id} className="p-4 glass border border-white/20 rounded-xl card-hover hover:border-nhl-blue/50 transition-all">
                    <h3 className="font-semibold text-lg mb-2 text-white">{roster.teamName}</h3>
                    <p className="text-sm text-white/80">
                      Players: {roster.players?.length || 0}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/80">No teams have joined yet.</p>
            )}
          </div>
        </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}

