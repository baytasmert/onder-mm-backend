# ÖNDER DENETİM Production Verification Script (PowerShell)
# Verify all systems operational before deployment

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  ÖNDER DENETİM Backend - Production Verification      ║" -ForegroundColor Cyan
Write-Host "║  Version: 2.0.0                                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$passCount = 0
$failCount = 0

# Test function
function Test-Item {
    param(
        [string]$Name,
        [bool]$Result
    )
    
    Write-Host -NoNewline "Testing: $Name... "
    if ($Result) {
        Write-Host "✓ PASS" -ForegroundColor Green
        $script:passCount++
    } else {
        Write-Host "✗ FAIL" -ForegroundColor Red
        $script:failCount++
    }
}

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "1. Environment & Dependencies" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

# Check Node.js
$nodeVersion = & node --version 2>$null
if ($LASTEXITCODE -eq 0) {
    $versionNumber = $nodeVersion -replace 'v', ''
    $majorVersion = [int]($versionNumber -split '\.')[0]
    Test-Item "Node.js version >= 18" ($majorVersion -ge 18)
} else {
    Test-Item "Node.js version >= 18" $false
}

# Check npm
$npmVersion = & npm --version 2>$null
Test-Item "npm installed" ($LASTEXITCODE -eq 0)

# Check .env file
$envExists = Test-Path ".env"
Test-Item ".env configuration exists" $envExists

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "2. Application Files" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

# Check critical files
$files = @(
    "server.js",
    "package.json",
    "src/config/index.js",
    "src/services/performanceMonitor.js",
    "src/services/cacheService.js",
    "src/services/mailService.js",
    "src/routes/performance.routes.js",
    "src/routes/admin.routes.js",
    "src/routes/email.routes.js"
)

foreach ($file in $files) {
    $exists = Test-Path $file
    Test-Item "File: $file" $exists
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "3. Documentation" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

# Check documentation
$docs = @(
    "docs/SECURITY_AUDIT.md",
    "docs/PRODUCTION_DEPLOYMENT.md",
    "docs/PERFORMANCE_TESTING_GUIDE.md",
    "docs/API_REFERENCE_COMPLETE.md",
    "docs/GUIDE_INDEX.md",
    "docs/PRODUCTION_READY_SUMMARY.md"
)

foreach ($doc in $docs) {
    $exists = Test-Path $doc
    Test-Item "Doc: $doc" $exists
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "4. Configuration Files" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

# Check config files
$configs = @(
    ".env.example",
    "ecosystem.config.js",
    "jest.config.js",
    "Dockerfile",
    "docker-compose.yml"
)

foreach ($config in $configs) {
    $exists = Test-Path $config
    Test-Item "Config: $config" $exists
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "5. Startup Scripts" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

# Check startup scripts
$psScriptExists = Test-Path "start-production.ps1"
Test-Item "Production startup script (Windows)" $psScriptExists

$bashScriptExists = Test-Path "start-production.sh"
Test-Item "Production startup script (Linux)" $bashScriptExists

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "6. Required Environment Variables" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

# Check .env contains required variables
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    
    $hasNodeEnv = $envContent -match "NODE_ENV"
    Test-Item "NODE_ENV configured" $hasNodeEnv
    
    $hasJwtSecret = $envContent -match "JWT_SECRET"
    Test-Item "JWT_SECRET configured" $hasJwtSecret
    
    $hasPort = $envContent -match "PORT"
    Test-Item "PORT configured" $hasPort
} else {
    Test-Item "NODE_ENV configured" $false
    Test-Item "JWT_SECRET configured" $false
    Test-Item "PORT configured" $false
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "7. Directory Structure" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

# Check required directories
$dirs = @(
    "src",
    "src/routes",
    "src/controllers",
    "src/services",
    "src/middlewares",
    "src/utils",
    "docs",
    "logs",
    "uploads",
    "data",
    "tests"
)

foreach ($dir in $dirs) {
    $exists = Test-Path $dir -PathType Container
    Test-Item "Directory: $dir" $exists
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "8. Summary" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red
$total = $passCount + $failCount
Write-Host "Total: $total"
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  ✅ ALL CHECKS PASSED - READY FOR PRODUCTION           ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Run performance tests: PERFORMANCE_TESTING_GUIDE.md"
    Write-Host "2. Review security: SECURITY_AUDIT.md"
    Write-Host "3. Deploy using: PRODUCTION_DEPLOYMENT.md"
    exit 0
} else {
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║  ⚠️  VERIFICATION ISSUES FOUND - FIX REQUIRED          ║" -ForegroundColor Red
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please fix the failed checks before deploying to production."
    exit 1
}
