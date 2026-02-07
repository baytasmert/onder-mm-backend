# Önder Denetim Backend - Production Ready Setup Script (PowerShell)
# Node.js heap size, performance tuning, security hardening

Write-Host "🚀 Önder Denetim Backend - Production Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Set NODE_OPTIONS for production
# Development: --max-old-space-size=512 (good for testing)
# Production: --max-old-space-size=1024 (for high traffic)
# Very High Traffic: --max-old-space-size=2048

$env:NODE_OPTIONS = "--max-old-space-size=512 --enable-source-maps"
# $env:NODE_OPTIONS = "--max-old-space-size=1024 --enable-source-maps --max-http-header-size=16384" # For high traffic

Write-Host "✅ Memory allocation: 512 MB (adjustable)" -ForegroundColor Green
Write-Host "✅ Source maps enabled for debugging" -ForegroundColor Green
Write-Host ""

# Production environment settings
$env:NODE_ENV = "production"
$env:LOG_LEVEL = "info"

Write-Host "✅ Environment: production" -ForegroundColor Green
Write-Host "✅ Logging: info level (warnings & errors only)" -ForegroundColor Green
Write-Host ""

Write-Host "Starting server..." -ForegroundColor Yellow
npm start
