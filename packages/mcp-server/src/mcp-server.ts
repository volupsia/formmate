import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { EntityOperator, QueryOperator, type IFormCmsClientBuilder } from '@formmate/shared';
import { registerSchemaTools } from './tools/schema.js';
import { registerEntityTools } from './tools/entity.js';
import { registerQueryTools } from './tools/query.js';
import { registerAuthPrompts } from './prompts/auth.js';

export function createMcpServer(clientBuilder: IFormCmsClientBuilder): McpServer {
    const server = new McpServer({
        name: 'formcms-mcp',
        version: '1.0.0',
    });

    const client = clientBuilder.getClient('');
    const entityOperator = new EntityOperator(clientBuilder, console);
    const queryOperator = new QueryOperator(clientBuilder);

    // Tools — actions the LLM can call
    registerSchemaTools(server, client, entityOperator);
    registerEntityTools(server, client);
    registerQueryTools(server, client, queryOperator);

    // Prompts — API references for MCP clients building apps
    registerAuthPrompts(server);

    return server;
}
