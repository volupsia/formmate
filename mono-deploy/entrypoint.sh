#!/bin/bash
set -e

echo "[ENTRYPOINT] Starting startup sequence..."

# Default Environment Variables
export DATABASE_URL=${DATABASE_URL:-"file:/app/packages/backend/sessions.db"}
export PORT=${PORT:-"3001"}
export FORMCMS_BASE_URL=${FORMCMS_BASE_URL:-"http://127.0.0.1:5001"} # Internal .NET port
export FRONTEND_URL=${FRONTEND_URL:-"http://127.0.0.1:3001"}

# FormCMS Configuration from Environment Variables
export DATABASE_PROVIDER=${DATABASE_PROVIDER:-1}  # Default to Postgres
export CONNECTION_STRING=${CONNECTION_STRING:-"Host=db;Port=5432;Database=cms;Username=postgres;Password=postgres;"}
export MASTER_PASSWORD=${MASTER_PASSWORD:-""}  # Empty by default - user sets via UI

# Generate formcms.settings.json from environment variables
echo "[ENTRYPOINT] Generating formcms.settings.json from environment variables..."
cat > /app/formcms/formcms.settings.json <<EOF
{
  "FormCms": {
    "DatabaseProvider": ${DATABASE_PROVIDER},
    "ConnectionString": "${CONNECTION_STRING}",
    "MasterPassword": "${MASTER_PASSWORD}",
    "Spas": null
  }
}
EOF

echo "[ENTRYPOINT] FormCMS configuration:"
echo "  Database Provider: ${DATABASE_PROVIDER}"
echo "  Connection String: ${CONNECTION_STRING}"
echo "  Master Password: $([ -z "$MASTER_PASSWORD" ] && echo '(empty - will be set via UI)' || echo '(set)')"

# Start Nginx
echo "[ENTRYPOINT] Starting Nginx..."
nginx

# Start Node.js (FormMate Backend) in background
echo "[ENTRYPOINT] Starting FormMate (Node.js) on port 3001..."
cd /app/packages/backend
npx prisma db push --accept-data-loss
tsx src/index.ts &

# Start FormCMS (.NET) in a loop
echo "[ENTRYPOINT] Starting FormCMS (.NET) loop on port 5001..."
cd /app/formcms

while true; do
  echo "[LOOP] Starting .NET process..."
  # Run in foreground of this sub-shell, but wait for it
  dotnet FormCMS.App.dll --urls "http://127.0.0.1:5001" || true
  
  echo "[LOOP] .NET process exited. Restarting in 1 second..."
  sleep 1
done
