# 🚀 Deployment Guide: Vercel + Railway

This guide will help you deploy your NHL Fantasy League application to production.

## 📋 Prerequisites

1. **GitHub Account** - Your code should be in a GitHub repository
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com) (free)
3. **Railway Account** - Sign up at [railway.app](https://railway.app) (free $5 credit/month)

---

## 🎯 Step 1: Prepare Your Repository

### 1.1 Push Your Code to GitHub

```bash
# If not already done, initialize git and push to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 1.2 Create `.env.example` Files (for reference)

**`backend/.env.example`**:
```env
# Database (Railway will provide these)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=nhl_fantasy
DATABASE_PASSWORD=your_password
DATABASE_NAME=nhl_fantasy

# Redis (Railway will provide these)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Frontend URL (will be your Vercel URL)
FRONTEND_URL=http://localhost:3000

# Port
PORT=3001

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**`frontend/.env.local.example`**:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 🚂 Step 2: Deploy Backend to Railway

### 2.1 Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository
5. Select the **`backend`** folder (or set root directory to `backend`)

### 2.2 Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically create a PostgreSQL database
4. Click on the PostgreSQL service
5. Go to **"Variables"** tab
6. Copy these values (you'll need them):
   - `PGHOST`
   - `PGPORT`
   - `PGUSER`
   - `PGPASSWORD`
   - `PGDATABASE`

### 2.3 Add Redis

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add Redis"**
3. Railway will automatically create a Redis instance
4. Click on the Redis service
5. Go to **"Variables"** tab
6. Copy these values:
   - `REDIS_URL` (or `REDISHOST` and `REDISPORT`)

### 2.4 Configure Backend Environment Variables

1. Click on your backend service in Railway
2. Go to **"Variables"** tab
3. Add these environment variables:

**Option A: Using Railway's connection strings (Recommended - Easier)**

```env
# Database (Railway automatically provides DATABASE_URL)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (Railway automatically provides REDIS_URL)
REDIS_URL=${{Redis.REDISURL}}

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string

# Frontend URL (will update after Vercel deployment)
FRONTEND_URL=http://localhost:3000

# Port (Railway sets this automatically)
PORT=3001

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Node Environment
NODE_ENV=production
```

**Option B: Using individual variables**

```env
# Database (from PostgreSQL service)
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_USER=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
DATABASE_NAME=${{Postgres.PGDATABASE}}

# Redis (from Redis service)
REDIS_HOST=${{Redis.REDISHOST}}
REDIS_PORT=${{Redis.REDISPORT}}
REDIS_PASSWORD=${{Redis.REDISPASSWORD}}

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string

# Frontend URL (will update after Vercel deployment)
FRONTEND_URL=http://localhost:3000

# Port (Railway sets this automatically)
PORT=3001

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Node Environment
NODE_ENV=production
```

**Note**: 
- Railway uses `${{ServiceName.VariableName}}` syntax to reference other services
- The code supports both `DATABASE_URL`/`REDIS_URL` (Option A) and individual variables (Option B)
- Option A is simpler and recommended

### 2.5 Deploy Backend

1. Railway will automatically detect the `Dockerfile` and start building
2. Wait for the build to complete (usually 2-5 minutes)
3. Once deployed, Railway will provide a URL like: `https://your-backend.up.railway.app`
4. **Copy this URL** - you'll need it for the frontend

### 2.6 Run Database Migrations

**Option A: Automatic (Recommended)**

The `railway-start.sh` script will run migrations automatically on startup. Make sure Railway uses this script:

1. In Railway, go to your backend service
2. Go to **"Settings"** → **"Deploy"**
3. Set **"Start Command"** to: `sh railway-start.sh`
4. Or add migrations to your Dockerfile CMD

**Option B: Manual via Railway CLI**

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run npm run migration:run
```

**Option C: Via Railway Dashboard**

1. In Railway, click on your backend service
2. Go to **"Deployments"** tab
3. Click on the latest deployment
4. Click **"View Logs"** to see migration output

---

## ⚡ Step 3: Deploy Frontend to Vercel

### 3.1 Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend` (or set it in Vercel settings)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)

### 3.2 Configure Environment Variables

In Vercel project settings, go to **"Environment Variables"** and add:

```env
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
```

**Replace** `https://your-backend.up.railway.app` with your actual Railway backend URL.

### 3.3 Deploy Frontend

1. Click **"Deploy"**
2. Vercel will build and deploy your frontend
3. Once deployed, you'll get a URL like: `https://your-app.vercel.app`
4. **Copy this URL**

### 3.4 Update Backend CORS

1. Go back to Railway
2. Update the backend `FRONTEND_URL` environment variable:
   ```env
   FRONTEND_URL=https://your-app.vercel.app
   ```
3. Railway will automatically redeploy with the new CORS settings

---

## 🔄 Step 4: Update Frontend API URL

After getting your Vercel URL, make sure your frontend's `NEXT_PUBLIC_API_URL` points to your Railway backend URL.

---

## ✅ Step 5: Verify Deployment

### Test Backend

```bash
# Health check
curl https://your-backend.up.railway.app/auth/me

# Should return 401 (unauthorized) - this means backend is working!
```

### Test Frontend

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Try registering a new account
3. Check if email verification works
4. Test creating a league

---

## 🐛 Troubleshooting

### Backend Issues

**Problem**: Backend won't start
- **Solution**: Check Railway logs for errors
- **Common Issue**: Database connection - verify `DATABASE_HOST`, `DATABASE_PORT`, etc.

**Problem**: Database migrations not running
- **Solution**: Run migrations manually via Railway CLI or add to startup script

**Problem**: CORS errors
- **Solution**: Make sure `FRONTEND_URL` in Railway matches your Vercel URL exactly

### Frontend Issues

**Problem**: API calls failing
- **Solution**: Verify `NEXT_PUBLIC_API_URL` in Vercel environment variables

**Problem**: Build fails
- **Solution**: Check build logs in Vercel dashboard

### Database Issues

**Problem**: Tables not created
- **Solution**: Set `NODE_ENV=development` temporarily to enable `synchronize: true`, or run migrations manually

---

## 📝 Important Notes

1. **Never commit `.env` files** - They contain sensitive information
2. **Use Railway's variable references** - `${{ServiceName.VariableName}}` for service connections
3. **Keep JWT_SECRET secure** - Generate a random string for production
4. **Monitor Railway usage** - Free tier has $5/month credit limit
5. **Vercel is free** - But has bandwidth limits (usually fine for portfolio projects)

---

## 🎉 You're Done!

Your application should now be live at:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-backend.up.railway.app`

Add these URLs to your resume! 🚀

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

