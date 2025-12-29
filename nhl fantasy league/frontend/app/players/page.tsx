'use client';

import { useEffect, useState } from 'react';
import { nhlApi, rostersApi } from '@/lib/api';
import ProtectedRoute from '@/components/protected-route';
import { useAuthStore } from '@/stores/auth-store';
import Link from 'next/link';

interface Player {
  playerId: number;
  firstName: string;
  lastName: string;
  position: string;
  jerseyNumber: number;
  team?: string;
  price?: number; // Estimated price in dollars
}

interface Roster {
  id: string;
  teamName: string;
  leagueId: string;
  salaryCap: number;
  totalSalary: number;
  players?: Array<{
    id: string;
    nhlPlayerId: number;
    salary: number;
  }>;
}

export default function PlayersPage() {
  const { user } = useAuthStore();
  const [teams, setTeams] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [selectedRoster, setSelectedRoster] = useState<string>('');
  const [selectedRosterPlayers, setSelectedRosterPlayers] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [season] = useState('20232024'); // Current season

  useEffect(() => {
    loadTeams();
    loadMyRosters();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      loadPlayers(selectedTeam);
    }
  }, [selectedTeam, season]);

  useEffect(() => {
    if (selectedRoster) {
      loadRosterPlayers(selectedRoster);
    } else {
      setSelectedRosterPlayers(new Set());
    }
  }, [selectedRoster]);

  const loadTeams = async () => {
    try {
      const response = await nhlApi.getTeams();
      setTeams(response.data);
      if (response.data.length > 0) {
        setSelectedTeam(response.data[0]);
      }
    } catch (err) {
      console.error('Failed to load teams:', err);
    }
  };

  const loadMyRosters = async () => {
    try {
      const response = await rostersApi.getMyRosters();
      setRosters(response.data);
      if (response.data.length > 0) {
        setSelectedRoster(response.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load rosters:', err);
    }
  };

  const loadRosterPlayers = async (rosterId: string) => {
    try {
      const response = await rostersApi.getOne(rosterId);
      const players = response.data.players || [];
      // Create a Set of NHL player IDs that are already on this roster
      const playerIds = new Set(players.map((p: any) => p.nhlPlayerId));
      setSelectedRosterPlayers(playerIds);
      
      // Update roster info in the list
      setRosters((prev) =>
        prev.map((r) =>
          r.id === rosterId
            ? {
                ...r,
                totalSalary: response.data.totalSalary || 0,
                salaryCap: response.data.salaryCap || 95500000,
                players: players,
              }
            : r,
        ),
      );
    } catch (err) {
      console.error('Failed to load roster players:', err);
      setSelectedRosterPlayers(new Set());
    }
  };

  const loadPlayers = async (team: string) => {
    setLoading(true);
    try {
      const response = await nhlApi.getRoster(team, season);
      // Backend now returns { players: [...] } format
      const playersData = response.data?.players || [];
      setPlayers(Array.isArray(playersData) ? playersData : []);
      console.log('Loaded players:', playersData.length);
    } catch (err) {
      console.error('Failed to load players:', err);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async (player: Player) => {
    if (!selectedRoster) {
      alert('Please select a roster first');
      return;
    }

    try {
      await rostersApi.addPlayer(selectedRoster, {
        nhlPlayerId: player.playerId,
        playerName: `${player.firstName} ${player.lastName}`,
        position: player.position,
        nhlTeam: selectedTeam,
        jerseyNumber: player.jerseyNumber,
      });
      alert(`Added ${player.firstName} ${player.lastName} to roster!`);
      // Refresh both roster players list and rosters list to get updated salary
      await loadRosterPlayers(selectedRoster);
      await loadMyRosters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add player');
    }
  };

  const filteredPlayers = players.filter((player) => {
    const fullName = `${player.firstName} ${player.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

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
          <h1 className="text-4xl md:text-5xl font-sport mb-8 gradient-text-blue tracking-wider text-shadow">
            ADD PLAYERS
          </h1>

          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-sm font-bold mb-3 text-white">Select Roster</label>
              <select
                value={selectedRoster}
                onChange={(e) => setSelectedRoster(e.target.value)}
                className="w-full px-5 py-4 border-2 border-white/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-nhl-blue/50 focus:border-nhl-blue-light text-white bg-white/10 backdrop-blur-sm placeholder:text-white/50 transition-all input-modern"
              >
                <option value="">Select a roster...</option>
                {rosters.map((roster) => {
                  const remaining = (roster.salaryCap || 95500000) - (roster.totalSalary || 0);
                  return (
                    <option key={roster.id} value={roster.id}>
                      {roster.teamName} ({roster.players?.length || 0} players)
                    </option>
                  );
                })}
              </select>
              {selectedRoster && (() => {
                const roster = rosters.find((r) => r.id === selectedRoster);
                if (!roster) return null;
                const cap = roster.salaryCap || 95500000;
                const spent = isNaN(roster.totalSalary) || !isFinite(roster.totalSalary) ? 0 : (roster.totalSalary || 0);
                const remaining = cap - spent;
                const percentage = cap > 0 ? (spent / cap) * 100 : 0;
                return (
                  <div className="mt-3 p-4 glass border border-white/20 rounded-2xl">
                    <div className="mb-3 p-3 glass border border-nhl-blue/50 rounded-xl text-xs text-white/80 space-y-1">
                      <div><strong className="text-white">Roster Requirements:</strong> 16-20 players total (min: 9F, 6D, 2G)</div>
                      <div><strong className="text-white">Active Lineup:</strong> Must have exactly 9F, 6D, 2G active</div>
                      <div><strong className="text-white">Weekly Limits:</strong> Max 4 goalie starts, Max 3 adds/drops per week</div>
                      <div><strong className="text-white">Transaction Deadline:</strong> Sunday | <strong className="text-white">Lineup Deadline:</strong> Game time</div>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-white">Salary Cap Usage</span>
                      <span className="text-sm font-bold text-white">
                        ${(isNaN(spent) || !isFinite(spent) ? 0 : spent / 1000000).toFixed(2)}M / ${(cap / 1000000).toFixed(2)}M
                      </span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-3 mb-2">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          percentage >= 90
                            ? 'bg-nhl-red'
                            : percentage >= 75
                            ? 'bg-yellow-400'
                            : 'bg-green-400'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/80">
                        {percentage.toFixed(1)}% used
                      </span>
                      <span className={`font-semibold ${
                        remaining < 5000000 ? 'text-red-300' : 'text-white'
                      }`}>
                        ${(remaining / 1000000).toFixed(2)}M remaining
                      </span>
                    </div>
                    {selectedRosterPlayers.size > 0 && (
                      <p className="text-xs text-white/80 mt-2">
                        {selectedRosterPlayers.size} player{selectedRosterPlayers.size !== 1 ? 's' : ''} already on roster
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            <div>
              <label className="block text-sm font-bold mb-3 text-white">Select Team</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full px-5 py-4 border-2 border-white/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-nhl-blue/50 focus:border-nhl-blue-light text-white bg-white/10 backdrop-blur-sm placeholder:text-white/50 transition-all input-modern"
              >
                {teams.map((team) => (
                  <option key={team} value={team}>
                    {team.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-3 text-white">Search Players</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name..."
                className="w-full px-5 py-4 border-2 border-white/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-nhl-blue/50 focus:border-nhl-blue-light text-white bg-white/10 backdrop-blur-sm placeholder:text-white/50 transition-all input-modern"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 glass rounded-3xl border border-white/20">
              <p className="text-white/80">Loading players...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlayers.map((player) => {
                const isAlreadyAdded = selectedRosterPlayers.has(player.playerId);
                return (
                  <div
                    key={player.playerId}
                    className={`p-4 glass border rounded-2xl card-hover ${
                      isAlreadyAdded ? 'border-green-400/50 bg-green-500/10' : 'border-white/20 hover:border-nhl-blue-light'
                    }`}
                  >
                    <div className="mb-3">
                      <h3 className="font-semibold text-lg text-white">
                        {player.firstName} {player.lastName}
                      </h3>
                      <p className="text-sm text-white/70">
                        #{player.jerseyNumber} • {player.position} • {selectedTeam.toUpperCase()}
                      </p>
                      <p className="text-lg font-bold text-white mt-2">
                        {player.price ? `$${(player.price / 1000000).toFixed(2)}M` : 'Calculating...'}
                      </p>
                      {isAlreadyAdded && (
                        <p className="text-xs text-green-300 font-medium mt-1">
                          ✓ Already on roster
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddPlayer(player)}
                      disabled={!selectedRoster || isAlreadyAdded}
                      className={`w-full mt-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        isAlreadyAdded
                          ? 'glass border border-white/20 text-white/60 cursor-not-allowed'
                          : 'bg-gradient-to-r from-nhl-blue to-nhl-red text-white hover:from-nhl-blue-light hover:to-nhl-red-light shadow-lg btn-modern glow-nhl'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isAlreadyAdded ? 'Already Added' : 'Add to Roster'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {filteredPlayers.length === 0 && !loading && (
            <div className="text-center py-12 glass rounded-3xl border border-white/20">
              <p className="text-white/80">
                {searchTerm ? 'No players found matching your search' : 'Select a team to view players'}
              </p>
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}

