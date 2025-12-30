# 🚀 Quick Deploy Instructions

## Step 1: Authenticate (Run these commands manually)

Open your terminal and run:

```bash
# Login to Railway (opens browser)
railway login

# Login to Vercel (opens browser)
vercel login
```

After authentication, come back and I'll continue with deployment.

---

## Step 2: Automated Deployment

Once authenticated, I can deploy everything automatically. The deployment will:

1. **Railway Backend**:
   - Create new project
   - Add PostgreSQL database
   - Add Redis database
   - Configure environment variables
   - Deploy backend

2. **Vercel Frontend**:
   - Create new project
   - Configure environment variables
   - Deploy frontend

3. **Link Everything**:
   - Update CORS settings
   - Connect frontend to backend

---

## Manual Alternative

If you prefer to deploy manually via web UI:

1. **Railway**: Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub → Select `NHLFantasyLeague` → Set root to `backend`
2. **Vercel**: Go to [vercel.com](https://vercel.com) → Add New Project → Import `NHLFantasyLeague` → Set root to `frontend`

See `DEPLOYMENT.md` for detailed instructions.

