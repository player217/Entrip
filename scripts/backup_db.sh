#!/bin/bash

# Entrip Database Backup Script
# Usage: ./scripts/backup_db.sh

set -e

# Configuration
BACKUP_DIR="./backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_CONTAINER="entrip-db"
DB_NAME="${POSTGRES_DB:-entrip_db}"
DB_USER="${POSTGRES_USER:-entrip}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting database backup...${NC}"

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${YELLOW}Creating backup directory: $BACKUP_DIR${NC}"
    mkdir -p "$BACKUP_DIR"
fi

# Check if database container is running
if ! docker ps | grep -q "$DB_CONTAINER"; then
    echo -e "${RED}Error: Database container '$DB_CONTAINER' is not running${NC}"
    exit 1
fi

# Perform backup
BACKUP_FILE="$BACKUP_DIR/entrip_backup_${TIMESTAMP}.sql"
echo -e "${GREEN}Creating backup: $BACKUP_FILE${NC}"

docker exec -t "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ] && [ -s "$BACKUP_FILE" ]; then
    SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    echo -e "${GREEN}Backup completed successfully!${NC}"
    echo -e "${GREEN}File: $BACKUP_FILE${NC}"
    echo -e "${GREEN}Size: $SIZE${NC}"
    
    # Keep only the last 7 backups
    echo -e "${YELLOW}Cleaning up old backups...${NC}"
    ls -t "$BACKUP_DIR"/entrip_backup_*.sql 2>/dev/null | tail -n +8 | xargs -r rm -v
    
    # List remaining backups
    echo -e "${GREEN}Current backups:${NC}"
    ls -lh "$BACKUP_DIR"/entrip_backup_*.sql
else
    echo -e "${RED}Backup failed!${NC}"
    rm -f "$BACKUP_FILE"
    exit 1
fi

echo -e "${GREEN}Backup process completed.${NC}"