# --- Stage 1: Build Frontend & Backend ---
FROM node:24-slim AS builder
WORKDIR /app

# Install dependencies (utilizing workspace support)
COPY formmate/package.json formmate/package-lock.json ./
COPY formmate/packages/shared/package.json ./packages/shared/
COPY formmate/packages/mate-service/package.json ./packages/mate-service/
COPY formmate/packages/mate/package.json ./packages/mate/
COPY formmate/packages/mate/tsconfig.json ./packages/mate/tsconfig.json
RUN npm install

# Copy Formmate source code
COPY formmate/ .

# Build Shared Package
RUN npm run build:shared

# Build Frontend (outputs to packages/mate/dist)
RUN cd packages/mate && npm run build

# Build Backend
RUN cd packages/mate-service && cp .env.production .env && npx prisma generate && npm run build

# --- Stage 2: Build FormCMS (.NET 10) ---
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS dotnet-builder
WORKDIR /src

# Copy FormCMS source
COPY formcms/ ./

# Publish the specific project
RUN dotnet publish server/FormCMS.App/FormCMS.App.csproj -c Release -o /app/publish

# --- Stage 3: Final Runtime ---
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Install Node.js & Nginx
RUN apt-get update && apt-get install -y curl nginx procps && \
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Configure Nginx
COPY formmate/mono-deploy/nginx.conf /etc/nginx/nginx.conf
COPY formmate/mono-deploy/404.html /usr/share/nginx/html/404.html

# Copy Built Node.js App
COPY --from=builder /app /app

# Copy Built FormCMS App
COPY --from=dotnet-builder /app/publish ./formcms
# Ensure appsettings is writable
RUN touch ./formcms/appsettings.json && chmod 666 ./formcms/appsettings.json

# Copy Entrypoint
COPY formmate/standalone-formcms/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Expose Nginx Port
EXPOSE 5000

# Entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]
