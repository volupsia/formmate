import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { FormCmsApiClient } from '@formmate/shared';

export function registerQueryTools(server: McpServer, client: FormCmsApiClient) {
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
