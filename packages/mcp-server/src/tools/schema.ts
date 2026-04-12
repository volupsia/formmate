import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { FormCmsClient } from '../formcms-client.js';

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

    // Save / update a schema
    server.tool(
        'save_schema',
        'Create or update a FormCMS schema. Provide the full schema payload.',
        {
            payload: z.record(z.unknown()).describe('Schema payload object (schemaId optional for new, required for update)'),
        },
        async ({ payload }) => {
            const data = await client.saveSchema(payload);
            return {
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            };
        }
    );

    // Define / update entity structure
    server.tool(
        'define_entity',
        'Define or redefine an entity schema (attributes, types, display settings). This applies the schema to the database.',
        {
            payload: z.record(z.unknown()).describe('Entity define payload'),
        },
        async ({ payload }) => {
            const data = await client.saveEntityDefine(payload);
            return {
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            };
        }
    );
}
