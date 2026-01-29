#!/bin/bash

# Start Development Servers
# This script starts the API and Web applications locally
# Database and Redis are provided by Supabase and Upstash (cloud services)

set -e

echo "🚀 Starting getiickets development environment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Ensure NODE_ENV is set to development for proper dependency installation
export NODE_ENV=development

# Check if .env files exist
if [ ! -f "apps/api/.env" ]; then
    echo -e "${RED}❌ Error: apps/api/.env not found${NC}"
    echo "Please create apps/api/.env with your Supabase and Upstash credentials"
    echo "See SUPABASE_SETUP.md and UPSTASH_SETUP.md for instructions"
    exit 1
fi

if [ ! -f "apps/web/.env.local" ]; then
    echo -e "${YELLOW}⚠️  Warning: apps/web/.env.local not found${NC}"
    echo "Creating default .env.local..."
    cat > apps/web/.env.local << 'EOF'
# API URL
NEXT_PUBLIC_API_URL="http://localhost:3000"

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="pk_test_xxxx"

# App Environment
NEXT_PUBLIC_APP_ENV="development"
EOF
fi

# Check environment variables
echo -e "${GREEN}📋 Checking environment configuration...${NC}"

# Check DATABASE_URL
if grep -q "YOUR-PASSWORD\|PROJECT-ID" apps/api/.env; then
    echo -e "${YELLOW}⚠️  Warning: DATABASE_URL contains placeholders${NC}"
    echo "Please update apps/api/.env with your Supabase credentials"
    echo "See SUPABASE_SETUP.md for instructions"
fi

# Check REDIS_URL
if grep -q "PASSWORD\|ENDPOINT" apps/api/.env; then
    echo -e "${YELLOW}⚠️  Warning: REDIS_URL contains placeholders${NC}"
    echo "Please update apps/api/.env with your Upstash credentials"
    echo "See UPSTASH_SETUP.md for instructions"
fi

echo ""
echo -e "${GREEN}✅ Environment files found${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Error: Node.js version 18+ required${NC}"
    echo "Current version: $(node -v)"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${GREEN}📦 Installing root dependencies...${NC}"
    npm install
fi

if [ ! -d "apps/api/node_modules" ]; then
    echo -e "${GREEN}📦 Installing API dependencies...${NC}"
    cd apps/api && npm install && cd ../..
fi

if [ ! -d "apps/web/node_modules" ]; then
    echo -e "${GREEN}📦 Installing Web dependencies...${NC}"
    cd apps/web && npm install && cd ../..
fi

# Check Prisma Client
if [ ! -d "packages/database/node_modules/.prisma" ]; then
    echo -e "${GREEN}📦 Generating Prisma Client...${NC}"
    cd packages/database && npx prisma generate && cd ../..
fi

echo ""
echo -e "${GREEN}🚀 Starting development servers...${NC}"
echo ""
echo "📡 API Server:    http://localhost:8080"
echo "🌐 Web App:       http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping servers...${NC}"
    kill $API_PID $WEB_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start API server in background
echo -e "${GREEN}▶️  Starting API server...${NC}"
cd apps/api
npm run dev > /tmp/getiickets-api.log 2>&1 &
API_PID=$!
cd ../..

# Wait a bit for API to start
sleep 2

# Start Web server in background
echo -e "${GREEN}▶️  Starting Web server...${NC}"
cd apps/web
npm run dev > /tmp/getiickets-web.log 2>&1 &
WEB_PID=$!
cd ../..

# Wait for servers to be ready
echo ""
echo -e "${GREEN}⏳ Waiting for servers to start...${NC}"
sleep 3

# Check if servers are running
if ps -p $API_PID > /dev/null && ps -p $WEB_PID > /dev/null; then
    echo ""
    echo -e "${GREEN}✅ Development servers started successfully!${NC}"
    echo ""
    echo "📡 API Server:    http://localhost:8080"
    echo "🌐 Web App:       http://localhost:3000"
    echo ""
    echo "📋 Logs:"
    echo "   API: tail -f /tmp/getiickets-api.log"
    echo "   Web: tail -f /tmp/getiickets-web.log"
    echo ""
    echo "Press Ctrl+C to stop all servers"
    echo ""
    
    # Wait for user interrupt
    wait $API_PID $WEB_PID
else
    echo -e "${RED}❌ Error: Failed to start servers${NC}"
    echo ""
    echo "API Logs:"
    tail -20 /tmp/getiickets-api.log
    echo ""
    echo "Web Logs:"
    tail -20 /tmp/getiickets-web.log
    exit 1
fi

