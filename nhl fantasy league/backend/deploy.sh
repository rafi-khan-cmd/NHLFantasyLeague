#!/bin/bash
# Auto-deploy script: Push to git and trigger Railway deployment

echo "🚀 Starting deployment process..."

# Get the service ID from Railway config or use the known one
SERVICE_ID="828ba360-98f7-4982-a5f1-fdf9ef067bc5"

# Push to git (if there are changes)
if [ -n "$(git status --porcelain)" ]; then
  echo "📦 Committing changes..."
  git add -A
  git commit -m "Auto-deploy: $(date +%Y-%m-%d\ %H:%M:%S)" || echo "No changes to commit"
fi

echo "📤 Pushing to GitHub..."
git push origin main

echo "🚂 Triggering Railway deployment..."
railway up --service $SERVICE_ID

echo "✅ Deployment triggered!"
echo "📋 Check status at: https://railway.app/dashboard"
