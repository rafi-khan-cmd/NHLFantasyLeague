#!/bin/bash
# Auto-deploy script: Push to git, deploy backend to Railway, and frontend to Vercel

echo "🚀 Starting full deployment..."

cd "$(dirname "$0")"

# Backend deployment
echo "📦 Deploying backend to Railway..."
cd backend
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "Deploy: $(date +%Y-%m-%d\ %H:%M:%S)" || echo "No changes to commit"
fi
git push origin main
railway up --service 828ba360-98f7-4982-a5f1-fdf9ef067bc5
cd ..

# Frontend deployment
echo "🌐 Deploying frontend to Vercel..."
cd frontend
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "Deploy: $(date +%Y-%m-%d\ %H:%M:%S)" || echo "No changes to commit"
fi
git push origin main
vercel --prod
cd ..

echo "✅ Full deployment complete!"
