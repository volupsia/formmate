# FormCMS AI Skills & Templates

This directory contains AI instructions and skill files that developers can copy into their own frontend projects when building applications with FormCMS.

By copying these rules into your project, your AI tools (Cursor, Copilot, Gemini/Antigravity, Windsurf) will automatically understand the FormCMS API patterns, such as cookie-based authentication, entity APIs, and named queries.

## Architecture — Single Source of Truth

All API reference content lives in **`docs/`** as shared markdown partials:

```
docs/
├── config.md        ← Vite proxy setup
├── auth.md          ← Authentication (endpoints + axios/SWR pattern)
├── entity-api.md    ← Entity CRUD endpoints
├── queries.md       ← Named queries
└── ui.md            ← UI conventions (icons, animations)
```

The **`build.ts`** script assembles these partials into consumer-specific files:

| Consumer | Generated file | Format |
|----------|----------------|--------|
| Gemini / Antigravity | `gemini/formcms-react-app/SKILL.md` | Gemini skill with frontmatter |
| Cursor | `cursor/formcms-react-app.mdc` | Cursor rule with globs |
| VS Code Copilot | `copilot/copilot-instructions.md` | Copilot instructions |
| MCP Server | `../mcp-server/src/prompts/auth.ts` | TS prompt registration |

### Editing content

1. Edit the relevant file in `docs/`
2. Run `npm run build:skills` (or `npx tsx packages/ai-skills/build.ts` from the monorepo root)
3. All consumer files are regenerated automatically

> ⚠️ **Do not edit the generated files directly** — your changes will be overwritten on next build.

## Usage

Depending on which AI assistant you use, copy the relevant file into your frontend project's root directory:

### Cursor
Copy `cursor/formcms-react-app.mdc` to `.cursor/rules/formcms-react-app.mdc`

### VS Code GitHub Copilot
Copy `copilot/copilot-instructions.md` to `.github/copilot-instructions.md` (or to `.github/instructions/formcms.instructions.md`)

### Gemini CLI / Antigravity / Agent
Copy the `gemini/formcms-react-app` folder to `.agent/skills/formcms-react-app` (or `.gemini/skills/formcms-react-app`)
