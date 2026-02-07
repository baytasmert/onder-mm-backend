#!/bin/bash
# ÖNDER DENETİM Production Verification Script
# Verify all systems operational before deployment

echo "╔════════════════════════════════════════════════════════╗"
echo "║  ÖNDER DENETİM Backend - Production Verification      ║"
echo "║  Version: 2.0.0                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass_count=0
fail_count=0

# Test function
test_item() {
    echo -n "Testing: $1... "
    if [ $2 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((pass_count++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((fail_count++))
    fi
}

echo "═══════════════════════════════════════════════════════"
echo "1. Environment & Dependencies"
echo "═══════════════════════════════════════════════════════"

# Check Node.js
node_version=$(node --version 2>/dev/null | cut -d'v' -f2)
if [[ $node_version =~ ^[0-9]+ ]] && [ ${node_version%.*} -ge 18 ]; then
    test_item "Node.js version >= 18" 0
else
    test_item "Node.js version >= 18" 1
fi

# Check npm
npm_version=$(npm --version 2>/dev/null)
if [[ $npm_version ]]; then
    test_item "npm installed" 0
else
    test_item "npm installed" 1
fi

# Check .env file
if [ -f ".env" ]; then
    test_item ".env configuration exists" 0
else
    test_item ".env configuration exists" 1
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "2. Application Files"
echo "═══════════════════════════════════════════════════════"

# Check critical files
files=(
    "server.js"
    "package.json"
    "src/config/index.js"
    "src/services/performanceMonitor.js"
    "src/services/cacheService.js"
    "src/services/mailService.js"
    "src/routes/performance.routes.js"
    "src/routes/admin.routes.js"
    "src/routes/email.routes.js"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        test_item "File: $file" 0
    else
        test_item "File: $file" 1
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════"
echo "3. Documentation"
echo "═══════════════════════════════════════════════════════"

# Check documentation
docs=(
    "docs/SECURITY_AUDIT.md"
    "docs/PRODUCTION_DEPLOYMENT.md"
    "docs/PERFORMANCE_TESTING_GUIDE.md"
    "docs/API_REFERENCE_COMPLETE.md"
    "docs/GUIDE_INDEX.md"
    "docs/PRODUCTION_READY_SUMMARY.md"
)

for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        test_item "Doc: $doc" 0
    else
        test_item "Doc: $doc" 1
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════"
echo "4. Configuration Files"
echo "═══════════════════════════════════════════════════════"

# Check config files
configs=(
    ".env.example"
    "jest.config.js"
    "Dockerfile"
    "docker-compose.yml"
)

for config in "${configs[@]}"; do
    if [ -f "$config" ]; then
        test_item "Config: $config" 0
    else
        test_item "Config: $config" 1
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════"
echo "5. Startup Scripts"
echo "═══════════════════════════════════════════════════════"

# Check startup scripts
if [ -f "scripts/start-production.sh" ]; then
    test_item "Production startup script (Linux)" 0
else
    test_item "Production startup script (Linux)" 1
fi

if [ -f "scripts/start-production.ps1" ]; then
    test_item "Production startup script (Windows)" 0
else
    test_item "Production startup script (Windows)" 1
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "6. Required Environment Variables"
echo "═══════════════════════════════════════════════════════"

# Check .env contains required variables
if grep -q "NODE_ENV" .env 2>/dev/null; then
    test_item "NODE_ENV configured" 0
else
    test_item "NODE_ENV configured" 1
fi

if grep -q "JWT_SECRET" .env 2>/dev/null; then
    test_item "JWT_SECRET configured" 0
else
    test_item "JWT_SECRET configured" 1
fi

if grep -q "PORT" .env 2>/dev/null; then
    test_item "PORT configured" 0
else
    test_item "PORT configured" 1
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "7. Directory Structure"
echo "═══════════════════════════════════════════════════════"

# Check required directories
dirs=(
    "src"
    "src/routes"
    "src/controllers"
    "src/services"
    "src/middlewares"
    "src/utils"
    "scripts"
    "docs"
    "logs"
    "uploads"
    "data"
    "tests"
)

for dir in "${dirs[@]}"; do
    if [ -d "$dir" ]; then
        test_item "Directory: $dir" 0
    else
        test_item "Directory: $dir" 1
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════"
echo "8. Summary"
echo "═══════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}Passed: $pass_count${NC}"
echo -e "${RED}Failed: $fail_count${NC}"
total=$((pass_count + fail_count))
echo "Total: $total"
echo ""

if [ $fail_count -eq 0 ]; then
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║  ✅ ALL CHECKS PASSED - READY FOR PRODUCTION           ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo ""
    echo "Next steps:"
    echo "1. Run performance tests: PERFORMANCE_TESTING_GUIDE.md"
    echo "2. Review security: SECURITY_AUDIT.md"
    echo "3. Deploy using: PRODUCTION_DEPLOYMENT.md"
    exit 0
else
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║  ⚠️  VERIFICATION ISSUES FOUND - FIX REQUIRED          ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo ""
    echo "Please fix the failed checks before deploying to production."
    exit 1
fi
