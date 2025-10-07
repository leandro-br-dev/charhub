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

# Start the application
echo "🎉 Starting application..."
exec node dist/index.js
