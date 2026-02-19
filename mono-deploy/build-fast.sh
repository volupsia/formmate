#!/bin/bash
set -e

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
REPO_ROOT="$SCRIPT_DIR/../.."

echo "🚀 Building FormMate (Frontend & Backend) locally..."
cd "$REPO_ROOT/formmate"
# Install deps if needed (fast if cached)
npm install --silent

# Build Shared
npm run build:shared --silent

# Build Frontend
npm run build --workspace=@formmate/mate --silent
npm run build --workspace=@formmate/admin --silent
npm run build --workspace=@formmate/portal --silent

# Build Backend (Prisma + TSC)
cd packages/mate-service
npm install --silent # Ensure local backend deps are simpler to find
npx prisma generate
npm run build --silent

echo "🚀 Building FormCMS (.NET) locally..."
cd "$REPO_ROOT/formcms"
# Clean previous publish to avoid stale files
rm -rf publish
dotnet publish server/FormCMS.MonoApp/FormCMS.MonoApp.csproj -c Release -o ./publish

echo "🐳 Building Docker Image (Fast Mode)..."
cd "$SCRIPT_DIR"
docker build -t formcms-mono-deploy:latest -f Dockerfile "$REPO_ROOT"

echo "✅ Build complete! Image: formcms-mono-deploy:latest"
echo "👉 Run ./reload.sh to restart the container."
