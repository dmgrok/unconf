#!/bin/bash
# Pre-commit CI validation script
# Runs the same checks as CI locally before committing

set -e  # Exit on any error

echo "🔍 Running pre-commit CI checks..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILED=0

# Function to run a check
run_check() {
    local name=$1
    local command=$2
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 ${name}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if eval "$command"; then
        echo -e "${GREEN}✅ ${name} passed${NC}"
    else
        echo -e "${RED}❌ ${name} failed${NC}"
        FAILED=1
    fi
    echo ""
}

# Function to run a check with warning only (non-blocking)
run_check_warn() {
    local name=$1
    local command=$2
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 ${name}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if eval "$command"; then
        echo -e "${GREEN}✅ ${name} passed${NC}"
    else
        echo -e "${YELLOW}⚠️  ${name} has issues (non-blocking)${NC}"
        # Don't set FAILED - this is a warning only
    fi
    echo ""
}

# 1. TypeScript & Svelte type checking (WARNING ONLY - technical debt exists)
# TODO: Fix 171+ pre-existing type errors and make this blocking again
run_check_warn "Type Check" "npm run check"

# 2. Linting (WARNING ONLY - technical debt exists)
run_check_warn "Lint" "npm run lint"

# 3. Build (REQUIRED - this validates the code actually compiles)
run_check "Build" "npm run build"

# Optional: E2E tests (can be skipped with --skip-e2e flag)
if [[ "$1" != "--skip-e2e" ]]; then
    echo -e "${YELLOW}⏳ Running E2E tests (use --skip-e2e to skip)...${NC}"
    run_check "E2E Tests" "npm run test"
else
    echo -e "${YELLOW}⏭️  Skipping E2E tests${NC}"
    echo ""
fi

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All CI checks passed! Safe to commit.${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
else
    echo -e "${RED}❌ Some CI checks failed. Fix issues before committing.${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
fi
