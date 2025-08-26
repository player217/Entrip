#!/usr/bin/env bash
set -euo pipefail

# Configuration
APP_USER="${DEPLOY_USER:-ubuntu}"
HOST="${DEPLOY_HOST:-prod.example.com}"
APP_DIR="/opt/entrip"

echo "🚀 Deploying Entrip to ${HOST}..."

# SSH and deploy
ssh -o StrictHostKeyChecking=no "${APP_USER}@${HOST}" <<'EOSSH'
  set -e
  
  echo "📦 Pulling latest images..."
  cd /opt/entrip
  docker compose pull
  
  echo "🔄 Restarting services..."
  docker compose up -d --remove-orphans
  
  echo "🧹 Cleaning up old images..."
  docker image prune -f
  
  echo "✅ Deployment complete!"
  docker compose ps
EOSSH

echo "✅ Deployment to ${HOST} successful!"