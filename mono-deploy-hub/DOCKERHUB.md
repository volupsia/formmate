# FormCMS

**Open-source headless CMS** with a visual admin panel, form builder, and AI-powered assistant — all in one Docker image.

- 🎨 Visual Admin Panel & Page Builder
- 📝 Dynamic Entity/Form Management
- 🤖 AI-Powered Content Assistant (Gemini)
- 🔐 Role-Based Access Control
- 🗄️ Supports PostgreSQL, MySQL, SQL Server, and SQLite

---

## 1. Quick Start — Try It in Seconds

Run FormCMS with a **single command** using the built-in SQLite database. No external database needed.

```bash
docker run -d \
  --name formcms \
  -p 5000:5000 \
  -v formcms_data:/data \
  -e DATABASE_PROVIDER=0 \
  -e "CONNECTION_STRING=Data Source=/data/cms.db" \
  jaike/formcms-mono:latest
```

Then open **http://localhost:5000/mate** in your browser.

### First-Time Setup

1. **Database** — Pre-configured (SQLite), just click next.
2. **Create Super Admin** — Enter your email and password.
3. **Start Backend** — Click the start button (auto-restarts in Docker).
4. **Done!** — You're redirected to the dashboard. Start building.

> **Note:** Data is persisted in a Docker volume (`formcms_data`). Your content survives container restarts.

### Ephemeral Mode (No Persistence)

You can also start FormCMS without a volume if your Docker host provider doesn't allow volumes for free users:

```bash
docker run -d \
  --name formcms \
  -p 5000:5000 \
  jaike/formcms-mono:latest
```

> [!CAUTION]
> Data is **ephemeral**. Every time the container restarts, all your data will be **lost**.

---

## 2. Production — Docker Compose with PostgreSQL

For production, use Docker Compose to run FormCMS with a PostgreSQL database.

### Create `docker-compose.yml`

```yaml
services:
  app:
    image: jaike/formcms-mono:latest
    ports:
      - "5000:5000"
    environment:
      # --- Database ---
      - DATABASE_PROVIDER=1                # 0=SQLite, 1=Postgres, 2=SqlServer, 3=MySQL
      - CONNECTION_STRING=Host=db;Port=5432;Database=cms;Username=postgres;Password=postgres;
      - DatabaseProvider=Postgres
      - "ConnectionStrings__Postgres=Host=db;Database=cms;Username=postgres;Password=postgres;"
      - FORMCMS_DATA_PATH=/data

      # --- Node.js (internal, no need to change) ---
      - PORT=3001
      - NODE_ENV=production
      - FORMCMS_BASE_URL=http://127.0.0.1:5001
      - DATABASE_URL=file:/data/mate/sqlite.db
    depends_on:
      - db
    restart: unless-stopped
    volumes:
      - formcms_data:/data

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=cms
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
  formcms_data:
```

### Start

```bash
docker compose up -d
```

Open **http://localhost:5000/mate** and follow the setup wizard.

### Customize

| Variable | Default | Description |
|---|---|---|
| `DATABASE_PROVIDER` | `1` | `0`=SQLite, `1`=Postgres, `2`=SqlServer, `3`=MySQL |
| `CONNECTION_STRING` | *(see above)* | Database connection string |
| `POSTGRES_USER` | `postgres` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `postgres` | PostgreSQL password |
| `POSTGRES_DB` | `cms` | PostgreSQL database name |

> **⚠️ Security:** Change the default database password before deploying to production.

---

## Architecture

```
         Nginx (Port 5000)
         ┌─────────────────┐
         │  /      → .NET  │
         │  /mate/ → Node  │
         └────────┬────────┘
                  │
      ┌───────────┴───────────┐
      ▼                       ▼
  FormCMS (.NET)       FormMate (Node.js)
      │                       │
      └───────────┬───────────┘
                  ▼
            PostgreSQL
```

## Links

- **GitHub:** [https://github.com/formcms/formcms](https://github.com/formcms/formcms)
- **Documentation:** [https://github.com/formcms/formcms/wiki](https://github.com/formcms/formcms/wiki)