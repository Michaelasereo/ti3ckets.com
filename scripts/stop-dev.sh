#!/bin/bash

# Stop Development Servers
# This script stops all running Node.js development servers

set -e

echo "🛑 Stopping getiickets development servers..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Find and kill Node.js processes
API_PID=$(lsof -ti:3000 2>/dev/null || true)
WEB_PID=$(lsof -ti:3001 2>/dev/null || true)

# Kill API server
if [ ! -z "$API_PID" ]; then
    echo -e "${GREEN}🛑 Stopping API server (PID: $API_PID)...${NC}"
    kill $API_PID 2>/dev/null || true
    sleep 1
    # Force kill if still running
    if ps -p $API_PID > /dev/null 2>&1; then
        kill -9 $API_PID 2>/dev/null || true
    fi
else
    echo -e "${YELLOW}⚠️  No API server running on port 3000${NC}"
fi

# Kill Web server
if [ ! -z "$WEB_PID" ]; then
    echo -e "${GREEN}🛑 Stopping Web server (PID: $WEB_PID)...${NC}"
    kill $WEB_PID 2>/dev/null || true
    sleep 1
    # Force kill if still running
    if ps -p $WEB_PID > /dev/null 2>&1; then
        kill -9 $WEB_PID 2>/dev/null || true
    fi
else
    echo -e "${YELLOW}⚠️  No Web server running on port 3001${NC}"
fi

# Kill any remaining Node.js processes related to getiickets
echo -e "${GREEN}🧹 Cleaning up any remaining processes...${NC}"
pkill -f "getiickets" 2>/dev/null || true
pkill -f "apps/api" 2>/dev/null || true
pkill -f "apps/web" 2>/dev/null || true

# Clean up log files
if [ -f "/tmp/getiickets-api.log" ]; then
    rm /tmp/getiickets-api.log
fi

if [ -f "/tmp/getiickets-web.log" ]; then
    rm /tmp/getiickets-web.log
fi

echo ""
echo -e "${GREEN}✅ All servers stopped${NC}"
echo ""
