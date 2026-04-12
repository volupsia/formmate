import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { FormCmsClient } from '../formcms-client.js';

export function registerEntityTools(server: McpServer, client: FormCmsClient) {
    // List records
    server.tool(
        'list_entities',
        'List records from a FormCMS entity with optional filters, sorting, and pagination.',
        {
            schemaName: z.string().describe('Entity schema name (e.g. "post")'),
            filters: z.record(z.string()).optional().describe(
                'Key/value filter pairs. Use field[operator]=value syntax, e.g. { "status[equals]": "published", "limit": "10", "offset": "0" }'
            ),
        },
        async ({ schemaName, filters }) => {
            const data = await client.listEntities(schemaName, filters ?? {});
            return {
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            };
        }
    );

    // Get single record
    server.tool(
        'get_entity',
        'Get a single record from a FormCMS entity by its ID.',
        {
            schemaName: z.string().describe('Entity schema name (e.g. "post")'),
            id: z.string().describe('Record ID'),
        },
        async ({ schemaName, id }) => {
            const data = await client.getEntity(schemaName, id);
            return {
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            };
        }
    );

    // Insert record
    server.tool(
        'insert_entity',
        'Insert a new record into a FormCMS entity.',
        {
            schemaName: z.string().describe('Entity schema name (e.g. "post")'),
            data: z.record(z.unknown()).describe('Record fields as key/value pairs'),
        },
        async ({ schemaName, data }) => {
            const result = await client.insertEntity(schemaName, data);
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
        }
    );

    // Update record
    server.tool(
        'update_entity',
        'Update an existing record in a FormCMS entity. The data object must include the primary key.',
        {
            schemaName: z.string().describe('Entity schema name (e.g. "post")'),
            data: z.record(z.unknown()).describe('Record fields including primary key'),
        },
        async ({ schemaName, data }) => {
            const result = await client.updateEntity(schemaName, data);
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
        }
    );

    // Delete record
    server.tool(
        'delete_entity',
        'Delete a record from a FormCMS entity.',
        {
            schemaName: z.string().describe('Entity schema name (e.g. "post")'),
            data: z.record(z.unknown()).describe('Object containing the primary key of the record to delete'),
        },
        async ({ schemaName, data }) => {
            const result = await client.deleteEntity(schemaName, data);
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
        }
    );
}
