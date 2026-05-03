/**
 * Build script for ai-skills.
 *
 * Reads shared markdown partials from docs/ and assembles
 * consumer-specific files for Gemini, Cursor, Copilot, and the MCP prompt.
 *
 * Run:  npx tsx build.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS = resolve(__dirname, 'docs');
const read = (name: string) => readFileSync(resolve(DOCS, name), 'utf-8').trim();

// ── Load partials ──────────────────────────────────────────────────────────
const config    = read('config.md');
const mcp       = read('mcp.md');
const schema    = read('schema.md');
const auth      = read('auth.md');
const entityApi = read('entity-api.md');
const queries   = read('queries.md');
const assets    = read('assets.md');
const ui        = read('ui.md');

function write(relPath: string, content: string) {
    const abs = resolve(__dirname, relPath);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content, 'utf-8');
    console.log(`  ✓ ${relPath}`);
}

// ── 1. Gemini SKILL.md ─────────────────────────────────────────────────────
const geminiSkill = `---
name: Build FormCMS React App
description: Guidelines and patterns for building React applications that integrate with FormCMS backend. Covers configuration, authentication, data fetching, and asset management.
---

# Building a React App with FormCMS

Follow these patterns when building a React frontend connected to a FormCMS backend.
The instructions are split into two parts: **Part 1 — dev-time setup** (using MCP tools) and **Part 2 — runtime patterns** (REST API calls in your app code).

# Part 1: Dev-time Setup (MCP Tools)

${mcp}

${schema}

---

# Part 2: Runtime (App Code — REST API)

${config}

---

${auth}

---

${entityApi}

${queries}

${assets}

---

${ui}
`;

write('gemini/formcms-react-app/SKILL.md', geminiSkill);
write('../../starters/vite-react-starter/.agent/skills/formcms-react-app/SKILL.md', geminiSkill);

// ── 2. Cursor .mdc ─────────────────────────────────────────────────────────
const cursorRule = `---
description: FormCMS React app patterns — auth, entity CRUD, named queries. Apply when building frontend apps on top of FormCMS.
globs: ["src/**/*.tsx", "src/**/*.ts"]
alwaysApply: false
---

# FormCMS React App Patterns

# Part 1: Dev-time Setup (MCP Tools)

${mcp}

${schema}

---

# Part 2: Runtime (App Code — REST API)

${config}

---

${auth}

${entityApi}

${queries}

${assets}

${ui}
`;

write('cursor/formcms-react-app.mdc', cursorRule);

// ── 3. Copilot instructions ────────────────────────────────────────────────
const copilotInstructions = `# FormMate — AI Coding Instructions

## Project Overview
FormMate is a developer toolkit built on top of [FormCMS](https://github.com/formcms/formcms) — a headless CMS backend.
Frontend apps are built with React + TypeScript + Vite, connected to the FormCMS API.

## Tech Stack
- Frontend: React, TypeScript, Vite
- Shared: \`@formmate/shared\` (types, operators, API client)
- MCP Server: Node.js + Express + \`@modelcontextprotocol/sdk\`

# Part 1: Dev-time Setup (MCP Tools)

${mcp}

${schema}

---

# Part 2: Runtime (App Code — REST API)

${config}

---

${auth}

${entityApi}

${queries}

${assets}

## Coding Guidelines
- Use a Vite proxy (in \`vite.config.ts\`) for \`/api\` requests to avoid CORS issues.
- Prefer named exports for components.
- Use functional components with hooks only.

${ui}
`;

write('copilot/copilot-instructions.md', copilotInstructions);

// ── 4. MCP Server prompt (auth.ts) ─────────────────────────────────────────
// Escape backticks and ${} for embedding in a template literal
const escapedAuth = auth.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
const escapedSchema = schema.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
const escapedEntity = entityApi.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
const escapedQueries = queries.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
const escapedAssets = assets.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const mcpPromptTs = `import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const API_REFERENCE = \`
# FormCMS API Reference

${escapedSchema}

---

${escapedAuth}

---

${escapedEntity}

${escapedQueries}

${escapedAssets}
\`;

export function registerAuthPrompts(server: McpServer): void {
    server.prompt(
        'formcms-auth-api',
        'FormCMS API reference — authentication, entity CRUD, named queries, and asset management. ' +
        'Use this when building login, register, logout, data fetching, file uploads, or session-management features.',
        () => ({
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: API_REFERENCE,
                    },
                },
            ],
        })
    );
}
`;

write('../mcp-server/src/prompts/auth.ts', mcpPromptTs);

console.log('\n✅ All consumer files generated from docs/');
