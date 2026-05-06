# FormCMS AI Skill File

This directory contains a single AI skill file (`skill.md`) that developers copy into their frontend projects when building applications with FormCMS.

By copying this file into your project, your AI tools (Antigravity, Cursor, Copilot, Claude, Windsurf) will automatically understand the FormCMS API patterns — cookie-based authentication, entity APIs, named queries, relationships, and asset management.

## Usage

Copy `skill.md` into the location your AI agent expects:

| Agent | Destination |
|-------|-------------|
| **Antigravity / Gemini** | `.agent/skills/formcms-react-app/SKILL.md` |
| **Cursor** | `.cursor/rules/formcms-react-app.md` |
| **VS Code Copilot** | `.github/copilot-instructions.md` |
| **Claude** | Project knowledge or paste into context |

Or use `curl`:

```bash
# Antigravity / Gemini
mkdir -p .agent/skills/formcms-react-app
curl -o .agent/skills/formcms-react-app/SKILL.md \
  https://raw.githubusercontent.com/formcms/formmate/main/packages/ai-skills/skill.md

# Cursor
mkdir -p .cursor/rules
curl -o .cursor/rules/formcms-react-app.md \
  https://raw.githubusercontent.com/formcms/formmate/main/packages/ai-skills/skill.md

# VS Code Copilot
mkdir -p .github
curl -o .github/copilot-instructions.md \
  https://raw.githubusercontent.com/formcms/formmate/main/packages/ai-skills/skill.md
```

## MCP prompt generation

The `build.ts` script extracts the runtime API reference from `skill.md` and generates `../mcp-server/src/prompts/auth.ts` — a TypeScript module that registers the API reference as an MCP prompt.

```bash
npm run build:skills   # from the monorepo root
# or
npx tsx build.ts       # from this directory
```

> ⚠️ **Do not edit `../mcp-server/src/prompts/auth.ts` directly** — it is regenerated from `skill.md` on each build.
