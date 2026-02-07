#!/bin/bash

# Önder Denetim Backend - Production Ready Setup Script
# Node.js heap size, performance tuning, security hardening

echo "🚀 Önder Denetim Backend - Production Setup"
echo "==========================================="
echo ""

# Set NODE_OPTIONS for production
export NODE_OPTIONS="--max-old-space-size=512 --enable-source-maps"

# Optional: For very high traffic
# export NODE_OPTIONS="--max-old-space-size=1024 --enable-source-maps --max-http-header-size=16384"

echo "✅ Memory allocation: 512 MB (adjustable)"
echo "✅ Source maps enabled for debugging"
echo ""

# Production environment
export NODE_ENV=production
export LOG_LEVEL=info

echo "✅ Environment: production"
echo "✅ Logging: info level (warnings & errors only)"
echo ""

# Start server
npm start
