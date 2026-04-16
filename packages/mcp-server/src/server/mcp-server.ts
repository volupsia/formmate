import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type FormCmsApiClient, EntityOperator, QueryOperator, type IFormCmsClientBuilder } from '@formmate/shared';
import { registerSchemaTools } from './tools/schema.js';
import { registerEntityTools } from './tools/entity.js';
import { registerQueryTools } from './tools/query.js';
import { registerSchemaResources } from './resources/schemas.js';
import { registerSchemaPrompts } from './prompts/entity-designer.js';
import { registerQueryPrompts } from './prompts/query-builder.js';

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

    // Resources — static context the LLM can read
    registerSchemaResources(server);

    // Prompts — reusable prompt templates
    registerSchemaPrompts(server);
    registerQueryPrompts(server);

    return server;
}
