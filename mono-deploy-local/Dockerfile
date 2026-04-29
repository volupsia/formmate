# --- Stage 0: Static ffmpeg binaries (multi-arch) ---
# Using johnvansickle static builds: ~80MB vs ~500MB from apt-get install ffmpeg
FROM alpine AS ffmpeg-amd64
RUN apk add --no-cache curl xz && \
    mkdir /ff && \
    curl -sL https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz \
    | tar -xJ -C /ff --strip-components=1 && \
    cp /ff/ffmpeg /ff/ffprobe /usr/local/bin/ && \
    rm -rf /ff

FROM alpine AS ffmpeg-arm64
RUN apk add --no-cache curl xz && \
    mkdir /ff && \
    curl -sL https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-arm64-static.tar.xz \
    | tar -xJ -C /ff --strip-components=1 && \
    cp /ff/ffmpeg /ff/ffprobe /usr/local/bin/ && \
    rm -rf /ff

# Select the right ffmpeg for the target platform
FROM ffmpeg-${TARGETARCH} AS ffmpeg

# --- Stage 1: Setup Node.js Backend Only ---
FROM node:24-slim AS node-base
WORKDIR /app

# Install runtime dependencies for backend (openssl for prisma)
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl procps curl python3 make g++ && rm -rf /var/lib/apt/lists/*

# 1. Copy ONLY backend package definitions (NOT frontend mate/admin/portal/stash)
#    This prevents React, monaco-editor, date-fns, lucide-react etc. from being
#    installed in node_modules — they're already compiled into dist/ files.
COPY formmate/package.json formmate/package-lock.json ./
COPY formmate/packages/shared/package.json ./packages/shared/
COPY formmate/packages/mate-service/package.json ./packages/mate-service/
COPY formmate/packages/sdk/package.json ./packages/sdk/
COPY formmate/packages/mcp-server/package.json ./packages/mcp-server/

# Create stub package.json files for frontend workspaces so npm workspace resolution
# doesn't fail, but without installing their heavy deps
RUN mkdir -p packages/mate packages/admin packages/portal packages/stash && \
    echo '{"name":"@formmate/mate","version":"0.0.0","dependencies":{}}' > packages/mate/package.json && \
    echo '{"name":"@formmate/admin","version":"0.0.0","dependencies":{}}' > packages/admin/package.json && \
    echo '{"name":"@formmate/portal","version":"0.0.0","dependencies":{}}' > packages/portal/package.json && \
    echo '{"name":"@formmate/stash","version":"0.0.0","dependencies":{}}' > packages/stash/package.json

# 2. Install backend production dependencies only
RUN npm install --omit=dev

# 3. Copy pre-built backend artifacts
COPY formmate/packages/shared/dist ./packages/shared/dist
COPY formmate/packages/shared/src ./packages/shared/src

COPY formmate/packages/mate-service/dist ./packages/mate-service/dist
COPY formmate/packages/mate-service/src ./packages/mate-service/src
COPY formmate/packages/mate-service/public ./packages/mate-service/public
COPY formmate/packages/mate-service/prisma ./packages/mate-service/prisma

# Copy MCP server source (runs via tsx)
COPY formmate/packages/mcp-server/src ./packages/mcp-server/src
COPY formmate/packages/mcp-server/tsconfig.json ./packages/mcp-server/

# Generate Prisma Client (needs to run on target arch)
RUN cd packages/mate-service && npx prisma generate

# 4. Copy compiled frontend dist artifacts (no node_modules needed for these)
COPY formmate/packages/mate/dist ./packages/mate/dist
COPY formmate/packages/admin/dist ./packages/admin/dist
COPY formmate/packages/portal/dist ./packages/portal/dist
COPY formmate/packages/stash/dist ./packages/stash/dist

# --- Stage 2: Final Image (Hybrid .NET + Node) ---
FROM mcr.microsoft.com/dotnet/aspnet:10.0
ARG TARGETARCH
WORKDIR /app

# Install Nginx + Node.js (no ffmpeg via apt — using static binary instead)
RUN apt-get update && apt-get install -y --no-install-recommends curl nginx procps dos2unix && \
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    npm install -g tsx && \
    rm -rf /var/lib/apt/lists/*

# Copy static ffmpeg/ffprobe from the platform-specific stage (~80MB vs ~500MB)
COPY --from=ffmpeg /usr/local/bin/ffmpeg /usr/local/bin/ffmpeg
COPY --from=ffmpeg /usr/local/bin/ffprobe /usr/local/bin/ffprobe

# Configure Nginx
COPY formmate/mono-deploy-local/nginx.conf /etc/nginx/nginx.conf
COPY formmate/mono-deploy-local/404.html /usr/share/nginx/html/404.html

# Copy Node.js App from node-base
COPY --from=node-base /app /app

# Copy Pre-built .NET App from LOCAL machine
COPY formcms/publish ./formcms
# Ensure config files are writable
RUN touch ./formcms/appsettings.json && chmod 666 ./formcms/appsettings.json

# Copy Entrypoint
COPY formmate/mono-deploy-local/entrypoint.sh /app/entrypoint.sh
RUN dos2unix /app/entrypoint.sh && chmod +x /app/entrypoint.sh

EXPOSE 5000
ENTRYPOINT ["/app/entrypoint.sh"]
