#!/bin/bash
# PostgreSQL backup script for Entrip

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup/pg_dump_dev_${DATE}.sql"

# Create backup directory if it doesn't exist
mkdir -p backup

echo "Starting PostgreSQL backup..."
docker compose exec -T postgres pg_dump -U entrip entrip > "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    FILE_SIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')
    echo "Backup completed successfully: ${BACKUP_FILE} (${FILE_SIZE})"
else
    echo "Backup failed!"
    exit 1
fi