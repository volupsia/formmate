import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FormCmsApiClient } from '@formmate/shared';
import { registerSchemaTools } from './tools/schema.js';
import { registerEntityTools } from './tools/entity.js';
import { registerQueryTools } from './tools/query.js';
import { registerSchemaResources } from './resources/schemas.js';
import { registerSchemaPrompts } from './prompts/entity-designer.js';

export function createMcpServer(client: FormCmsApiClient): McpServer {
    const server = new McpServer({
        name: 'formcms-mcp',
        version: '1.0.0',
    });

    // Tools — actions the LLM can call
    registerSchemaTools(server, client);
    registerEntityTools(server, client);
    registerQueryTools(server, client);

    // Resources — static context the LLM can read
    registerSchemaResources(server);

    // Prompts — reusable prompt templates
    registerSchemaPrompts(server);

    return server;
}
