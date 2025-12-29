'use client';

import { useEffect, useState } from 'react';
import { rostersApi } from '@/lib/api';
import Link from 'next/link';
import ProtectedRoute from '@/components/protected-route';

interface Roster {
  id: string;
  teamName: string;
  leagueId: string;
  salaryCap: number;
  totalSalary: number;
  rosterAnnounced?: boolean;
  rosterAnnouncedAt?: string;
  league?: {
    id: string;
    name: string;
  };
  players?: Array<{
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
  }>;
}

export default function RostersPage() {
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRosterForScore, setSelectedRosterForScore] = useState<string | null>(null);

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

  const handleSetActive = async (rosterId: string, playerId: string) => {
    try {
      await rostersApi.updateLineupStatus(rosterId, playerId, 'active');
      loadRosters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update lineup');
    }
  };

  const handleSetBench = async (rosterId: string, playerId: string) => {
    try {
      await rostersApi.updateLineupStatus(rosterId, playerId, 'bench');
      loadRosters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update lineup');
    }
  };

  const handleRemovePlayer = async (rosterId: string, playerId: string) => {
    if (!confirm('Remove this player from your roster?')) return;

    try {
      await rostersApi.removePlayer(rosterId, playerId);
      await loadRosters(); // Ensure we wait for the reload
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove player');
    }
  };

  const handleAnnounceRoster = async (rosterId: string, teamName: string) => {
    if (
      !confirm(
        `Announce your initial roster "${teamName}"? Once announced:\n\n• This becomes your initial roster\n• Points will start counting immediately\n• You can only change 3 players per week\n• This cannot be undone\n\nAre you sure you want to announce your roster?`,
      )
    )
      return;

    try {
      await rostersApi.announceRoster(rosterId);
      alert('✅ Roster announced! Your initial roster is now locked and points will start counting immediately. You can only change 3 players per week from now on.');
      await loadRosters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to announce roster');
    }
  };

  const handleRemoveTeam = async (rosterId: string, teamName: string) => {
    if (
      !confirm(
        `Are you sure you want to remove your team "${teamName}"? This will delete your roster and all players. You can then join a different league.`,
      )
    )
      return;

    try {
      await rostersApi.removeTeam(rosterId);
      alert('Team removed successfully. You can now join a different league.');
      await loadRosters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove team');
    }
  };

  const handleLeaveLeague = async (rosterId: string, teamName: string) => {
    if (
      !confirm(
        `Are you sure you want to leave this league? This will remove your roster "${teamName}" and all players. You can then join a different league.`,
      )
    )
      return;

    try {
      await rostersApi.leaveLeague(rosterId);
      alert('Successfully left the league. You can now join a different league.');
      await loadRosters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to leave league');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen p-8">
          <div className="max-w-6xl mx-auto">Loading...</div>
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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-sport mb-2 gradient-text-blue tracking-wider text-shadow">
              ROSTERS
            </h1>
            <p className="text-white/80">Manage your team lineups</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={async () => {
                if (!confirm('Update all player salaries from MoneyPuck? This will update salaries for all your players.')) return;
                try {
                  const response = await rostersApi.updateSalaries();
                  alert(`✅ Updated ${response.data.updated} player salaries. ${response.data.failed > 0 ? `${response.data.failed} players could not be updated.` : ''}`);
                  await loadRosters();
                } catch (err: any) {
                  alert(err.response?.data?.message || 'Failed to update salaries');
                }
              }}
              className="px-6 py-3 bg-gradient-to-r from-nhl-red via-nhl-red-light to-nhl-blue text-white rounded-xl hover:from-nhl-red-light hover:via-nhl-red hover:to-nhl-blue-light font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 btn-modern glow-nhl"
            >
              💰 Update Salaries
            </button>
            <Link
              href="/players"
              className="px-6 py-3 bg-gradient-to-r from-nhl-blue via-nhl-blue-light to-nhl-red text-white rounded-xl hover:from-nhl-blue-light hover:via-nhl-blue hover:to-nhl-red-light font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 btn-modern glow-nhl"
            >
              + Add Players
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-nhl-red/20 border-l-4 border-nhl-red text-red-200 rounded-xl backdrop-blur-sm">
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {rosters.length === 0 ? (
          <div className="p-8 text-center glass rounded-3xl border border-white/20">
            <p className="mb-4 text-white/80 text-lg">No rosters found.</p>
            <Link
              href="/leagues"
              className="text-nhl-blue-light hover:text-nhl-blue hover:underline font-semibold"
            >
              Join a league to create a roster
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* League Constraints Info */}
            <div className="p-6 glass border-2 border-white/20 rounded-3xl shadow-md">
              <h3 className="text-lg font-sport text-white mb-4 flex items-center gap-2 tracking-wide">
                <span className="text-2xl">📋</span>
                LEAGUE CONSTRAINTS & RULES
              </h3>
              <div className="text-sm text-white/80 space-y-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                <div><strong>Roster Size:</strong> 16-20 players total</div>
                <div><strong>Minimum Requirements:</strong> 9 Forwards (F), 6 Defensemen (D), 2 Goalies (G)</div>
                <div><strong>Active Lineup:</strong> Must have exactly 9F, 6D, 2G active (17 total active)</div>
                <div><strong>Roster Announcement:</strong> Announce your initial roster to lock it and start counting points immediately</div>
                <div><strong>After Announcement:</strong> Your initial roster is locked. Points count immediately. Max 3 player changes per week (adds + drops combined)</div>
                <div><strong>Transaction Deadline:</strong> Sunday (weekly)</div>
                <div><strong>Lineup Deadline:</strong> Before game time</div>
                <div><strong>IR Spots:</strong> 2 injured reserve spots available</div>
              </div>
            </div>

            {rosters.map((roster) => (
              <div key={roster.id} className="p-6 glass rounded-3xl shadow-lg border border-white/20">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-2xl font-sport mb-1 text-white tracking-wide">{roster.teamName.toUpperCase()}</h2>
                        {roster.league && (
                          <Link
                            href={`/leagues/${roster.league.id}`}
                            className="text-nhl-blue-light hover:text-nhl-blue hover:underline text-sm font-medium"
                          >
                            {roster.league.name}
                          </Link>
                        )}
                      </div>
                      <div className="text-sm">
                        <div className="text-white/80 mb-1">
                      {roster.players?.length || 0} / 16-20 players
                      {(() => {
                        const players = roster.players || [];
                        const forwards = players.filter((p) => p.position === 'F').length;
                        const defensemen = players.filter((p) => p.position === 'D').length;
                        const goalies = players.filter((p) => p.position === 'G').length;
                        const activeForwards = players.filter((p) => p.position === 'F' && p.lineupStatus === 'active').length;
                        const activeDefensemen = players.filter((p) => p.position === 'D' && p.lineupStatus === 'active').length;
                        const activeGoalies = players.filter((p) => p.position === 'G' && p.lineupStatus === 'active').length;
                        const minForwards = 9;
                        const minDefensemen = 6;
                        const minGoalies = 2;
                        const issues = [];
                        if (forwards < minForwards) issues.push(`${minForwards - forwards} more F`);
                        if (defensemen < minDefensemen) issues.push(`${minDefensemen - defensemen} more D`);
                        if (goalies < minGoalies) issues.push(`${minGoalies - goalies} more G`);
                        if (issues.length > 0) {
                          return (
                            <div className="text-xs text-red-600 mt-1">
                              Need: {issues.join(', ')}
                            </div>
                          );
                        }
                        // Check active lineup
                        const activeIssues = [];
                        if (activeForwards !== 9) activeIssues.push(`${activeForwards}/9F active`);
                        if (activeDefensemen !== 6) activeIssues.push(`${activeDefensemen}/6D active`);
                        if (activeGoalies !== 2) activeIssues.push(`${activeGoalies}/2G active`);
                        if (activeIssues.length > 0) {
                          return (
                            <div className="text-xs text-yellow-600 mt-1">
                              Active: {activeIssues.join(', ')}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                        <div className="font-bold text-white">
                          ${(isNaN(roster.totalSalary) || !isFinite(roster.totalSalary) ? 0 : (roster.totalSalary || 0) / 1000000).toFixed(2)}M / ${((roster.salaryCap || 95500000) / 1000000).toFixed(2)}M
                        </div>
                        {/* Roster Announcement Status */}
                        {roster.rosterAnnounced ? (
                          <div className="mt-2 p-3 glass border border-green-400/50 rounded-xl">
                            <div className="text-xs font-semibold text-green-200 mb-1">✅ Initial Roster Announced</div>
                            <div className="text-xs text-white/80">
                              {roster.rosterAnnouncedAt
                                ? `Announced: ${new Date(roster.rosterAnnouncedAt).toLocaleDateString()}`
                                : 'Locked'}
                            </div>
                            <div className="text-xs text-white/80 mt-1 font-medium">
                              🎯 Points counting • Max 3 changes/week
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAnnounceRoster(roster.id, roster.teamName)}
                            className="mt-2 px-4 py-2 text-sm font-semibold bg-gradient-to-r from-nhl-blue to-nhl-red text-white rounded-xl hover:from-nhl-blue-light hover:to-nhl-red-light transition-all shadow-lg btn-modern glow-nhl"
                          >
                            🚀 Announce Initial Roster
                          </button>
                        )}
                        {/* Score Breakdown Button - Always visible if roster has players */}
                        {roster.rosterAnnounced && (roster.players && roster.players.length > 0) && (
                          <button
                            onClick={() => setSelectedRosterForScore(roster.id)}
                            className="mt-2 w-full px-4 py-2 text-sm font-semibold bg-gradient-to-r from-nhl-blue via-nhl-blue-light to-nhl-red text-white rounded-xl hover:from-nhl-blue-light hover:via-nhl-blue hover:to-nhl-red-light transition-all shadow-lg btn-modern glow-nhl"
                          >
                            📊 View Score Breakdown
                          </button>
                        )}
                        {roster.league && roster.league.status === 'draft' && !roster.rosterAnnounced && (
                          <button
                            onClick={() => handleRemoveTeam(roster.id, roster.teamName)}
                            className="mt-2 px-3 py-1 text-xs glass border border-white/20 text-white/80 rounded-xl hover:bg-white/10 transition-all"
                          >
                            Remove Team
                          </button>
                        )}
                    {(() => {
                      const cap = roster.salaryCap || 95500000;
                      const spent = roster.totalSalary || 0;
                      const percentage = (spent / cap) * 100;
                      return (
                        <div className="mt-2">
                          <div className="w-full bg-white/20 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                percentage >= 90
                                  ? 'bg-nhl-red'
                                  : percentage >= 75
                                  ? 'bg-yellow-400'
                                  : 'bg-green-400'
                              }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          <div className="text-xs text-white/80 mt-1">
                            {percentage.toFixed(1)}% used • ${((cap - spent) / 1000000).toFixed(2)}M remaining
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {roster.players && roster.players.length > 0 ? (
                  <div>
                    <h3 className="font-sport text-xl mb-3 text-white tracking-wide">ACTIVE LINEUP</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {roster.players
                        .filter((p) => p.lineupStatus === 'active')
                        .map((player) => (
                          <div
                            key={player.id}
                            className="p-4 glass border border-white/20 rounded-2xl flex justify-between items-center card-hover"
                          >
                            <div>
                              <div className="font-semibold text-white">{player.playerName}</div>
                              <div className="text-sm text-white/80">
                                {player.position} - {player.nhlTeam}
                              </div>
                            </div>
                            <button
                              onClick={() => handleSetBench(roster.id, player.id)}
                              className="px-3 py-1 text-xs glass border border-white/20 text-white/80 rounded-lg hover:bg-white/10 transition-all"
                            >
                              Bench
                            </button>
                          </div>
                        ))}
                    </div>

                    {roster.players.some((p) => p.lineupStatus === 'bench') && (
                      <div className="mt-4">
                        <h3 className="font-sport text-xl mb-3 text-white tracking-wide">BENCH</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {roster.players
                            .filter((p) => p.lineupStatus === 'bench')
                            .map((player) => (
                              <div
                                key={player.id}
                                className="p-4 glass border border-white/20 rounded-2xl flex justify-between items-center card-hover"
                              >
                                <div>
                                  <div className="font-semibold text-white">{player.playerName}</div>
                                  <div className="text-sm text-white/80">
                                    {player.position} - {player.nhlTeam}
                                  </div>
                            {player.salary && (
                              <div className="text-xs text-white font-medium">
                                ${(player.salary / 1000000).toFixed(2)}M
                              </div>
                            )}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleSetActive(roster.id, player.id)}
                                    className="px-3 py-1 text-xs bg-gradient-to-r from-nhl-blue to-nhl-red text-white rounded-lg hover:from-nhl-blue-light hover:to-nhl-red-light transition-all font-semibold"
                                  >
                                    Start
                                  </button>
                                  <button
                                    onClick={() => handleRemovePlayer(roster.id, player.id)}
                                    className="px-3 py-1 text-xs glass border border-nhl-red/50 text-red-300 rounded-lg hover:bg-nhl-red/20 transition-all"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-white/80">No players on this roster yet.</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Score Breakdown Modal */}
        {selectedRosterForScore && (() => {
          const roster = rosters.find((r) => r.id === selectedRosterForScore);
          if (!roster) return null;

          // Calculate total from all players (active + bench + IR)
          // This should match getRosterTotalPoints from backend
          const totalRosterPoints = roster.players?.reduce((sum, p) => sum + (p.totalPoints || 0), 0) || 0;
          const playersWithPoints = (roster.players || [])
            .map((p) => ({
              ...p,
              points: p.totalPoints || 0,
            }))
            .sort((a, b) => b.points - a.points);

          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="glass rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20">
                <div className="p-8">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h2 className="text-3xl font-sport gradient-text-blue mb-2 tracking-wide">
                        {roster.teamName.toUpperCase()}
                      </h2>
                      <p className="text-white/80 font-medium">
                        {roster.league?.name || 'League'}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedRosterForScore(null)}
                      className="w-10 h-10 rounded-full glass border border-white/20 hover:bg-white/10 text-white hover:text-white text-xl font-bold transition-all flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>

                  {/* Total Score */}
                  <div className="mb-8 p-6 bg-gradient-to-br from-nhl-blue via-nhl-blue-light to-nhl-red rounded-2xl shadow-lg">
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
                            {playersWithPoints.map((player) => (
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
      </div>
    </main>
    </ProtectedRoute>
  );
}

