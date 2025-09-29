#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🚀 QueenOne ProductPrototype Development Server${NC}"
echo -e "${PURPLE}================================================${NC}"

# Check Docker status and start if needed
echo -e "${YELLOW}🐳 Checking Docker status...${NC}"
if ! docker version >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker is not running. Starting Docker Desktop...${NC}"
    open /Applications/Docker.app
    
    # Wait for Docker to start
    echo -e "${YELLOW}⏳ Waiting for Docker to start...${NC}"
    for i in {1..30}; do
        if docker version >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Docker is now running${NC}"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    if ! docker version >/dev/null 2>&1; then
        echo -e "${RED}❌ Failed to start Docker. Please start Docker Desktop manually${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Docker is running${NC}"
fi

# Check PostgreSQL container and start if needed
echo -e "${YELLOW}🗄️  Checking PostgreSQL container...${NC}"
if ! docker ps | grep -q "queenone-postgres"; then
    echo -e "${YELLOW}🚀 Starting PostgreSQL container...${NC}"
    npm run docker:up
    
    # Wait for PostgreSQL to be ready
    echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
    for i in {1..15}; do
        if PGPASSWORD=postgres123 psql -h localhost -p 5433 -U postgres -d queenone_dev -c "SELECT 1;" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    if ! PGPASSWORD=postgres123 psql -h localhost -p 5433 -U postgres -d queenone_dev -c "SELECT 1;" >/dev/null 2>&1; then
        echo -e "${RED}❌ PostgreSQL failed to start properly${NC}"
        echo -e "${YELLOW}💡 Try running: npm run docker:reset${NC}"
    fi
else
    echo -e "${GREEN}✅ PostgreSQL container is running${NC}"
fi

# Check if port 5000 is in use and kill the process
echo -e "${YELLOW}🔍 Checking for existing processes on port 5000...${NC}"
PIDS=$(lsof -ti:5000)

if [ ! -z "$PIDS" ]; then
    echo -e "${YELLOW}⚡ Found process(es) using port 5000: $PIDS${NC}"
    echo -e "${YELLOW}   Killing them...${NC}"
    for PID in $PIDS; do
        kill -9 $PID 2>/dev/null
    done
    sleep 2
    echo -e "${GREEN}✅ Process(es) killed successfully${NC}"
else
    echo -e "${GREEN}✅ Port 5000 is available${NC}"
fi

echo ""
echo -e "${CYAN}🔐 Login Credentials:${NC}"
echo -e "${CYAN}   Email:    ${GREEN}dev@localhost${NC}"
echo -e "${CYAN}   Password: ${GREEN}Dragonunicorn!${NC}"
echo ""
echo -e "${CYAN}🌐 Development URLs:${NC}"
echo -e "${CYAN}   Frontend: ${GREEN}http://localhost:5000${NC}"
echo -e "${CYAN}   API:      ${GREEN}http://localhost:5000/api${NC}"
echo ""
echo -e "${CYAN}📊 Available Data:${NC}"
echo -e "${CYAN}   Brands:   ${GREEN}3 brands${NC} (Kerouac Watches, Aurora Cosmetics, TechFlow Electronics)"
echo -e "${CYAN}   Products: ${GREEN}11 products${NC} (all editable)"
echo ""
echo -e "${BLUE}🔧 Starting development server...${NC}"
echo -e "${PURPLE}================================================${NC}"
echo ""

# Start the development server with enhanced logging
npm run dev

# If the server stops, show a message
echo ""
echo -e "${RED}❌ Development server stopped${NC}"