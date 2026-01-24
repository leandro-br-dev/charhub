#!/bin/sh
set -e

echo "🚀 Starting backend initialization..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
until node -e "require('net').createConnection({host:'postgres',port:5432}).on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" 2>/dev/null; do
  sleep 1
done
echo "✅ PostgreSQL is ready!"

# Run database migrations
echo "📊 Running database migrations..."
npx prisma migrate deploy

echo "✅ Migrations completed!"

# Run database seeds (critical data like LLM pricing)
echo "🌱 Running database seeds..."
npx tsx src/scripts/seed.ts || echo "⚠️  Seeds failed or already populated"

# Run Style + Themes seed (FEATURE-014)
echo "🎨 Running Style + Themes seed..."
npx tsx prisma/seed-style-themes.ts || echo "⚠️  Style + Themes seed failed"

echo "✅ Seeds completed!"

# Start the application
echo "🎉 Starting application..."
exec node dist/index.js
