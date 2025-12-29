import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors and 502/503 (backend down)
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        error.message = 'Request timed out. The server may be busy.';
      } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        error.message = 'Cannot connect to server. Please check if the backend is running.';
      } else {
        error.message = 'Network error. Please try again.';
      }
    } else if (error.response.status === 502 || error.response.status === 503) {
      error.message = 'Backend service is temporarily unavailable. Please try again in a moment.';
    } else if (error.response.status >= 500) {
      error.message = error.response.data?.message || 'Internal server error. Please try again.';
    }
    return Promise.reject(error);
  },
);

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth-storage');
    if (token) {
      try {
        const parsed = JSON.parse(token);
        if (parsed.state?.token) {
          config.headers.Authorization = `Bearer ${parsed.state.token}`;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }
  return config;
});

// Auth API
export const authApi = {
  sendVerification: (email: string) =>
    api.post('/auth/send-verification', { email }),
  verifyEmail: (email: string, code: string) =>
    api.post('/auth/verify-email', { email, code }),
  register: (data: { email: string; password: string; username: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Leagues API
export const leaguesApi = {
  getAll: () => api.get('/leagues'),
  getOne: (id: string) => api.get(`/leagues/${id}`),
  create: (data: any) => api.post('/leagues', data),
  join: (id: string, data: { teamName: string }) =>
    api.post(`/leagues/${id}/join`, data),
  getStandings: (id: string) => api.get(`/leagues/${id}/standings`),
  updateStatus: (id: string, data: { status: 'draft' | 'active' | 'completed' }) =>
    api.patch(`/leagues/${id}/status`, data),
};

// Matchups API
export const matchupsApi = {
  getLeagueMatchups: (leagueId: string) => api.get(`/matchups/league/${leagueId}`),
  getWeekMatchups: (leagueId: string, week: number) => api.get(`/matchups/league/${leagueId}/week/${week}`),
  createWeeklyMatchups: (leagueId: string, week: number) => api.post(`/matchups/league/${leagueId}/week/${week}/create`),
  updateMatchupScores: (leagueId: string, week: number) => api.post(`/matchups/league/${leagueId}/week/${week}/update-scores`),
};

// Waivers API
export const waiversApi = {
  getLeagueWaivers: (leagueId: string) => api.get(`/waivers/league/${leagueId}`),
  claimFromWaivers: (waiverId: string, rosterId: string) => api.post(`/waivers/${waiverId}/claim`, { rosterId }),
};

// Trades API
export const tradesApi = {
  proposeTrade: (data: {
    proposingRosterId: string;
    receivingRosterId: string;
    proposingPlayers: Array<{ nhlPlayerId: number; playerName: string; position: string; nhlTeam: string }>;
    receivingPlayers: Array<{ nhlPlayerId: number; playerName: string; position: string; nhlTeam: string }>;
    message?: string;
  }) => api.post('/trades/propose', data),
  acceptTrade: (tradeId: string) => api.post(`/trades/${tradeId}/accept`),
  rejectTrade: (tradeId: string) => api.post(`/trades/${tradeId}/reject`),
  getLeagueTrades: (leagueId: string) => api.get(`/trades/league/${leagueId}`),
  getRosterTrades: (rosterId: string) => api.get(`/trades/roster/${rosterId}`),
};

// Drafts API
export const draftsApi = {
  getOne: (id: string) => api.get(`/drafts/${id}`),
  create: (data: { leagueId: string }) => api.post('/drafts', data),
  start: (id: string) => api.post(`/drafts/${id}/start`),
  makePick: (id: string, data: any) => api.post(`/drafts/${id}/pick`, data),
};

// NHL API
export const nhlApi = {
  getTeams: () => api.get('/nhl/teams'),
  getRoster: (team: string, season: string) =>
    api.get(`/nhl/roster/${team}/${season}`),
  getSchedule: (team: string, season: string) =>
    api.get(`/nhl/schedule/${team}/${season}`),
  getRecentGames: () => api.get('/nhl/games/recent'),
  getUpcomingGames: () => api.get('/nhl/games/upcoming'),
  getGamesByDate: (date: string) => api.get(`/nhl/games/date/${date}`),
  getGameDetails: (gameId: number) => api.get(`/nhl/games/${gameId}/details`),
};

// Rosters API
export const rostersApi = {
  getMyRosters: () => api.get('/rosters/my-rosters'),
  getOne: (id: string) => api.get(`/rosters/${id}`),
  addPlayer: (rosterId: string, playerData: any) =>
    api.post(`/rosters/${rosterId}/players`, playerData),
  removePlayer: (rosterId: string, playerId: string) =>
    api.delete(`/rosters/${rosterId}/players/${playerId}`),
  updateLineupStatus: (rosterId: string, playerId: string, lineupStatus: 'active' | 'bench' | 'ir') =>
    api.post(`/rosters/${rosterId}/players/${playerId}/lineup`, { lineupStatus }),
  leaveLeague: (rosterId: string) => api.delete(`/rosters/${rosterId}`),
  announceRoster: (rosterId: string) => api.post(`/rosters/${rosterId}/announce`),
  removeTeam: (rosterId: string) => api.delete(`/rosters/${rosterId}/remove`),
  updateSalaries: () => api.post('/rosters/update-salaries'),
};

// Stats API
export const statsApi = {
  getDashboard: () => api.get('/stats/dashboard'),
  getPlayerTrends: (nhlPlayerId: number, days?: number) =>
    api.get(`/stats/player/${nhlPlayerId}/trends`, { params: { days } }),
  getPositionRankings: (position: 'F' | 'D' | 'G', limit?: number) =>
    api.get(`/stats/rankings/${position}`, { params: { limit } }),
  getTransactionTrends: (days?: number) =>
    api.get('/stats/transactions', { params: { days } }),
  getStreaks: (days?: number) =>
    api.get('/stats/streaks', { params: { days } }),
};

// Analytics API
export const analyticsApi = {
  getTeamEfficiency: (rosterId: string) =>
    api.get(`/analytics/team/${rosterId}/efficiency`),
  getTransactionAnalysis: (rosterId: string, days?: number) =>
    api.get(`/analytics/team/${rosterId}/transactions`, { params: { days } }),
  getProjectedStandings: (leagueId: string) =>
    api.get(`/analytics/league/${leagueId}/projections`),
  getPlayerVORP: (nhlPlayerId: number, position: 'F' | 'D' | 'G') =>
    api.get(`/analytics/player/${nhlPlayerId}/vorp`, { params: { position } }),
};

// Chat API
export const chatApi = {
  getMessages: (leagueId: string, limit?: number) =>
    api.get(`/chat/league/${leagueId}`, { params: { limit } }),
  sendMessage: (leagueId: string, message: string, replyToId?: string) =>
    api.post(`/chat/league/${leagueId}`, { message, replyToId }),
  pinMessage: (messageId: string, leagueId: string) =>
    api.post(`/chat/message/${messageId}/pin`, { leagueId }),
  deleteMessage: (messageId: string, leagueId: string) =>
    api.delete(`/chat/message/${messageId}`, { params: { leagueId } }),
};

// Reports API
export const reportsApi = {
  getWeeklyReport: (leagueId: string, weekStart?: string) =>
    api.get(`/reports/league/${leagueId}/weekly`, { params: { weekStart } }),
};

