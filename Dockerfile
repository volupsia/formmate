# --- Stage 1: Build Frontend & Backend ---
FROM node:20-slim AS builder
WORKDIR /app

# Install dependencies (utilizing workspace support)
COPY formmate/package.json formmate/package-lock.json ./
COPY formmate/packages/shared/package.json ./packages/shared/
COPY formmate/packages/mate-service/package.json ./packages/mate-service/
COPY formmate/packages/mate-ui/package.json ./packages/mate-ui/
RUN npm install

# Copy Formmate source code
COPY formmate/ .

# Build Shared Package
RUN npm run build:shared

# Build Frontend (outputs to packages/mate-ui/dist)
RUN cd packages/mate-ui && npm run build

# Build Backend
RUN cd packages/mate-service && cp .env.production .env && npx prisma generate && npm run build

# --- Stage 2: Build FormCMS (.NET 8) ---
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS dotnet-builder
WORKDIR /src

# Copy FormCMS source
# Note: Requires formcms/server directory to be in build context
COPY formcms/server/ ./

# Publish the specific project
RUN dotnet publish FormCMS.Course/FormCMS.Course.csproj -c Release -o /app/publish

# --- Stage 3: Final Runtime ---
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

# Install Node.js in the .NET Runtime image
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Copy Built Node.js App
COPY --from=builder /app /app

# Copy Built FormCMS App
COPY --from=dotnet-builder /app/publish ./formcms
COPY formcms/server/FormCMS.Course/appsettings.json ./formcms/
COPY formcms/server/FormCMS.Course/agent.db ./formcms/

# Set Permissions
RUN chmod +x /app/entrypoint.sh

# Expose Ports
EXPOSE 5000

# Entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]
