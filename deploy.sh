#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Poddar Jewellers — One-Click Deployment Script for Synology NAS / Linux
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

echo "💎 Poddar Jewellers — Starting Deployment..."
echo "=========================================="

# 1. Ensure Docker & Compose are available
DOCKER_BIN=$(which docker 2>/dev/null || echo "/usr/local/bin/docker")
if ! command -v docker >/dev/null 2>&1 && [ ! -x "$DOCKER_BIN" ]; then
  DOCKER_BIN="/volume1/@appstore/Docker/usr/bin/docker"
fi

if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
elif docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
else
  COMPOSE_CMD="$DOCKER_BIN compose"
fi

# Use sudo if required
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
else
  SUDO=""
fi

echo "🔹 Using Docker: $DOCKER_BIN"
echo "🔹 Using Compose: $COMPOSE_CMD"

# 2. Pull latest code from GitHub
echo ""
echo "📥 Step 1/5: Pulling latest updates from Git..."
git pull origin main || git pull origin design-system || echo "⚠️ Git pull warning (continuing with local tree)"

# 3. Create .env if missing
if [ ! -f .env ]; then
  echo "📝 Creating default .env configuration..."
  cat << 'EOF' > .env
POSTGRES_USER=poddar
POSTGRES_PASSWORD=poddar_secret_2026
POSTGRES_DB=poddar_jewellers
APP_PORT=3210
SESSION_SECRET=poddar_jewellers_production_session_secret_32chars
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=admin123
EOF
fi

# 4. Stop running container stack cleanly
echo ""
echo "⏹️ Step 2/5: Stopping running container stack and clearing unused networks..."
$SUDO $COMPOSE_CMD down || true
$SUDO $DOCKER_BIN network prune -f >/dev/null 2>&1 || true

# 5. Build and start database container
echo ""
echo "🏗️ Step 3/5: Starting database container..."
$SUDO $COMPOSE_CMD up -d --build db

# 6. Run database migrations & seed idempotently
echo ""
echo "🗄️ Step 4/5: Running database migrations & seed..."
$SUDO $COMPOSE_CMD run --rm migrate

# 7. Start fresh app container after DB is migrated and seeded
echo ""
echo "🚀 Step 5/5: Starting application container..."
$SUDO $COMPOSE_CMD up -d --build app

# 8. Cleanup old dangling build images
$SUDO $DOCKER_BIN image prune -f >/dev/null 2>&1 || true

# 9. Success Report
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$SERVER_IP" ]; then
  SERVER_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}')
fi
if [ -z "$SERVER_IP" ]; then
  SERVER_IP="localhost"
fi

echo ""
echo "=========================================="
echo "🎉 Deployment Complete!"
echo "=========================================="
echo "🌐 App live at: http://${SERVER_IP}:3210"
echo "🔒 Admin panel: http://${SERVER_IP}:3210/admin"
echo "=========================================="
