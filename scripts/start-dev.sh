#!/bin/bash

# Start Development (single app: Next.js on port 3000)
# All API routes are served by Next.js; no separate API server.
# Database and Redis are provided by Supabase and Upstash (cloud services).

set -e

echo "🚀 Starting getiickets development environment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Ensure NODE_ENV is set to development
export NODE_ENV=development

# Check if .env.local exists in web app
if [ ! -f "apps/web/.env.local" ]; then
    echo -e "${YELLOW}⚠️  Warning: apps/web/.env.local not found${NC}"
    echo "Creating default .env.local..."
    cat > apps/web/.env.local << 'EOF'
# Database (Supabase or local Postgres)
DATABASE_URL="postgresql://user:password@localhost:5432/tickets"
DIRECT_URL="postgresql://user:password@localhost:5432/tickets"

# Redis (Upstash or local)
REDIS_URL="redis://localhost:6379"

# Auth
JWT_SECRET="your-secret-key-change-in-production"
COOKIE_SECRET="your-cookie-secret-min-32-chars"

# Brevo (email)
BREVO_API_KEY=""

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="pk_test_xxxx"
PAYSTACK_SECRET_KEY="sk_test_xxxx"

# App
NEXT_PUBLIC_APP_ENV="development"
EOF
    echo "Please edit apps/web/.env.local with your credentials."
fi

echo -e "${GREEN}📋 Checking environment configuration...${NC}"
if grep -q "YOUR-PASSWORD\|PROJECT-ID\|your-secret" apps/web/.env.local 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Warning: .env.local may contain placeholders${NC}"
    echo "See SUPABASE_SETUP.md and UPSTASH_SETUP.md for instructions"
fi
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js is not installed${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Error: Node.js 18+ required${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${GREEN}📦 Installing root dependencies...${NC}"
    npm install
fi

if [ ! -d "apps/web/node_modules" ]; then
    echo -e "${GREEN}📦 Installing web dependencies...${NC}"
    cd apps/web && npm install && cd ../..
fi

# Generate Prisma Client (apps/web has its own Prisma)
echo -e "${GREEN}📦 Generating Prisma Client...${NC}"
cd apps/web && npx prisma generate && cd ../..

echo ""
echo -e "${GREEN}🚀 Starting Next.js (single server on port 3000)...${NC}"
echo "🌐 Web + API: http://localhost:3000"
echo "Press Ctrl+C to stop"
echo ""

cd apps/web
exec npm run dev
