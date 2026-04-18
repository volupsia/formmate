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
        `Save or update a FormCMS named query.

IMPORTANT: Before using this tool, call get_graphql_sdl first to retrieve the full GraphQL SDL schema so you understand the available types, fields, and arguments.

Query-building rules:
- Operation names MUST be camelCase (no PascalCase, snake_case, or kebab-case).
- Use simple scalar types (Int, String, etc.) for operation variables. Do NOT use complex Clause types (e.g. IntClause) as variable definitions.
- For simple matching, prefer arguments ending with "Set" (e.g. idSet: [$id]). Use Clause-style arguments (e.g. id: [{ equals: $id }]) ONLY for complex comparisons (contains, gt, lt).
- Clause arguments must strictly match the SDL definition (usually an object wrapped in a list).
- Always use the defined primary key for record-specific lookups.
- The Sysasset type is a complex object — always select subfields (e.g. { id name url }), never query it as a scalar.
- Do NOT include offset or limit arguments — these are built-in and handled automatically.
- Sort arguments must use predefined inline values (e.g. sort: [idDesc, nameAsc]), NOT variables.`,
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

    server.tool(
        'get_query',
        'Get a FormCMS named query definition by its name.',
        {
            name: z.string().describe('The name of the query to retrieve'),
        },
        async ({ name }) => {
            const data = await client.getSchemaByName(name, 'query');
            return {
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            };
        }
    );

    server.tool(
        'delete_query',
        'Delete a FormCMS named query by its numeric id. Use list_queries first to find the id.',
        {
            id: z.number().int().positive().describe('Numeric id of the query schema to delete'),
        },
        async ({ id }) => {
            await client.deleteSchema(id);
            return {
                content: [{ type: 'text', text: `Query schema ${id} deleted successfully.` }],
            };
        }
    );
}
