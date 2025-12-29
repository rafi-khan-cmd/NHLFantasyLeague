#!/bin/bash
# Quick frontend deployment script
cd "$(dirname "$0")"

echo "🌐 Deploying frontend to Vercel..."

# Commit any changes
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "Deploy frontend: $(date +%Y-%m-%d\ %H:%M:%S)"
fi

# Push to GitHub
git push origin main

# Deploy to Vercel
vercel --prod

echo "✅ Frontend deployment triggered!"
