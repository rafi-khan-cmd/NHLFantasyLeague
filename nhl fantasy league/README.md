# NHL Fantasy League - Full Stack Application

A portfolio-grade NHL fantasy league application with live draft, real-time scoring, and comprehensive league management.

## Architecture

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Zustand
- **Backend**: NestJS + TypeScript + WebSockets
- **Database**: PostgreSQL (league data) + Redis (caching, rate limiting, pub/sub)
- **Deployment**: Vercel (frontend) + Render/Fly.io (backend) + Neon/Supabase (Postgres)

## Features

- 🏒 Live draft room with WebSocket updates
- 📊 Real-time scoring from NHL play-by-play data
- 👥 League management (create, join, manage rosters)
- 🔄 Trade system
- ⚡ Defensive API design with caching and rate limiting

## Setup

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- npm or yarn

### Quick Start

1. **Start infrastructure services:**
   ```bash
   docker-compose up -d
   ```

2. **Set up backend:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npm run start:dev
   ```

3. **Set up frontend:**
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   npm run dev
   ```

4. **Run database migrations:**
   ```bash
   cd backend
   npm run migration:run
   ```

## NHL API Integration

The application uses unofficial NHL API endpoints with defensive design:

- **Caching**: All NHL responses cached in Redis (short TTL)
- **Rate Limiting**: Prevents API abuse
- **Idempotency**: Event IDs tracked to prevent double-scoring
- **Graceful Fallback**: UI shows "live updates delayed" on failures

### Key Endpoints Used

- `GET /v1/gamecenter/{GAME_ID}/play-by-play` - Live events feed
- `GET /v1/gamecenter/{GAME_ID}/boxscore` - Player/game totals
- `GET /v1/club-schedule-season/{TEAM}/{SEASON}` - Team schedules
- `GET /v1/roster/{TEAM}/{SEASON}` - Team rosters

## Project Structure

```
.
├── backend/          # NestJS API
│   ├── src/
│   │   ├── nhl/     # NHL adapter with caching
│   │   ├── leagues/ # League management
│   │   ├── drafts/  # Draft logic
│   │   ├── scoring/ # Fantasy scoring
│   │   └── gateway/ # WebSocket gateway
├── frontend/        # Next.js app
│   ├── app/         # App Router pages
│   ├── components/  # React components
│   └── stores/      # Zustand stores
└── docker-compose.yml
```

## API Documentation

### REST Endpoints

#### Leagues
- `GET /leagues` - Get all leagues
- `GET /leagues/:id` - Get league details
- `POST /leagues` - Create a new league
- `POST /leagues/:id/join` - Join a league
- `PATCH /leagues/:id/status` - Update league status

#### Drafts
- `GET /drafts/:id` - Get draft state
- `POST /drafts` - Create a draft for a league
- `POST /drafts/:id/start` - Start a draft
- `POST /drafts/:id/pick` - Make a draft pick

#### NHL Data
- `GET /nhl/teams` - Get all NHL teams
- `GET /nhl/roster/:team/:season` - Get team roster
- `GET /nhl/schedule/:team/:season` - Get team schedule
- `GET /nhl/play-by-play/:gameId` - Get play-by-play events
- `GET /nhl/boxscore/:gameId` - Get game boxscore

## WebSocket Message Contracts

### Draft Gateway (`/draft`)

**Client → Server:**
- `draft:join` - Join a draft room
  ```json
  { "leagueId": "uuid" }
  ```
- `draft:leave` - Leave a draft room
  ```json
  { "leagueId": "uuid" }
  ```
- `draft:make-pick` - Make a draft pick
  ```json
  {
    "draftId": "uuid",
    "rosterId": "uuid",
    "nhlPlayerId": 123,
    "playerName": "Connor McDavid",
    "position": "F",
    "nhlTeam": "EDM"
  }
  ```
- `draft:get-state` - Request current draft state
  ```json
  { "draftId": "uuid" }
  ```

**Server → Client:**
- `draft:joined` - Confirmation of joining
- `draft:update` - Draft state update
- `draft:pick-made` - New pick notification
- `draft:state` - Current draft state
- `draft:error` - Error message

