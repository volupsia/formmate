# --- Stage 1: Setup Node.js Middleware ---
FROM node:24-slim AS node-base
WORKDIR /app

# Install runtime dependencies for backend (openssl for prisma)
RUN apt-get update -y && apt-get install -y openssl procps curl && rm -rf /var/lib/apt/lists/*

# 1. Copy package definitions to install dependencies
COPY formmate/package.json formmate/package-lock.json ./
COPY formmate/packages/shared/package.json ./packages/shared/
COPY formmate/packages/mate-service/package.json ./packages/mate-service/
COPY formmate/packages/mate/package.json ./packages/mate/
# Also copy SDK which is a dependency now
COPY formmate/packages/sdk/package.json ./packages/sdk/

# 2. Install PROD dependencies
# Note: In multi-arch, we might need to be careful with native modules, but pure JS deps are fine.
# If implicit 'npm ci' fails due to platform specifics of lockfile, we use 'npm install'
RUN npm install --omit=dev

# 3. Copy pre-built artifacts from LOCAL machine
COPY formmate/packages/shared/dist ./packages/shared/dist
# Copy backend artifacts AND source files (for tsx if needed, though we should run compiled js)
COPY formmate/packages/mate-service/dist ./packages/mate-service/dist
COPY formmate/packages/mate-service/src ./packages/mate-service/src
COPY formmate/packages/mate-service/resources ./packages/mate-service/resources
COPY formmate/packages/mate-service/public ./packages/mate-service/public
COPY formmate/packages/mate-service/prisma ./packages/mate-service/prisma

# Generate Prisma Client (needs to run on target arch)
RUN cd packages/mate-service && npx prisma generate

# Copy frontend artifacts
COPY formmate/packages/mate/dist ./packages/mate/dist
COPY formmate/packages/admin/dist ./packages/admin/dist
COPY formmate/packages/portal/dist ./packages/portal/dist

# --- Stage 2: Final Image (Hybrid .NET + Node) ---
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app

# Start Node.js & Nginx
RUN apt-get update && apt-get install -y curl nginx procps dos2unix && \
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g tsx && \
    rm -rf /var/lib/apt/lists/*

# Configure Nginx
COPY formmate/mono-deploy-local/nginx.conf /etc/nginx/nginx.conf
COPY formmate/mono-deploy-local/404.html /usr/share/nginx/html/404.html

# Copy Node.js App from node-base
COPY --from=node-base /app /app

# Copy Pre-built .NET App from LOCAL machine
# .NET Publish output is portable if not self-contained
COPY formcms/publish ./formcms
# Ensure config files are writable
RUN touch ./formcms/appsettings.json && chmod 666 ./formcms/appsettings.json

# Copy Entrypoint
COPY formmate/mono-deploy-local/entrypoint.sh /app/entrypoint.sh
RUN dos2unix /app/entrypoint.sh && chmod +x /app/entrypoint.sh

EXPOSE 5000
ENTRYPOINT ["/app/entrypoint.sh"]
