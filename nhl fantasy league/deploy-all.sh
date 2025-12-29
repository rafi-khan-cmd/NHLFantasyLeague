#!/bin/bash

set -e

echo "🚀 NHL Fantasy League - Full Deployment Script"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if authenticated
check_railway() {
    if railway whoami &>/dev/null; then
        echo -e "${GREEN}✅ Railway: Authenticated as $(railway whoami)${NC}"
        return 0
    else
        echo -e "${RED}❌ Railway: Not authenticated${NC}"
        echo "   Run: railway login"
        return 1
    fi
}

check_vercel() {
    if vercel whoami &>/dev/null; then
        echo -e "${GREEN}✅ Vercel: Authenticated as $(vercel whoami)${NC}"
        return 0
    else
        echo -e "${RED}❌ Vercel: Not authenticated${NC}"
        echo "   Run: vercel login"
        return 1
    fi
}

# Deploy backend
deploy_backend() {
    echo ""
    echo -e "${BLUE}🚂 Deploying Backend to Railway...${NC}"
    echo ""
    
    cd backend
    
    # Check if already linked
    if [ -f ".railway/railway.toml" ]; then
        echo "✅ Project already linked to Railway"
        PROJECT_LINKED=true
    else
        echo "📦 Creating new Railway project..."
        railway init --name nhl-fantasy-backend || {
            echo -e "${YELLOW}⚠️  Project creation may have failed or project exists${NC}"
            echo "   Trying to link existing project..."
            railway link || {
                echo -e "${RED}❌ Failed to link project. Please create manually in Railway dashboard${NC}"
                return 1
            }
        }
        PROJECT_LINKED=true
    fi
    
    if [ "$PROJECT_LINKED" = true ]; then
        # Add PostgreSQL
        echo ""
        echo "📊 Adding PostgreSQL database..."
        railway add postgresql 2>/dev/null || echo "   PostgreSQL may already exist"
        
        # Add Redis
        echo ""
        echo "🔴 Adding Redis..."
        railway add redis 2>/dev/null || echo "   Redis may already exist"
        
        # Generate JWT secret
        JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "change-this-secret-key-$(date +%s)")
        
        # Set environment variables
        echo ""
        echo "⚙️  Setting environment variables..."
        
        railway variables set DATABASE_URL='${{Postgres.DATABASE_URL}}' 2>/dev/null || true
        railway variables set REDIS_URL='${{Redis.REDISURL}}' 2>/dev/null || true
        railway variables set JWT_SECRET="$JWT_SECRET" 2>/dev/null || true
        railway variables set FRONTEND_URL='http://localhost:3000' 2>/dev/null || true
        railway variables set PORT='3001' 2>/dev/null || true
        railway variables set SMTP_HOST='smtp.gmail.com' 2>/dev/null || true
        railway variables set SMTP_PORT='587' 2>/dev/null || true
        railway variables set SMTP_USER='your-email@gmail.com' 2>/dev/null || true
        railway variables set SMTP_PASS='your-app-password' 2>/dev/null || true
        railway variables set NODE_ENV='production' 2>/dev/null || true
        
        echo ""
        echo "🚀 Deploying backend..."
        railway up
        
        # Get the deployment URL
        echo ""
        echo "📋 Getting deployment URL..."
        BACKEND_URL=$(railway domain 2>/dev/null | grep -o 'https://[^ ]*' | head -1 || echo "")
        
        if [ -z "$BACKEND_URL" ]; then
            echo -e "${YELLOW}⚠️  Could not get backend URL automatically${NC}"
            echo "   Check Railway dashboard for your backend URL"
            echo "   It should look like: https://your-backend.up.railway.app"
            read -p "Enter your Railway backend URL: " BACKEND_URL
        else
            echo -e "${GREEN}✅ Backend URL: $BACKEND_URL${NC}"
        fi
        
        cd ..
        echo ""
        echo -e "${GREEN}✅ Backend deployment initiated!${NC}"
        echo "   URL: $BACKEND_URL"
        echo ""
        
        # Save for frontend deployment
        echo "$BACKEND_URL" > /tmp/railway_backend_url.txt
    fi
}

