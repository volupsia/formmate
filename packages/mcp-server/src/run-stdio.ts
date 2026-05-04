import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './mcp-server.js';
import { McpFormCmsClientBuilder } from './infrastructure/formcms-client.js';
import { config } from './config.js';
import { requestContext } from './context.js';

async function start() {
    try {
        // Build FormCMS HTTP client
        // Provide the hardcoded api key for now, since STDIO doesn't easily pass headers
        const formcmsClientBuilder = new McpFormCmsClientBuilder(
            config.FORMCMS_BASE_URL,
            () => '5a6bc4dac3a73de3aa1971f02dccd8cd73f8139561174a3d',
            () => ''
        );

        const transport = new StdioServerTransport();
        const mcpServer = createMcpServer(
            formcmsClientBuilder,
            'stdio-session',
            new Map(),
            new Map()
        );

        await mcpServer.connect(transport);
        console.error('🤖 FormCMS MCP Server ready (STDIO transport)');
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

start();
