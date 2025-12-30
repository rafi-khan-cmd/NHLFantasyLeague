# Setup Guide - Step by Step

Follow these steps to get your NHL Fantasy League application running.

## Step 1: Start Infrastructure Services

Start PostgreSQL and Redis using Docker Compose:

```bash
docker-compose up -d
```

Verify services are running:
```bash
docker-compose ps
```

You should see `postgres` and `redis` containers running.

## Step 2: Set Up Backend

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` file** (optional - defaults should work for local dev):
   ```env
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   DATABASE_USER=nhl_fantasy
   DATABASE_PASSWORD=nhl_fantasy_password
   DATABASE_NAME=nhl_fantasy
   REDIS_HOST=localhost
   REDIS_PORT=6379
   PORT=3001
   NODE_ENV=development
   ```

5. **Run database migrations:**
   ```bash
   npm run migration:run
   ```

   If migrations don't exist yet, the app will auto-create tables in development mode.

6. **Start the backend server:**
   ```bash
   npm run start:dev
   ```

   You should see:
   ```
   🚀 Backend API running on http://localhost:3001
   📡 WebSocket gateway ready
   ```

## Step 3: Set Up Frontend

1. **Open a new terminal** and navigate to frontend:
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env.local
   ```

4. **Edit `.env.local`** (optional - defaults should work):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

5. **Start the frontend:**
   ```bash
   npm run dev
   ```

   You should see:
   ```
   ▲ Next.js 14.0.4
   - Local:        http://localhost:3000
   ```

## Step 4: Verify Everything Works

1. **Open your browser** and go to: http://localhost:3000

2. **Test the API** (optional):
   ```bash
   curl http://localhost:3001/nhl/teams
   ```

3. **Check database connection:**
   - Backend logs should show no connection errors
   - If you see errors, verify Docker containers are running

## Troubleshooting

### Database Connection Issues
- Make sure Docker containers are running: `docker-compose ps`
- Check PostgreSQL is accessible: `docker-compose logs postgres`
- Verify credentials in `.env` match `docker-compose.yml`

### Redis Connection Issues
- Check Redis container is running: `docker-compose logs redis`
- Test connection: `docker-compose exec redis redis-cli ping` (should return `PONG`)

### Port Already in Use
- Backend (3001): Change `PORT` in `backend/.env`
- Frontend (3000): Change port in `frontend/package.json` scripts
- PostgreSQL (5432): Change in `docker-compose.yml`
- Redis (6379): Change in `docker-compose.yml`

### Module Not Found Errors
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- For backend: `cd backend && rm -rf node_modules package-lock.json && npm install`
- For frontend: `cd frontend && rm -rf node_modules package-lock.json && npm install`

## Next Steps

Once everything is running:

1. **Create a test league:**
   - Go to http://localhost:3000/leagues
   - Use the API or create a simple test script

2. **Test WebSocket connections:**
   - Open http://localhost:3000/draft
   - Connect with a league ID
   - Open http://localhost:3000/scores
   - Connect with a league ID

3. **Explore the API:**
   - Visit http://localhost:3001/nhl/teams
   - Try other endpoints from the README

## Development Tips

- **Backend hot reload**: Already enabled with `npm run start:dev`
- **Frontend hot reload**: Already enabled with `npm run dev`
- **View logs**: `docker-compose logs -f` to see all container logs
- **Reset database**: `docker-compose down -v` (⚠️ deletes all data)

