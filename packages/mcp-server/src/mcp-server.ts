import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormCmsClient } from './formcms-client.js';
import { registerSchemaTools } from './tools/schema.js';
import { registerEntityTools } from './tools/entity.js';
import { registerQueryTools } from './tools/query.js';

export function createMcpServer(client: FormCmsClient): McpServer {
    const server = new McpServer({
        name: 'formcms-mcp',
        version: '1.0.0',
    });

    registerSchemaTools(server, client);
    registerEntityTools(server, client);
    registerQueryTools(server, client);

    return server;
}
