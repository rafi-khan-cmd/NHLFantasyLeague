#!/bin/bash
# Quick deployment script for backend
cd "$(dirname "$0")/backend"

echo "🚀 Deploying backend to Railway..."

# Commit any changes
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "Deploy: $(date +%Y-%m-%d\ %H:%M:%S)"
fi

# Push to GitHub
git push origin main

# Trigger Railway deployment
railway up --service 828ba360-98f7-4982-a5f1-fdf9ef067bc5

echo "✅ Deployment triggered!"
