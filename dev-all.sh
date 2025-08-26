#!/usr/bin/env bash
set -e

echo "==============================================="
echo "  Entrip Full Development Environment"
echo "==============================================="
echo ""

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔧 1) Building design tokens...${NC}"
pnpm run build:tokens
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Design tokens built successfully!${NC}"
else
    echo -e "${RED}❌ Failed to build design tokens!${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}🚀 2) Starting all packages in dev mode...${NC}"
echo "-----------------------------------------------"
echo "  UI Package + Web App will run together"
echo "  Server: http://localhost:3000"
echo "  Press Ctrl+C to stop"
echo "-----------------------------------------------"
echo ""

# 전체 monorepo dev 실행 (turbo가 의존성 관리)
pnpm run dev