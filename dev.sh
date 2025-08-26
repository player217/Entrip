#!/bin/bash

echo "==============================================="
echo "  Entrip Development Server Starter"
echo "==============================================="
echo ""

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# 1) 디자인 토큰 빌드
echo -e "${YELLOW}[1/2] Building design tokens...${NC}"
pnpm run build:tokens
if [ $? -eq 0 ]; then
    echo -e "${GREEN}[OK] Design tokens built successfully!${NC}"
else
    echo -e "${RED}[ERROR] Failed to build design tokens!${NC}"
    exit 1
fi
echo ""

# 2) 개발 서버 실행
echo -e "${YELLOW}[2/2] Starting development server...${NC}"
echo ""
echo "-----------------------------------------------"
echo "  Server will start at: http://localhost:3000"
echo "  Press Ctrl+C to stop the server"
echo "-----------------------------------------------"
echo ""

pnpm run dev