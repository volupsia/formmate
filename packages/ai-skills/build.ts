/**
 * Build script for ai-skills.
 *
 * Reads the unified skill.md and extracts the runtime API sections
 * to generate the MCP server prompt file.
 *
 * Run:  npx tsx build.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const skill = readFileSync(resolve(__dirname, 'skill.md'), 'utf-8');

// Extract everything from "## Schema Introspection" to the end of the file,
// which covers the runtime API reference (schema, auth, entity, queries, assets).
const runtimeStart = skill.indexOf('## Schema Introspection');
if (runtimeStart === -1) {
    console.error('❌ Could not find "## Schema Introspection" section in skill.md');
    process.exit(1);
}
const runtimeContent = skill.slice(runtimeStart).trim();

// Escape backticks and ${} for embedding in a template literal
const escaped = runtimeContent
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');

function write(relPath: string, content: string) {
    const abs = resolve(__dirname, relPath);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content, 'utf-8');
    console.log(`  ✓ ${relPath}`);
}

const mcpPromptTs = `import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const API_REFERENCE = \`
# FormCMS API Reference

${escaped}
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

console.log('\n✅ MCP prompt file generated from skill.md');
