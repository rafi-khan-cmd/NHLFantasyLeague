# 🚀 Quick Deployment Checklist

## ✅ Pre-Deployment Checklist

- [ ] Code is pushed to GitHub
- [ ] `.env` files are NOT committed (already in `.gitignore`)
- [ ] All features tested locally
- [ ] Database migrations are ready

## 🚂 Railway (Backend) Setup

1. **Sign up**: [railway.app](https://railway.app) (GitHub login)
2. **Create Project**: New Project → Deploy from GitHub
3. **Add Services**:
   - PostgreSQL database
   - Redis database
4. **Configure Environment Variables** (see `DEPLOYMENT.md`)
5. **Deploy**: Railway auto-detects Dockerfile

## ⚡ Vercel (Frontend) Setup

1. **Sign up**: [vercel.com](https://vercel.com) (GitHub login)
2. **Import Project**: Add New Project → Import GitHub repo
3. **Configure**:
   - Root Directory: `frontend`
   - Framework: Next.js (auto-detected)
4. **Add Environment Variable**:
   - `NEXT_PUBLIC_API_URL` = Your Railway backend URL
5. **Deploy**: Click Deploy

## 🔗 Update CORS

After Vercel deployment, update Railway backend:
- `FRONTEND_URL` = Your Vercel frontend URL

## 📝 Your URLs

- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-backend.up.railway.app`

Add these to your resume! 🎉

---

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

