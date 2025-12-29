'use client';

import { useEffect, useState } from 'react';
import { useDraftStore } from '@/stores/draft-store';
import { draftsApi } from '@/lib/api';
import ProtectedRoute from '@/components/protected-route';

export default function DraftPage() {
  const [draftId, setDraftId] = useState<string>('');
  const [leagueId, setLeagueId] = useState<string>('');
  const { draft, isConnected, error, connect, disconnect, makePick, setDraft } = useDraftStore();

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const handleConnect = () => {
    if (leagueId) {
      connect(leagueId);
    }
  };

  const handleLoadDraft = async () => {
    if (!draftId) return;
    try {
      const response = await draftsApi.getOne(draftId);
      setDraft(response.data);
    } catch (err: any) {
      console.error('Failed to load draft:', err);
    }
  };

  const handleMakePick = (player: {
    nhlPlayerId: number;
    playerName: string;
    position: string;
    nhlTeam: string;
  }) => {
    makePick(player);
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Draft Room</h1>

        <div className="mb-6 space-y-4">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="League ID"
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
              className="px-4 py-2 border rounded text-gray-900 bg-white"
            />
            <button
              onClick={handleConnect}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Connect
            </button>
          </div>

          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Draft ID"
              value={draftId}
              onChange={(e) => setDraftId(e.target.value)}
              className="px-4 py-2 border rounded text-gray-900 bg-white"
            />
            <button
              onClick={handleLoadDraft}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Load Draft
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="mb-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>

        {draft && (
          <div className="space-y-6">
            <div className="p-6 border rounded-lg bg-white">
              <h2 className="text-2xl font-semibold mb-4">Draft Status</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-900">Status</div>
                  <div className="text-lg font-semibold">{draft.status}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-900">Current Pick</div>
                  <div className="text-lg font-semibold">{draft.currentPick}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-900">Total Picks</div>
                  <div className="text-lg font-semibold">{draft.picks.length}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-900">Current Team</div>
                  <div className="text-lg font-semibold">
                    {draft.currentTeamId ? 'Team ' + draft.currentTeamId.slice(0, 8) : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border rounded-lg bg-white">
              <h2 className="text-2xl font-semibold mb-4">Draft Picks</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Pick #</th>
                      <th className="text-left p-2">Player</th>
                      <th className="text-left p-2">Position</th>
                      <th className="text-left p-2">Team</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.picks.map((pick) => (
                      <tr key={pick.id} className="border-b">
                        <td className="p-2">{pick.pickNumber}</td>
                        <td className="p-2 text-gray-900">{pick.playerName}</td>
                        <td className="p-2">{pick.position}</td>
                        <td className="p-2">{pick.nhlTeam}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {draft.status === 'in_progress' && (
              <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Make Your Pick</h3>
                <p className="text-gray-900 mb-4">
                  This is a demo. In production, you would have a player search/selection UI here.
                </p>
                <button
                  onClick={() =>
                    handleMakePick({
                      nhlPlayerId: Math.floor(Math.random() * 10000),
                      playerName: 'Demo Player',
                      position: 'F',
                      nhlTeam: 'TOR',
                    })
                  }
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Make Demo Pick
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
    </ProtectedRoute>
  );
}

