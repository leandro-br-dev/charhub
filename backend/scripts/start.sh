#!/bin/sh
set -e

NODE_ENV=${NODE_ENV:-production}
DEV_TRANSLATION_MODE=${DEV_TRANSLATION_MODE:-auto}
ENABLE_HOT_RELOAD=${ENABLE_HOT_RELOAD:-true}

echo "[entrypoint] Environment: $NODE_ENV"
echo "[entrypoint] Hot reload: $ENABLE_HOT_RELOAD"

# Run database migrations
if [ "$RUN_MIGRATIONS" != "false" ]; then
  echo "[entrypoint] Running database migrations"
  npx prisma migrate deploy

  # Run database seeding after migrations
  echo "[entrypoint] Running database seed"
  npm run db:seed

  if [ $? -eq 0 ]; then
    echo "[entrypoint] ✅ Database seed completed successfully"
  else
    echo "[entrypoint] ❌ Database seed failed"
    echo "[entrypoint] This is a critical error - container will stop"
    exit 1
  fi

  # Rebuild translations after seeding (tags may have changed)
  if [ "$NODE_ENV" = "production" ]; then
    echo "[entrypoint] Rebuilding translations after seed"
    npm run build:translations || {
      echo "[entrypoint] WARNING: Translation build failed (exit code $?)"
      echo "[entrypoint] Continuing with existing translations"
    }
  fi
else
  echo "[entrypoint] Skipping database migrations (RUN_MIGRATIONS=false)"
fi

prepare_translations() {
  echo "[entrypoint] Development mode - preparing translations..."

  if [ "$DEV_TRANSLATION_MODE" = "skip" ]; then
    echo "[entrypoint] DEV_TRANSLATION_MODE=skip - leaving existing translation files untouched"
    return 0
  fi

  translation_status=0

  if [ "$DEV_TRANSLATION_MODE" = "offline" ]; then
    npm run build:translations -- --offline || translation_status=$?
  else
    set +e
    npm run build:translations
    translation_status=$?
    set -e

    if [ $translation_status -ne 0 ]; then
      echo "[entrypoint] Translation build failed with status $translation_status. Falling back to offline mode."
      npm run build:translations -- --offline || translation_status=$?
    fi
  fi

  if [ $translation_status -ne 0 ]; then
    echo "[entrypoint] Unable to prepare translations (status $translation_status)."
    return $translation_status
  fi

  TRANSLATION_COUNT=$(find /app/translations -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
  echo "[entrypoint] Translations ready ($TRANSLATION_COUNT files)"
  return 0
}

# Handle translations based on environment
if [ "$NODE_ENV" = "development" ]; then
  prepare_translations
else
  echo "[entrypoint] Production mode - verifying translations..."
  TRANSLATION_COUNT=$(find /app/translations -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$TRANSLATION_COUNT" -lt 70 ]; then
    echo "[ERROR] Only $TRANSLATION_COUNT translation files found (expected ~70+)"
    echo "[ERROR] Translations should be committed in git before production deploy"
    exit 1
  fi
  echo "[entrypoint] Translations verified ($TRANSLATION_COUNT files)"
fi

# Start application based on environment
echo "[entrypoint] Starting application..."
if [ "$NODE_ENV" = "development" ]; then
  if [ "$ENABLE_HOT_RELOAD" = "false" ]; then
    echo "[entrypoint] Hot reload disabled via ENABLE_HOT_RELOAD=false"
    echo "[entrypoint] Running development server without watcher (tsx)"
    exec ./node_modules/.bin/tsx src/index.ts
  fi

  echo "[entrypoint] Running with hot-reload (ts-node-dev) as root"
  echo "[entrypoint] Note: Running as root in development to access mounted volumes"

  echo "[entrypoint] DEBUG: Checking for src/index.ts..."
  echo "[entrypoint] DEBUG: Current directory: $(pwd)"
  echo "[entrypoint] DEBUG: Node version: $(node --version)"
  echo "[entrypoint] DEBUG: NPM version: $(npm --version)"

  if [ -f "/app/src/index.ts" ]; then
    echo "[entrypoint] DEBUG: [OK] src/index.ts found"
    ls -lh /app/src/index.ts
  else
    echo "[entrypoint] DEBUG: [MISSING] src/index.ts NOT found"
    echo "[entrypoint] DEBUG: Listing /app contents:"
    ls -la /app
    echo "[entrypoint] DEBUG: Listing /app/src contents (if exists):"
    ls -la /app/src 2>/dev/null || echo "Directory /app/src does not exist"
    exit 1
  fi

  echo "[entrypoint] DEBUG: Verifying development environment..."
  echo "[entrypoint] DEBUG: PWD: $(pwd)"
  echo "[entrypoint] DEBUG: Listing /app:"
  ls -la /app
  echo "[entrypoint] DEBUG: Checking tsconfig.json..."
  if [ -f "/app/tsconfig.json" ]; then
    echo "[entrypoint] DEBUG: [OK] tsconfig.json found"
  else
    echo "[entrypoint] DEBUG: [MISSING] tsconfig.json NOT found"
  fi
  echo "[entrypoint] DEBUG: Checking package.json 'dev' script..."
  cat /app/package.json | grep -A 1 '"dev"'

  echo "[entrypoint] DEBUG: Starting development server with ts-node-dev (ignoring translation files)..."
  exec ./node_modules/.bin/ts-node-dev --respawn --ignore-watch translations src/index.ts
else
  echo "[entrypoint] Running production server as user 'nodejs'"
  exec gosu nodejs node dist/index.js
fi
