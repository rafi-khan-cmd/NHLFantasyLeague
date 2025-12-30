import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface DraftPick {
  id: string;
  pickNumber: number;
  nhlPlayerId: number;
  playerName: string;
  position: string;
  nhlTeam: string;
  rosterId: string;
}

interface Draft {
  id: string;
  leagueId: string;
  status: 'pending' | 'in_progress' | 'completed';
  currentPick: number;
  currentTeamId: string | null;
  pickExpiresAt: string | null;
  picks: DraftPick[];
}

interface DraftStore {
  socket: Socket | null;
  draft: Draft | null;
  isConnected: boolean;
  error: string | null;
  
  connect: (leagueId: string) => void;
  disconnect: () => void;
  joinDraft: (leagueId: string) => void;
  makePick: (pickData: {
    nhlPlayerId: number;
    playerName: string;
    position: string;
    nhlTeam: string;
  }) => void;
  setDraft: (draft: Draft) => void;
}

export const useDraftStore = create<DraftStore>((set, get) => ({
  socket: null,
  draft: null,
  isConnected: false,
  error: null,

  connect: (leagueId: string) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socket = io(API_URL, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Connected to draft server');
      set({ isConnected: true, socket });
      get().joinDraft(leagueId);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from draft server');
      set({ isConnected: false });
    });

    socket.on('draft:joined', (data) => {
      console.log('Joined draft room:', data);
    });

    socket.on('draft:update', (data) => {
      console.log('Draft update:', data);
      if (data.draft) {
        set({ draft: data.draft });
      }
    });

    socket.on('draft:pick-made', (data) => {
      console.log('Pick made:', data);
      if (data.draft) {
        set({ draft: data.draft });
      }
    });

    socket.on('draft:state', (draft) => {
      console.log('Draft state:', draft);
      set({ draft });
    });

    socket.on('draft:error', (error) => {
      console.error('Draft error:', error);
      set({ error: error.message });
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, draft: null });
    }
  },

  joinDraft: (leagueId: string) => {
    const { socket } = get();
    if (socket) {
      socket.emit('draft:join', { leagueId });
    }
  },

  makePick: (pickData) => {
    const { socket, draft } = get();
    if (!socket || !draft) {
      set({ error: 'Not connected to draft' });
      return;
    }

    socket.emit('draft:make-pick', {
      draftId: draft.id,
      rosterId: draft.currentTeamId,
      ...pickData,
    });
  },

  setDraft: (draft) => {
    set({ draft });
  },
}));

