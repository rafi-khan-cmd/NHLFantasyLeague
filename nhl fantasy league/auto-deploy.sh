#!/bin/bash

set -e

echo "🚀 NHL Fantasy League Auto-Deployment"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check authentication
check_auth() {
    if ! railway whoami &>/dev/null; then
        echo -e "${RED}❌ Railway: Not authenticated${NC}"
        echo "   Run: railway login"
        return 1
    fi
    echo -e "${GREEN}✅ Railway: Authenticated as $(railway whoami)${NC}"
    
    if ! vercel whoami &>/dev/null; then
        echo -e "${RED}❌ Vercel: Not authenticated${NC}"
        echo "   Run: vercel login"
        return 1
    fi
    echo -e "${GREEN}✅ Vercel: Authenticated as $(vercel whoami)${NC}"
    return 0
}

# Deploy to Railway
deploy_railway() {
    echo ""
    echo -e "${BLUE}🚂 Deploying Backend to Railway...${NC}"
    echo ""
    
    cd backend
    
    # Check if already linked
    if [ -f ".railway/railway.toml" ]; then
        echo "Project already linked to Railway"
    else
        echo "Linking to Railway..."
        echo "Please select 'New Project' when prompted"
        railway link
    fi
    
    # Add PostgreSQL
    echo ""
    echo "Adding PostgreSQL database..."
    railway add postgresql || echo "PostgreSQL may already exist"
    
    # Add Redis
    echo ""
    echo "Adding Redis..."
    railway add redis || echo "Redis may already exist"
    
    # Set environment variables
    echo ""
    echo "Setting environment variables..."
    
    # Get service names (user will need to update these)
    echo -e "${YELLOW}⚠️  You'll need to set these environment variables in Railway dashboard:${NC}"
    echo ""
    echo "DATABASE_URL=\${{Postgres.DATABASE_URL}}"
    echo "REDIS_URL=\${{Redis.REDISURL}}"
    echo "JWT_SECRET=$(openssl rand -hex 32)"
    echo "FRONTEND_URL=https://your-app.vercel.app (update after Vercel deploy)"
    echo "PORT=3001"
    echo "SMTP_HOST=smtp.gmail.com"
    echo "SMTP_PORT=587"
    echo "SMTP_USER=your-email@gmail.com"
    echo "SMTP_PASS=your-app-password"
    echo "NODE_ENV=production"
    echo ""
    
    # Deploy
    echo "Deploying..."
    railway up
    
    cd ..
    
    echo ""
    echo -e "${GREEN}✅ Railway deployment initiated!${NC}"
    echo "   Check Railway dashboard for deployment status"
    echo ""
}

# Deploy to Vercel
deploy_vercel() {
    echo ""
    echo -e "${BLUE}⚡ Deploying Frontend to Vercel...${NC}"
    echo ""
    
    cd frontend
    
    # Check if already linked
    if [ -f ".vercel/project.json" ]; then
        echo "Project already linked to Vercel"
    else
        echo "Linking to Vercel..."
        vercel link
    fi
    
    # Get Railway backend URL
    echo ""
    echo -e "${YELLOW}⚠️  Enter your Railway backend URL (e.g., https://your-backend.up.railway.app):${NC}"
    read -p "Backend URL: " BACKEND_URL
    
    # Set environment variable
    vercel env add NEXT_PUBLIC_API_URL production <<< "$BACKEND_URL" || \
    vercel env rm NEXT_PUBLIC_API_URL production --yes && \
    vercel env add NEXT_PUBLIC_API_URL production <<< "$BACKEND_URL"
    
    # Deploy
    echo ""
    echo "Deploying..."
    vercel --prod
    
    cd ..
    
    echo ""
    echo -e "${GREEN}✅ Vercel deployment initiated!${NC}"
    echo "   Check Vercel dashboard for deployment status"
    echo ""
}

# Main
main() {
    if ! check_auth; then
        echo ""
        echo -e "${RED}❌ Please authenticate first!${NC}"
        exit 1
    fi
    
    echo ""
    read -p "Deploy backend to Railway? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_railway
    fi
    
    echo ""
    read -p "Deploy frontend to Vercel? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_vercel
    fi
    
    echo ""
    echo -e "${GREEN}🎉 Deployment process started!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Update Railway FRONTEND_URL with your Vercel URL"
    echo "2. Wait for deployments to complete"
    echo "3. Test your application!"
    echo ""
}

main

