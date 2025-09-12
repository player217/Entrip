#!/bin/bash

# D1-D3: DB/Mock 데이터 단일 소스화 - Pre-commit Hook
# 
# Purpose: 커밋 전에 데이터 일관성을 검증하고 필요 시 자동 동기화를 수행합니다.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🔍 D1-D3: Pre-commit Data Consistency Check${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Change to API directory
cd apps/api || {
    echo -e "${RED}❌ Could not find apps/api directory${NC}"
    exit 1
}

# Check if seed.ts or mock-users.json are staged
SEED_CHANGED=$(git diff --cached --name-only | grep "apps/api/prisma/seed.ts" || true)
MOCK_CHANGED=$(git diff --cached --name-only | grep "apps/api/src/data/mock-users.json" || true)

if [[ -n "$SEED_CHANGED" || -n "$MOCK_CHANGED" ]]; then
    echo -e "${YELLOW}📊 Data files changed, running consistency check...${NC}"
    
    # Check if Node.js and npm are available
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not found. Please install Node.js to run pre-commit checks.${NC}"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm not found. Please install npm to run pre-commit checks.${NC}"
        exit 1
    fi
    
    # Install dependencies if needed
    if [[ ! -d "node_modules" ]]; then
        echo -e "${BLUE}📦 Installing dependencies...${NC}"
        npm install
    fi
    
    # Generate Prisma client if needed
    if [[ ! -d "node_modules/.prisma" ]] || [[ "$SEED_CHANGED" ]]; then
        echo -e "${BLUE}🔧 Generating Prisma client...${NC}"
        npx prisma generate
    fi
    
    # Run data synchronization
    echo -e "${BLUE}🔄 Synchronizing mock data from seed definitions...${NC}"
    if npm run sync-data; then
        echo -e "${GREEN}✅ Data synchronization completed${NC}"
    else
        echo -e "${RED}❌ Data synchronization failed${NC}"
        echo -e "${YELLOW}💡 Please check seed.ts for syntax errors${NC}"
        exit 1
    fi
    
    # Run validation
    echo -e "${BLUE}🔍 Validating data consistency...${NC}"
    if npm run validate-data; then
        echo -e "${GREEN}✅ Data consistency validation passed${NC}"
    else
        echo -e "${RED}❌ Data consistency validation failed${NC}"
        echo -e "${YELLOW}💡 Please review the validation errors above${NC}"
        exit 1
    fi
    
    # Check if mock-users.json was modified by sync
    if git diff --name-only | grep "apps/api/src/data/mock-users.json" > /dev/null; then
        echo -e "${YELLOW}📝 Mock data file was updated during sync${NC}"
        
        # Auto-stage the updated mock-users.json
        git add src/data/mock-users.json
        echo -e "${GREEN}✅ Updated mock-users.json has been staged${NC}"
        
        echo -e "${CYAN}ℹ️  Mock data was automatically synchronized with seed.ts changes${NC}"
    fi
    
else
    echo -e "${GREEN}ℹ️  No data files changed, skipping consistency check${NC}"
fi

# Additional checks for related files
SCRIPT_CHANGED=$(git diff --cached --name-only | grep "apps/api/scripts/" || true)
if [[ -n "$SCRIPT_CHANGED" ]]; then
    echo -e "${BLUE}🔧 Data scripts changed, running quick validation...${NC}"
    
    # Check if TypeScript scripts compile
    if command -v npx &> /dev/null; then
        npx tsc --noEmit scripts/*.ts || {
            echo -e "${RED}❌ Script compilation failed${NC}"
            exit 1
        }
        echo -e "${GREEN}✅ Scripts compilation passed${NC}"
    fi
fi

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Pre-commit data consistency check completed successfully!${NC}"
echo -e "${GREEN}✅ All quality gates passed${NC}"

exit 0