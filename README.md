# NHL Fantasy League

A full-stack fantasy hockey platform: create and manage leagues, run a live draft with real-time updates, and score rosters off live NHL play-by-play data. The interesting engineering is on the real-time side — a WebSocket draft room and a scoring pipeline that ingests the unofficial NHL API without double-counting events or hammering the upstream.

## Architecture

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand
- **Backend:** NestJS, TypeScript, WebSockets
- **Data:** PostgreSQL for league data, Redis for caching, rate limiting, and pub/sub
- **Deploy:** Vercel (frontend), Render/Fly.io (backend), Neon/Supabase (Postgres)

## Features

- Live draft room with WebSocket updates and a per-pick timer
- Real-time scoring from NHL play-by-play data
- League management: create, join, and manage rosters
- Trade system
- Caching, rate limiting, and idempotent event handling around the NHL API

## Getting started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose

### Run locally

Start Postgres and Redis:

```bash
docker-compose up -d
```

Backend:

```bash
cd backend
npm install
cp .env.example .env
npm run migration:run
npm run start:dev        # http://localhost:3001
```

Frontend:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev              # http://localhost:3000
```

## NHL API integration

The app reads from the unofficial NHL API (`https://api-web.nhle.com/v1`) and wraps it defensively:

- **Caching** — responses are cached in Redis on a short TTL
- **Rate limiting** — protects against upstream throttling
- **Idempotency** — event IDs are tracked so a goal is never scored twice
- **Graceful fallback** — the UI shows "live updates delayed" when a request fails

Endpoints used include play-by-play (`/gamecenter/{gameId}/play-by-play`), boxscore, team schedules, and rosters. A background job polls active games every few seconds to drive live scoring.

## Project structure

```
backend/          NestJS API
  src/
    nhl/          NHL adapter with caching
    leagues/      league management
    drafts/       draft logic
    scoring/      fantasy scoring
    gateway/      WebSocket gateways (draft, scoring, chat)
frontend/         Next.js app
  app/            App Router pages
  components/     React components
  stores/         Zustand stores
docker-compose.yml
```

More detail lives in [SETUP.md](./SETUP.md), [DEPLOYMENT.md](./DEPLOYMENT.md), and [SCORING_SYSTEM.md](./SCORING_SYSTEM.md).

## REST API

**Leagues** — `GET /leagues`, `GET /leagues/:id`, `POST /leagues`, `POST /leagues/:id/join`, `PATCH /leagues/:id/status`

**Drafts** — `GET /drafts/:id`, `POST /drafts`, `POST /drafts/:id/start`, `POST /drafts/:id/pick`

**NHL data** — `GET /nhl/teams`, `GET /nhl/roster/:team/:season`, `GET /nhl/schedule/:team/:season`, `GET /nhl/play-by-play/:gameId`, `GET /nhl/boxscore/:gameId`

## WebSocket contracts

### Draft gateway (`/draft`)

Client to server: `draft:join`, `draft:leave`, `draft:make-pick`, `draft:get-state`.
Server to client: `draft:joined`, `draft:update`, `draft:pick-made`, `draft:state`, `draft:error`.

A pick payload looks like:

```json
{ "draftId": "uuid", "rosterId": "uuid", "nhlPlayerId": 123, "playerName": "Connor McDavid", "position": "F", "nhlTeam": "EDM" }
```

### Scoring gateway (`/scoring`)

Client to server: `scoring:join`, `scoring:leave`, `scoring:get-summary`.
Server to client: `scoring:joined`, `scoring:update`, `scoring:summary`, `scoring:error`.

A scoring update looks like:

```json
{ "leagueId": "uuid", "rosterId": "uuid", "playerId": 123, "eventType": "goal", "points": 3, "totalPoints": 45.5 }
```

## Database schema

Core tables: `leagues`, `rosters`, `roster_players`, `drafts`, `draft_picks`, `scoring_events`.

Highlights:

- `leagues.settings` is JSONB holding scoring rules and roster sizes; status is one of `draft | active | completed`.
- `roster_players` tracks each player's `position` (`F | D | G`) and `lineupStatus` (`active | bench`).
- `scoring_events` has a unique constraint on `(nhlEventId, nhlPlayerId)` — this is what makes scoring idempotent.

## Key engineering decisions

1. **Defensive NHL API design** — every request is cached, rate-limited, and idempotent.
2. **Redis pub/sub for WebSockets** — lets scoring updates fan out across multiple backend instances.
3. **Event idempotency** — the unique constraint on `(nhlEventId, nhlPlayerId)` prevents double-scoring.
4. **Graceful degradation** — the UI stays usable and flags delays when a socket drops.
5. **Background polling** — a cron job polls active games every few seconds for live scoring.

## Environment variables

Backend (`.env`): `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `REDIS_HOST`, `REDIS_PORT`, `PORT`, `NODE_ENV`, `NHL_API_BASE_URL`, `FRONTEND_URL`.

Frontend (`.env.local`): `NEXT_PUBLIC_API_URL`.

## License

MIT — see [LICENSE](LICENSE).

## Author

Rafiul Alam Khan
[GitHub](https://github.com/rafi-khan-cmd) · [LinkedIn](https://www.linkedin.com/in/rafiul-alam-k-3a20392b0/) · alamkhanrafiul@gmail.com
