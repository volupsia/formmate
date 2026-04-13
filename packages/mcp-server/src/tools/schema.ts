import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { FormCmsClient } from '../formcms-client.js';

// ─── Zod schemas mirroring mate-service/resources/schemas/*.json ──────────────

const AttributeSchema = z.object({
    field: z
        .string()
        .min(1)
        .describe('Internal field name (camelCase). Do NOT use reserved names: id, status, publishedAt, createdAt, updatedAt.'),
    header: z
        .string()
        .min(1)
        .describe('Human-readable label shown in the UI'),
    displayType: z
        .enum([
            'text', 'textarea', 'editor', 'number',
            'localDatetime', 'datetime', 'date',
            'image', 'gallery', 'file',
            'dictionary', 'dropdown', 'multiselect',
        ])
        .describe(
            'UI display/edit widget. Use "dropdown" or "multiselect" ONLY when options are provided. ' +
            '"select" is forbidden.'
        ),
    validation: z
        .string()
        .describe(
            'Regex for input validation. Use simple character-set patterns (e.g. "^[A-Za-z]+$"). ' +
            'NO lookaheads/lookbehinds. For image/gallery/file fields use ".*".'
        ),
    options: z
        .string()
        .describe(
            'Comma-separated option values, e.g. "Draft,Published,Archived". ' +
            'Required for dropdown/multiselect; leave empty for all other types.'
        ),
    inList: z
        .boolean()
        .default(true)
        .describe('Show this field in list/table views'),
    inDetail: z
        .boolean()
        .default(true)
        .describe('Show this field on the detail/edit page'),
});

const RelationshipSchema = z.object({
    sourceEntity: z.string().describe('The entity where this relationship originates (camelCase)'),
    targetEntity: z.string().describe('The related entity (camelCase)'),
    fieldName: z
        .string()
        .describe(
            'Field name on the source entity that represents this relationship (camelCase). ' +
            'Do NOT create a matching attribute — relationships must NOT be modelled as attributes.'
        ),
    label: z.string().optional().describe('Human-readable label for this relationship in the UI'),
    cardinality: z
        .enum(['oneToMany', 'manyToOne', 'manyToMany'])
        .describe(
            'Cardinality from sourceEntity → targetEntity. ' +
            '"manyToOne" means the source holds the foreign key.'
        ),
});

const EntitySchema = z.object({
    name: z
        .string()
        .min(1)
        .describe('Internal entity name (camelCase). Forbidden: "User", "Comment".'),
    displayName: z
        .string()
        .min(1)
        .describe('Human-readable name shown in the UI'),
    tableName: z
        .string()
        .min(1)
        .describe('Database table name (usually same as name, camelCase)'),
    labelAttributeName: z
        .string()
        .min(1)
        .describe('The attribute used as the primary label in lists and dropdowns'),
    attributes: z
        .array(AttributeSchema)
        .min(1)
        .describe('Scalar fields for this entity. Do NOT include relationship fields here.'),
});

/** Full design payload: one or more entities plus their relationships */
const EntityDesignPayload = z.object({
    entities: z
        .array(EntitySchema)
        .min(1)
        .describe('Entities to create or update'),
    relationships: z
        .array(RelationshipSchema)
        .describe(
            'Cross-entity relationships. Must NOT be duplicated inside attributes. ' +
            'Pass an empty array [] when there are no relationships.'
        ),
});

// ─── Tool registration ────────────────────────────────────────────────────────

export function registerSchemaTools(server: McpServer, client: FormCmsClient) {
    // List all schemas of a given type
    server.tool(
        'list_schemas',
        'List all FormCMS schemas. Use type="entity" for data entities, type="query" for named queries.',
        {
            type: z.enum(['entity', 'query']).default('entity').describe('Schema type to list'),
        },
        async ({ type }) => {
            const data = await client.listSchemas(type);
            return {
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            };
        }
    );

    // Get a schema by name
    server.tool(
        'get_schema',
        'Get a FormCMS schema definition by its name.',
        {
            name: z.string().describe('Schema name (e.g. "post", "category")'),
            type: z.enum(['entity', 'query']).default('entity').describe('Schema type'),
        },
        async ({ name, type }) => {
            const data = await client.getSchemaByName(name, type);
            return {
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            };
        }
    );

    // Get expanded entity definition (attributes, relations, etc.)
    server.tool(
        'get_entity_definition',
        'Get the full expanded entity definition including all attributes, lookups, and junctions.',
        {
            entityName: z.string().describe('Entity name (e.g. "post")'),
        },
        async ({ entityName }) => {
            const data = await client.getXEntity(entityName);
            return {
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            };
        }
    );

    // Save / update a raw schema (advanced / low-level)
    server.tool(
        'save_schema',
        [
            'Create or update a raw FormCMS schema record (low-level). Provide the full schema payload.',
            'Prefer define_entity for structured entity creation — this tool is for advanced use only.',
        ].join(' '),
        {
            payload: z
                .record(z.unknown())
                .describe(
                    'Raw schema payload. Include schemaId for updates; omit it for new schemas. ' +
                    'Consult the schema://formcms/entity-design resource for the expected shape.'
                ),
        },
        async ({ payload }) => {
            const data = await client.saveSchema(payload);
            return {
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            };
        }
    );

    // Define / update entity structure (strongly typed)
    server.tool(
        'define_entity',
        [
            'Define or update FormCMS entity schemas (attributes + relationships) and apply them to the database.',
            'Always read the schema://formcms/entity-design resource first to understand the required shape.',
            'Use the design-entity prompt to generate a valid payload from a natural language description.',
        ].join(' '),
        {
            payload: EntityDesignPayload.describe(
                'Entity design payload with entities[] and relationships[]. ' +
                'Use the design-entity prompt or schema://formcms/entity-design resource for the exact shape.'
            ),
        },
        async ({ payload }) => {
            const data = await client.saveEntityDefine(payload);
            return {
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            };
        }
    );
}