# Deploy frontend
deploy_frontend() {
    echo ""
    echo -e "${BLUE}⚡ Deploying Frontend to Vercel...${NC}"
    echo ""
    
    cd frontend
    
    # Get backend URL
    if [ -f "/tmp/railway_backend_url.txt" ]; then
        BACKEND_URL=$(cat /tmp/railway_backend_url.txt)
    else
        read -p "Enter your Railway backend URL: " BACKEND_URL
    fi
    
    # Check if already linked
    if [ -f ".vercel/project.json" ]; then
        echo "✅ Project already linked to Vercel"
    else
        echo "📦 Linking to Vercel..."
        echo "nhl-fantasy-league" | vercel link --yes 2>/dev/null || vercel link
    fi
    
    # Set environment variable
    echo ""
    echo "⚙️  Setting NEXT_PUBLIC_API_URL..."
    echo "$BACKEND_URL" | vercel env add NEXT_PUBLIC_API_URL production 2>/dev/null || {
        echo "$BACKEND_URL" | vercel env rm NEXT_PUBLIC_API_URL production --yes 2>/dev/null
        echo "$BACKEND_URL" | vercel env add NEXT_PUBLIC_API_URL production
    }
    
    # Deploy
    echo ""
    echo "🚀 Deploying frontend..."
    vercel --prod --yes
    
    # Get frontend URL
    FRONTEND_URL=$(vercel ls --prod 2>/dev/null | grep -o 'https://[^ ]*' | head -1 || echo "")
    
    if [ -z "$FRONTEND_URL" ]; then
        echo -e "${YELLOW}⚠️  Could not get frontend URL automatically${NC}"
        echo "   Check Vercel dashboard for your frontend URL"
        read -p "Enter your Vercel frontend URL: " FRONTEND_URL
    else
        echo -e "${GREEN}✅ Frontend URL: $FRONTEND_URL${NC}"
    fi
    
    cd ..
    echo ""
    echo -e "${GREEN}✅ Frontend deployment initiated!${NC}"
    echo "   URL: $FRONTEND_URL"
    echo ""
    
    # Update Railway CORS
    if [ -n "$FRONTEND_URL" ]; then
        echo "🔗 Updating Railway CORS settings..."
        cd backend
        railway variables set FRONTEND_URL="$FRONTEND_URL" 2>/dev/null || true
        cd ..
        echo -e "${GREEN}✅ CORS updated!${NC}"
    fi
}

# Run migrations
run_migrations() {
    echo ""
    echo -e "${BLUE}📦 Running database migrations...${NC}"
    echo ""
    
    cd backend
    railway run npm run migration:run || echo -e "${YELLOW}⚠️  Migrations may have failed or already applied${NC}"
    cd ..
}

# Main
main() {
    echo "Checking authentication..."
    echo ""
    
    RAILWAY_OK=false
    VERCEL_OK=false
    
    if check_railway; then
        RAILWAY_OK=true
    fi
    
    if check_vercel; then
        VERCEL_OK=true
    fi
    
    if [ "$RAILWAY_OK" = false ] || [ "$VERCEL_OK" = false ]; then
        echo ""
        echo -e "${RED}❌ Please authenticate first!${NC}"
        echo ""
        echo "Run these commands:"
        [ "$RAILWAY_OK" = false ] && echo "  railway login"
        [ "$VERCEL_OK" = false ] && echo "  vercel login"
        echo ""
        echo "Then run this script again."
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}✅ All authenticated! Starting deployment...${NC}"
    echo ""
    
    read -p "Deploy backend to Railway? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_backend
    fi
    
    echo ""
    read -p "Deploy frontend to Vercel? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_frontend
    fi
    
    echo ""
    read -p "Run database migrations? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_migrations
    fi
    
    echo ""
    echo -e "${GREEN}🎉 Deployment complete!${NC}"
    echo ""
    echo "Your application should be live at:"
    [ -n "$FRONTEND_URL" ] && echo "  Frontend: $FRONTEND_URL"
    [ -n "$BACKEND_URL" ] && echo "  Backend: $BACKEND_URL"
    echo ""
    echo "Add these URLs to your resume! 🚀"
}

main

