# NHL Fantasy Scoring System

## How Scoring Works

The scoring system automatically processes real NHL games every day and calculates fantasy points based on player performance.

### Daily Game Discovery

1. **Automatic Discovery**: Every hour, the system discovers today's NHL games by:
   - Checking each NHL team's schedule for the current season
   - Finding games scheduled for today
   - Adding active games (LIVE, IN_PROGRESS, PREVIEW) to the polling list

2. **Season Detection**: Automatically determines the current NHL season:
   - October-December: Uses current year to next year (e.g., 2023-2024)
   - January-September: Uses previous year to current year (e.g., 2023-2024)

### Real-Time Scoring Process

1. **Play-by-Play Polling**:
   - Polls active games every 10 seconds
   - Fetches play-by-play events from NHL API: `/v1/gamecenter/{GAME_ID}/play-by-play`
   - Processes each event (goals, assists, shots, hits, blocks, penalties)

2. **Event Processing**:
   - Checks for idempotency (prevents double-scoring)
   - Only awards points to players in **active lineup** (not bench)
   - Calculates points based on league scoring settings
   - Creates scoring events in database
   - Publishes real-time updates via WebSocket

3. **Scoring Points** (default, customizable per league):
   - **Goal**: 3 points
   - **Assist**: 2 points
   - **Shot**: 0.5 points
   - **Hit**: 0.5 points
   - **Block**: 0.5 points
   - **Penalty Minute (PIM)**: 0.25 points
   - **Plus/Minus**: 0.5 points

### End-of-Game Reconciliation

1. **Boxscore Processing**:
   - Every 5 minutes, processes finished games
   - Fetches boxscore from NHL API: `/v1/gamecenter/{GAME_ID}/boxscore`
   - Reconciles all player stats (goals, assists, shots, hits, blocks, PIM, +/-)
   - Ensures no stats are missed even if play-by-play had gaps

2. **Why Reconciliation?**:
   - Play-by-play may miss some events
   - Boxscore provides complete, official stats
   - Ensures accuracy of final scores

### Scoring Flow

```
Daily Schedule Check (Every Hour)
  ↓
Discover Today's Games
  ↓
Add Active Games to Poller
  ↓
Poll Play-by-Play (Every 10 seconds)
  ↓
Process Events → Calculate Points → Store in DB → Push via WebSocket
  ↓
Game Finishes → Boxscore Reconciliation (Every 5 minutes)
  ↓
Final Score Calculated
```

### Key Features

- **Idempotency**: Event IDs tracked to prevent double-scoring
- **Real-Time**: Updates pushed via WebSocket as events happen
- **Accurate**: Boxscore reconciliation ensures completeness
- **Defensive**: Caching, rate limiting, graceful fallbacks
- **League-Specific**: Each league can have custom scoring settings

### API Endpoints Used

- `GET /v1/gamecenter/{GAME_ID}/play-by-play` - Live events (polled every 10s)
- `GET /v1/gamecenter/{GAME_ID}/boxscore` - Final stats (every 5 min for finished games)
- `GET /v1/club-schedule-season/{TEAM}/{SEASON}` - Team schedules (hourly)

### Database Storage

All scoring events are stored in `scoring_events` table with:
- Event ID (for idempotency)
- Game ID
- Player ID
- Roster ID
- League ID
- Event type
- Points awarded
- Event metadata (period, time, description)

### WebSocket Updates

Real-time scoring updates are pushed to clients via Redis pub/sub:
- League ID
- Roster ID
- Player ID
- Event type
- Points awarded
- Total roster points

