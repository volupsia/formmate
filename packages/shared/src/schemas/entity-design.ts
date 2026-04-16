// ─── Entity-Design Shared Constants ──────────────────────────────────────────
//
// Single source of truth for:
//   • JSON Schemas used to validate entity/attribute/relationship payloads
//   • The entity-designer LLM system prompt
//
// Consumers:
//   • @formmate/service  — reads these at startup instead of fs.readFile
//   • @formmate/mcp-server — exposes them as MCP Resources + Prompt template

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── JSON Schema Loading ─────────────────────────────────────────────────────

const loadJson = (fileName: string) => JSON.parse(fs.readFileSync(path.join(__dirname, fileName), 'utf-8'));

export const ATTRIBUTE_JSON_SCHEMA = loadJson('attribute.json');

export const ENTITY_JSON_SCHEMA = {
    ...loadJson('entity.json'),
    properties: {
        ...loadJson('entity.json').properties,
        attributes: {
            ...loadJson('entity.json').properties.attributes,
            items: ATTRIBUTE_JSON_SCHEMA,
        },
    },
};

export const RELATIONSHIP_JSON_SCHEMA = loadJson('relationship.json');

export const ENTITY_DESIGN_JSON_SCHEMA = {
    ...loadJson('entity-design.json'),
    definitions: {
        attribute: ATTRIBUTE_JSON_SCHEMA,
        entity: ENTITY_JSON_SCHEMA,
        relationship: RELATIONSHIP_JSON_SCHEMA,
    },
};

// Convenience: JSON strings (drop-in replacement for fs.readFile output)
export const ATTRIBUTE_JSON_SCHEMA_STR = JSON.stringify(ATTRIBUTE_JSON_SCHEMA, null, 2);
export const ENTITY_JSON_SCHEMA_STR = JSON.stringify(ENTITY_JSON_SCHEMA, null, 2);
export const RELATIONSHIP_JSON_SCHEMA_STR = JSON.stringify(RELATIONSHIP_JSON_SCHEMA, null, 2);

// ─── Entity-Designer LLM System Prompt ───────────────────────────────────────
// Single source of truth for the entity-designer prompt. Read directly from the unified Markdown file.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ENTITY_DESIGNER_PROMPT = fs.readFileSync(path.join(__dirname, 'entity-designer.md'), 'utf-8');
