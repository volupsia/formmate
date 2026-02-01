# Setup Guide

This guide covers how to set up formmate for both development and production environments.

---

## Development Environment

### Prerequisites
- Node.js 20+
- .NET 9 SDK
- PostgreSQL or SQLite

### 1. Clone Repositories

```bash
git clone git@github.com:formcms/formmate.git
git clone git@github.com:formcms/formcms.git
```

### 2. Setup formmate (Node.js)

```bash
cd formmate

# Install dependencies
npm install

# Build shared package
npm run build:shared

# Setup backend
cd packages/backend
cp .env.example .env
# Edit .env with your configuration
npx prisma generate
npx prisma db push

# Run backend (dev mode)
npm run dev
```

> **Note:** Ensure `FORMCMS_BASE_URL` in `.env` points to your FormCMS backend (default: `http://localhost:5000`).

### 3. Setup FormCMS (.NET)

```bash
cd formcms/server/FormCMS.Course

# Run with hot reload
dotnet watch run
```

### 4. Setup Frontend

```bash
cd formmate/packages/frontend
# .env.development is pre-configured
npm run dev
```

> **Note:** The frontend uses **`.env.development`** (checked in) for API configuration.
> - **`vite.config.ts`** - Configures proxy routes (`/api`, `/graphql`, `/files`) for dev server

### 5. Access the Application

Visit the AI Schema Builder:

| URL | Description |
|-----|-------------|
| `http://127.0.0.1:5173/mate` | AI Schema Builder via Vite dev server |

**Default Credentials:**
- **Username:** `sadmin@cms.com`
- **Password:** `Admin1!`

> **Note:** Use `127.0.0.1` instead of `localhost` to ensure cookies are shared correctly between services.

#### How the Proxy Works

**FormCMS Proxy (port 5000):**

In development, the FormCMS backend (port 5000) proxies requests to formmate:

```
┌─────────────────────────────────────────────────────────┐
│                    Port 5000 (FormCMS)                  │
├─────────────────────────────────────────────────────────┤
│  /mateapi     → Port 3001 (formmate Backend - Node.js)  │
│  /mate-static → Port 3001 (formmate Static Assets)      │
│  /api         → FormCMS Backend APIs                    │
└─────────────────────────────────────────────────────────┘
```

**Vite Proxy (port 5173):**

The frontend Vite dev server also proxies API requests to FormCMS:

```
┌─────────────────────────────────────────────────────────┐
│                Port 5173 (Vite Dev Server)              │
├─────────────────────────────────────────────────────────┤
│  /api         → Port 5000 (FormCMS Backend)             │
│  /graphql     → Port 5000 (FormCMS GraphQL)             │
│  /files       → Port 5000 (FormCMS File Assets)         │
└─────────────────────────────────────────────────────────┘
```

This allows you to access everything through either port (5000 or 5173) while each service runs independently during development.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Database connection string |
| `GEMINI_API_KEY` | Google Gemini API key **(recommended, fully tested)** |
| `OPENAI_API_KEY` | OpenAI API key (experimental, not fully tested) |
| `FORMCMS_API_URL` | FormCMS backend URL |

> **Note:** Currently, only **Gemini** has been fully tested. OpenAI support is experimental.

---

## Production Environment (Docker)

### Prerequisites
- Docker
- Docker Compose (optional)

### Build Docker Image

The Dockerfile builds a combined image with both formmate (Node.js) and FormCMS (.NET).

A convenience script is provided to build and run the container:

```bash
# From formmate root
./rebuild-docker.sh
```

Or manually:

```bash
# From parent directory containing both repos
docker build -t formmate-integrated -f formmate/Dockerfile .
```

### Run Container

```bash
docker run -d \
  -p 5000:5000 \
  -e DATABASE_URL="your-database-url" \
  -e GEMINI_API_KEY="your-gemini-key" \
  -e OPENAI_API_KEY="your-openai-key" \
  formmate-integrated
```

> **Note:** Inside the container, two services run on separate ports:
> - **Port 5000** - FormCMS Backend (.NET)
> - **Port 3001** - formmate Backend (Node.js), also serves the frontend (built to `dist/`)
>
> Only port 5000 needs to be exposed because the FormCMS backend proxies all `/mate`, `/mateapi`, and `/mate-static` requests to port 3001 internally.

### Docker Build Stages

| Stage | Description |
|-------|-------------|
| **builder** | Builds formmate frontend & backend (Node.js 20) |
| **dotnet-builder** | Builds FormCMS (.NET 9) |
| **final** | Runtime with both Node.js and .NET |

### Exposed Routes

| Route | Service |
|-------|---------|
| `/api` | FormCMS Backend |
| `/mate` | formmate Frontend |
| `/mateapi` | formmate Backend |
| `/mate-static` | formmate Static Assets |
| `/admin` | Admin App |
| `/portal` | User Portal |
