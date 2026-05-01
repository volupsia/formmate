# FormCMS Config Overlay

This is a minimal config overlay for connecting any Vite + React + TypeScript project to a FormCMS backend using Antigravity (or any MCP-compatible AI agent).

## What's included

| File | Purpose |
|------|---------|
| `antigravity.yaml` | Pre-configured FormCMS MCP server connection |
| `.agent/skills/formcms-react-app/SKILL.md` | Teaches your AI agent the FormCMS API patterns |

## Usage

1. **Create your Vite React app:**
   ```bash
   npm create vite@latest my-app -- --template react-ts
   cd my-app
   ```

2. **Overlay this config:**
   ```bash
   npx degit formcms/formmate/starters/vite-react-starter . --force
   ```

3. **Install dependencies and start:**
   ```bash
   npm install
   npm run dev
   ```

4. **Open in Antigravity** — it picks up `antigravity.yaml` and the skill automatically.

> If your FormCMS instance uses an API key, add the `Authorization` header to `antigravity.yaml`.
> See the [full guide](https://github.com/formcms/formmate/wiki/Vite-React-Antigravity-Example) for details.
