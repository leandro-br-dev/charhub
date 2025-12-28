#!/bin/bash
set -e

# ci-local.sh - Replicate GitHub Actions CI environment locally
# This script runs the EXACT same checks as .github/workflows/backend-ci.yml
# Use this to catch CI failures before pushing to main

echo "========================================"
echo "Backend CI Local Validation"
echo "========================================"
echo ""

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
FAILED=0

echo -e "${YELLOW}Step 1/5: Clean install dependencies (npm ci)${NC}"
echo "This matches CI's deterministic dependency installation"
npm ci
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Dependencies installed${NC}"
else
  echo -e "${RED}✗ npm ci failed${NC}"
  FAILED=1
fi
echo ""

echo -e "${YELLOW}Step 2/5: Run ESLint${NC}"
echo "This is run SEPARATELY in CI (not part of npm test)"
npm run lint
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Linting passed${NC}"
else
  echo -e "${RED}✗ Linting failed${NC}"
  FAILED=1
fi
echo ""

echo -e "${YELLOW}Step 3/5: TypeScript type checking${NC}"
npx tsc --noEmit
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Type checking passed${NC}"
else
  echo -e "${RED}✗ Type checking failed${NC}"
  FAILED=1
fi
echo ""

echo -e "${YELLOW}Step 4/5: Run tests${NC}"
echo "Note: CI uses PostgreSQL and Redis services"
echo "Make sure docker compose is running: docker compose up -d"
npm test
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Tests passed${NC}"
else
  echo -e "${RED}✗ Tests failed${NC}"
  FAILED=1
fi
echo ""

echo -e "${YELLOW}Step 5/5: Build production bundle${NC}"
npm run build
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Build successful${NC}"
else
  echo -e "${RED}✗ Build failed${NC}"
  FAILED=1
fi
echo ""

echo "========================================"
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ ALL CHECKS PASSED${NC}"
  echo "This code is ready for CI"
  exit 0
else
  echo -e "${RED}✗ SOME CHECKS FAILED${NC}"
  echo "Fix the errors above before pushing"
  exit 1
fi
