# Setup Guide

This guide covers how to set up formmate for both development and production environments.

---

## Development Environment

### Prerequisites
- Node.js 20+
- .NET 10 SDK
- PostgreSQL or SQLite

### 1. Clone Repositories
```bash
git clone git@github.com:formcms/formcms.git
git clone git@github.com:formcms/formmate.git
```

### 2. Start Backend (FormCMS)
```bash
cd formcms/server/FormCMS.MonoApp
dotnet run
```
_Verify that `http://127.0.0.1:5000` is accessible._

### 3. Start Development Server
```bash
# From formmate root
npm run setup
npm run dev
```
Visit **http://127.0.0.1:5173** to start building!

> **Note:** Use `127.0.0.1` instead of `localhost` to ensure cookies are shared correctly.
> **Note:** During setup, formcms backend needs to be manually restarted to load new configuration.

### 💡 Try it out
Once running, try these prompts:
- "Design entities for a library management system"
- "Add sample data for the book entity"
- "Create a query to display all available books"


> **Note:** Currently, only **Gemini** has been fully tested. OpenAI support is experimental.

---
