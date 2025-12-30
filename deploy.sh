#!/bin/bash

echo "🚀 NHL Fantasy League Deployment Script"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if logged in
echo "📋 Step 1: Checking authentication..."
echo ""

if railway whoami &>/dev/null; then
    echo -e "${GREEN}✅ Railway: Already logged in${NC}"
    RAILWAY_LOGGED_IN=true
else
    echo -e "${YELLOW}⚠️  Railway: Not logged in${NC}"
    echo "   Please run: railway login"
    RAILWAY_LOGGED_IN=false
fi

if vercel whoami &>/dev/null; then
    echo -e "${GREEN}✅ Vercel: Already logged in${NC}"
    VERCEL_LOGGED_IN=true
else
    echo -e "${YELLOW}⚠️  Vercel: Not logged in${NC}"
    echo "   Please run: vercel login"
    VERCEL_LOGGED_IN=false
fi

echo ""
echo "=========================================="
echo ""

if [ "$RAILWAY_LOGGED_IN" = true ] && [ "$VERCEL_LOGGED_IN" = true ]; then
    echo -e "${GREEN}✅ Ready to deploy!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Deploy backend to Railway"
    echo "2. Deploy frontend to Vercel"
    echo "3. Configure environment variables"
else
    echo -e "${YELLOW}⚠️  Please authenticate first:${NC}"
    if [ "$RAILWAY_LOGGED_IN" = false ]; then
        echo "   railway login"
    fi
    if [ "$VERCEL_LOGGED_IN" = false ]; then
        echo "   vercel login"
    fi
fi

