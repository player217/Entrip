#!/bin/bash

# Entrip Database Restore Script
# Usage: ./scripts/restore_db.sh backup_file.sql

set -e

# Configuration
DB_CONTAINER="entrip-db"
DB_NAME="${POSTGRES_DB:-entrip_db}"
DB_USER="${POSTGRES_USER:-entrip}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo -e "${RED}Error: No backup file specified${NC}"
    echo "Usage: $0 <backup_file.sql>"
    echo "Available backups:"
    ls -lh ./backup/entrip_backup_*.sql 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file '$BACKUP_FILE' not found${NC}"
    exit 1
fi

# Check if database container is running
if ! docker ps | grep -q "$DB_CONTAINER"; then
    echo -e "${RED}Error: Database container '$DB_CONTAINER' is not running${NC}"
    exit 1
fi

echo -e "${YELLOW}WARNING: This will replace all data in the database!${NC}"
read -p "Are you sure you want to restore from $BACKUP_FILE? (yes/no): " confirmation

if [ "$confirmation" != "yes" ]; then
    echo -e "${YELLOW}Restore cancelled.${NC}"
    exit 0
fi

echo -e "${GREEN}Starting database restore...${NC}"

# Drop existing connections
echo -e "${YELLOW}Dropping existing connections...${NC}"
docker exec -t "$DB_CONTAINER" psql -U "$DB_USER" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" postgres

# Drop and recreate database
echo -e "${YELLOW}Recreating database...${NC}"
docker exec -t "$DB_CONTAINER" psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS $DB_NAME;" postgres
docker exec -t "$DB_CONTAINER" psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;" postgres

# Restore from backup
echo -e "${GREEN}Restoring from backup...${NC}"
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" "$DB_NAME" < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Database restored successfully!${NC}"
    echo -e "${GREEN}Restored from: $BACKUP_FILE${NC}"
else
    echo -e "${RED}Restore failed!${NC}"
    exit 1
fi

echo -e "${GREEN}Restore process completed.${NC}"