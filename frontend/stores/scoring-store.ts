import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface ScoringUpdate {
  leagueId: string;
  rosterId: string;
  playerId: number;
  eventType: string;
  points: number;
  totalPoints: number;
}

interface ScoringSummary {
  rosterId: string;
  teamName: string;
  totalPoints: number;
}

interface ScoringStore {
  socket: Socket | null;
  isConnected: boolean;
  summary: ScoringSummary[];
  lastUpdate: ScoringUpdate | null;
  error: string | null;
  isDelayed: boolean;

  connect: (leagueId: string) => void;
  disconnect: () => void;
  joinScoring: (leagueId: string) => void;
  getSummary: (leagueId: string) => void;
}

export const useScoringStore = create<ScoringStore>((set, get) => ({
  socket: null,
  isConnected: false,
  summary: [],
  lastUpdate: null,
  error: null,
  isDelayed: false,

  connect: (leagueId: string) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socket = io(API_URL, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Connected to scoring server');
      set({ isConnected: true, socket, isDelayed: false });
      get().joinScoring(leagueId);
      get().getSummary(leagueId);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from scoring server');
      set({ isConnected: false, isDelayed: true });
    });

    socket.on('scoring:joined', (data) => {
      console.log('Joined scoring room:', data);
    });

    socket.on('scoring:update', (update: ScoringUpdate) => {
      console.log('Scoring update:', update);
      set({ lastUpdate: update, isDelayed: false });
      
      // Update summary
      const { summary } = get();
      const updatedSummary = summary.map((item) =>
        item.rosterId === update.rosterId
          ? { ...item, totalPoints: update.totalPoints }
          : item
      );
      set({ summary: updatedSummary });
    });

    socket.on('scoring:summary', (summary: ScoringSummary[]) => {
      console.log('Scoring summary:', summary);
      set({ summary });
    });

    socket.on('scoring:error', (error) => {
      console.error('Scoring error:', error);
      set({ error: error.message, isDelayed: true });
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, summary: [], isDelayed: false });
    }
  },

  joinScoring: (leagueId: string) => {
    const { socket } = get();
    if (socket) {
      socket.emit('scoring:join', { leagueId });
    }
  },

  getSummary: (leagueId: string) => {
    const { socket } = get();
    if (socket) {
      socket.emit('scoring:get-summary', { leagueId });
    }
  },
}));

