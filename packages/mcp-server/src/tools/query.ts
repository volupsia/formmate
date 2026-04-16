import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { FormCmsApiClient, QueryOperator } from '@formmate/shared';

export function registerQueryTools(server: McpServer, client: FormCmsApiClient, queryOperator: QueryOperator) {
    server.tool(
        'get_graphql_sdl',
        'Retrieve the complete GraphQL Schema Definition Language (SDL) for the FormCMS backend. Use this when you need schema context to write queries.',
        {},
        async () => {
            const sdl = await queryOperator.generateSDL(''); 
            return {
                content: [{ type: 'text', text: sdl }],
            };
        }
    );

    server.tool(
        'run_query',
        'Execute a FormCMS named query and return the results.',
        {
            queryName: z.string().describe('The name of the named query to run (e.g. "postList")'),
            params: z.record(z.string()).optional().describe(
                'Optional query parameters as key/value pairs, e.g. { "limit": "10", "offset": "0" }'
            ),
        },
        async ({ queryName, params }) => {
            const data = await client.runQuery(queryName, params ?? {});
            return {
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            };
        }
    );

    server.tool(
        'save_query',
        'Save or update a FormCMS named query.',
        {
            schemaId: z.string().describe('The schema ID of the query (leave empty string to create a new one)'),
            queryName: z.string().describe('The name of the named query to save'),
            query: z.string().describe('The GraphQL query source'),
        },
        async ({ schemaId, queryName, query }) => {
            const result = await client.saveQuery(schemaId, queryName, query);
            return {
                content: [{ type: 'text', text: `Query saved successfully. Schema ID: ${result}` }],
            };
        }
    );

    server.tool(
        'list_queries',
        'List all named queries defined in FormCMS.',
        {},
        async () => {
            const data = await client.listSchemas('query');
            return {
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            };
        }
    );
}
