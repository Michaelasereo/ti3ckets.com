#!/bin/bash

# Supabase Setup Script
# This script helps you set up Supabase for the getiickets platform

set -e

echo "🚀 Supabase Setup for getiickets"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}This script will guide you through setting up Supabase.${NC}"
echo ""
echo "Prerequisites:"
echo "  1. A Supabase account (sign up at https://supabase.com)"
echo "  2. A Supabase project created"
echo "  3. Your database password"
echo ""

read -p "Do you have a Supabase project ready? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Please:"
    echo "  1. Go to https://supabase.com and sign up"
    echo "  2. Create a new project"
    echo "  3. Choose a region closest to your users"
    echo "  4. Save your database password"
    echo "  5. Run this script again"
    exit 1
fi

echo ""
echo -e "${GREEN}Great! Let's get your connection strings.${NC}"
echo ""

# Get project details
read -p "Enter your Supabase Project Reference ID: " PROJECT_REF
read -p "Enter your Supabase Database Password: " -s DB_PASSWORD
echo ""
read -p "Enter your Supabase Region (e.g., ap-southeast-1): " REGION

echo ""
echo -e "${GREEN}📋 Updating environment variables...${NC}"

# Update .env file
ENV_FILE="apps/api/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Creating $ENV_FILE..."
    cp apps/api/.env.example "$ENV_FILE" 2>/dev/null || touch "$ENV_FILE"
fi

# Update DATABASE_URL (pooling URL)
POOLING_URL="postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-${REGION}.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

# Update or add DATABASE_URL
if grep -q "^DATABASE_URL=" "$ENV_FILE"; then
    sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"${POOLING_URL}\"|" "$ENV_FILE"
else
    echo "DATABASE_URL=\"${POOLING_URL}\"" >> "$ENV_FILE"
fi

# Update or add DIRECT_URL
if grep -q "^DIRECT_URL=" "$ENV_FILE"; then
    sed -i '' "s|^DIRECT_URL=.*|DIRECT_URL=\"${DIRECT_URL}\"|" "$ENV_FILE"
else
    echo "DIRECT_URL=\"${DIRECT_URL}\"" >> "$ENV_FILE"
fi

echo ""
echo -e "${GREEN}✅ Environment variables updated!${NC}"
echo ""

# Ask about Prisma migrations
read -p "Do you want to run Prisma migrations now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${GREEN}📦 Running Prisma migrations...${NC}"
    echo ""
    
    cd packages/database
    
    echo "Generating Prisma Client..."
    npx prisma generate
    
    echo ""
    echo "Pushing schema to Supabase..."
    npx prisma db push
    
    cd ../..
    
    echo ""
    echo -e "${GREEN}✅ Database schema created!${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Supabase setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Set up Upstash Redis (see UPSTASH_SETUP.md)"
echo "  2. Update other environment variables in apps/api/.env"
echo "  3. Start development: ./scripts/start-dev.sh"
echo ""
echo "Your Supabase connection strings:"
echo "  DATABASE_URL: ${POOLING_URL}"
echo "  DIRECT_URL: ${DIRECT_URL}"
echo ""
