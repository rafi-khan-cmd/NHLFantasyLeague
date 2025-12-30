# ⚡ Quick Deploy - Follow These Steps

## ✅ Step 1: Authenticate (Do this first!)

Open your terminal and run these commands. They will open your browser for authentication:

```bash
# Authenticate with Railway
railway login

# Authenticate with Vercel  
vercel login
```

After both are authenticated, continue to Step 2.

---

## 🚂 Step 2: Deploy Backend to Railway

Run this command from the project root:

```bash
cd backend
railway init
```

When prompted:
1. Select **"New Project"**
2. Name it: `nhl-fantasy-backend` (or any name you prefer)
3. Select **"Empty Project"**

Then add services:

```bash
# Add PostgreSQL
railway add postgresql

# Add Redis
railway add redis
```

Now set environment variables. Railway will show you the service names. Use these commands:

```bash
# Generate a secure JWT secret
JWT_SECRET=$(openssl rand -hex 32)

# Set all environment variables
railway variables set DATABASE_URL='${{Postgres.DATABASE_URL}}'
railway variables set REDIS_URL='${{Redis.REDISURL}}'
railway variables set JWT_SECRET="$JWT_SECRET"
railway variables set FRONTEND_URL='http://localhost:3000'  # Update after Vercel deploy
railway variables set PORT='3001'
railway variables set SMTP_HOST='smtp.gmail.com'
railway variables set SMTP_PORT='587'
railway variables set SMTP_USER='your-email@gmail.com'
railway variables set SMTP_PASS='your-app-password'
railway variables set NODE_ENV='production'
```

Deploy:

```bash
railway up
```

**Note your Railway URL** - it will be something like `https://your-backend.up.railway.app`

---

## ⚡ Step 3: Deploy Frontend to Vercel

From the project root:

```bash
cd frontend
vercel
```

When prompted:
1. **Set up and deploy?** → Yes
2. **Which scope?** → Your account
3. **Link to existing project?** → No
4. **What's your project's name?** → `nhl-fantasy-league` (or any name)
5. **In which directory is your code located?** → `./` (current directory)
6. **Want to override settings?** → No

After initial deploy, set the backend URL:

```bash
# Replace with your actual Railway backend URL
vercel env add NEXT_PUBLIC_API_URL production
# When prompted, enter: https://your-backend.up.railway.app
```

Deploy to production:

```bash
vercel --prod
```

**Note your Vercel URL** - it will be something like `https://your-app.vercel.app`

---

## 🔗 Step 4: Link Frontend and Backend

Update Railway's FRONTEND_URL with your Vercel URL:

```bash
cd backend
railway variables set FRONTEND_URL='https://your-app.vercel.app'
```

Replace `https://your-app.vercel.app` with your actual Vercel URL.

---

## ✅ Step 5: Run Database Migrations

```bash
cd backend
railway run npm run migration:run
```

---

## 🎉 Done!

Your app should now be live:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-backend.up.railway.app`

Test it out and add these URLs to your resume!

---

## 🐛 Troubleshooting

**Railway deployment fails?**
- Check logs: `railway logs`
- Verify environment variables: `railway variables`

**Vercel build fails?**
- Check build logs in Vercel dashboard
- Verify `NEXT_PUBLIC_API_URL` is set correctly

**CORS errors?**
- Make sure `FRONTEND_URL` in Railway matches your Vercel URL exactly

**Database connection errors?**
- Verify `DATABASE_URL` is set correctly in Railway
- Check Railway PostgreSQL service is running

