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