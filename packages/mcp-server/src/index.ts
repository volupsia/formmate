import Fastify from 'fastify';
import cors from '@fastify/cors';
import FastifyMcp from 'fastify-mcp';
import { config } from './config.js';
import { FormCmsClient } from './formcms-client.js';
import { createMcpServer } from './mcp-server.js';

const server = Fastify({
    logger: {
        level: config.LOG_LEVEL,
        transport: {
            target: 'pino-pretty',
            options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
            },
        },
    },
});

async function start() {
    try {
        await server.register(cors, {
            origin: true,
            credentials: true,
        });

        // Build FormCMS HTTP client (API key auth)
        const formcmsClient = new FormCmsClient(config.FORMCMS_BASE_URL, config.FORMCMS_API_KEY);

        // Build MCP server with all tools
        const mcpServer = createMcpServer(formcmsClient);

        // Register fastify-mcp — exposes:
        //   POST /mcp         → Streamable HTTP (modern clients)
        //   GET  /sse         → Legacy SSE connection
        //   POST /messages    → Legacy SSE message post
        await server.register(FastifyMcp, {
            server: mcpServer,
        });

        server.get('/health', async () => ({ status: 'ok', service: 'formcms-mcp-server' }));

        await server.listen({ port: config.PORT, host: '0.0.0.0' });
        console.log(`🤖 FormCMS MCP Server ready`);
        console.log(`   Streamable HTTP : http://localhost:${config.PORT}/mcp`);
        console.log(`   Legacy SSE      : http://localhost:${config.PORT}/sse`);
        console.log(`   Health          : http://localhost:${config.PORT}/health`);
        console.log(`   Upstream        : ${config.FORMCMS_BASE_URL}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
}

start();