### Scoring Gateway (`/scoring`)

**Client → Server:**
- `scoring:join` - Join scoring updates for a league
  ```json
  { "leagueId": "uuid" }
  ```
- `scoring:leave` - Leave scoring updates
- `scoring:get-summary` - Request league scoring summary
  ```json
  { "leagueId": "uuid" }
  ```

**Server → Client:**
- `scoring:joined` - Confirmation of joining
- `scoring:update` - Real-time scoring update
  ```json
  {
    "leagueId": "uuid",
    "rosterId": "uuid",
    "playerId": 123,
    "eventType": "goal",
    "points": 3,
    "totalPoints": 45.5
  }
  ```
- `scoring:summary` - League standings
  ```json
  [
    {
      "rosterId": "uuid",
      "teamName": "Team Name",
      "totalPoints": 45.5
    }
  ]
  ```
- `scoring:error` - Error message

## Database Schema

### Tables

**leagues**
- `id` (UUID, PK)
- `name` (string)
- `description` (text, nullable)
- `commissionerId` (string)
- `maxTeams` (int, default: 12)
- `currentTeams` (int, default: 0)
- `status` (enum: 'draft' | 'active' | 'completed')
- `settings` (JSONB - scoring rules, roster sizes)
- `createdAt`, `updatedAt` (timestamps)

**rosters**
- `id` (UUID, PK)
- `leagueId` (UUID, FK → leagues)
- `teamName` (string)
- `ownerId` (string)
- `createdAt`, `updatedAt` (timestamps)

**roster_players**
- `id` (UUID, PK)
- `rosterId` (UUID, FK → rosters)
- `nhlPlayerId` (int)
- `playerName` (string)
- `position` (string: 'F' | 'D' | 'G')
- `nhlTeam` (string)
- `lineupStatus` (enum: 'active' | 'bench')
- `createdAt` (timestamp)

**drafts**
- `id` (UUID, PK)
- `leagueId` (UUID, FK → leagues)
- `status` (enum: 'pending' | 'in_progress' | 'completed')
- `currentPick` (int)
- `currentTeamId` (UUID, nullable)
- `pickTimeLimitSeconds` (int, default: 60)
- `pickExpiresAt` (timestamp, nullable)
- `createdAt`, `updatedAt` (timestamps)

**draft_picks**
- `id` (UUID, PK)
- `draftId` (UUID, FK → drafts)
- `rosterId` (UUID)
- `pickNumber` (int)
- `nhlPlayerId` (int)
- `playerName` (string)
- `position` (string)
- `nhlTeam` (string)
- `createdAt` (timestamp)

**scoring_events**
- `id` (UUID, PK)
- `nhlEventId` (string, unique with nhlPlayerId)
- `nhlGameId` (int)
- `nhlPlayerId` (int)
- `rosterId` (UUID)
- `leagueId` (UUID)
- `eventType` (string)
- `pointsAwarded` (float)
- `eventData` (JSONB)
- `createdAt` (timestamp)

## Development

- Backend API: http://localhost:3001
- Frontend: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## Production Deployment Notes

### Environment Variables

**Backend (.env):**
```env
DATABASE_HOST=your-postgres-host
DATABASE_PORT=5432
DATABASE_USER=your-user
DATABASE_PASSWORD=your-password
DATABASE_NAME=nhl_fantasy
REDIS_HOST=your-redis-host
REDIS_PORT=6379
PORT=3001
NODE_ENV=production
NHL_API_BASE_URL=https://api-web.nhle.com/v1
FRONTEND_URL=https://your-frontend-domain.com
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

### Key Engineering Decisions

1. **Defensive NHL API Design**: All requests cached, rate-limited, and idempotent
2. **WebSocket Pub/Sub**: Redis pub/sub for scaling across multiple backend instances
3. **Event Idempotency**: Unique constraint on `(nhlEventId, nhlPlayerId)` prevents double-scoring
4. **Graceful Degradation**: UI shows "live updates delayed" when WebSocket disconnects
5. **Background Polling**: Cron job polls active games every 5 seconds for real-time scoring

## License

MIT

