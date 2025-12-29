#!/bin/sh
# Railway startup script
# This runs migrations before starting the app

echo "🚀 Starting NHL Fantasy League Backend..."

# Run database migrations
echo "📦 Running database migrations..."
node run-migrations.js || echo "⚠️  Migrations failed or already applied"

# Start the application
echo "🎯 Starting NestJS application..."
npm run start:prod

