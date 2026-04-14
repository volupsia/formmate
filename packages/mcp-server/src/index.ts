import express from 'express';
import cors from 'cors';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { config } from './config.js';
import { McpFormCmsClientBuilder } from './formcms-client.js';
import { createMcpServer } from './mcp-server.js';
import { requestContext } from './context.js';

const app = express();

app.use(cors({
    origin: true,
    credentials: true,
}));

// Extract API key from standard Authorization: Bearer header (RFC 6750)
app.use((req, res, next) => {
    const auth = req.headers.authorization ?? '';
    const apiKey = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    requestContext.run({ apiKey }, next);
});

async function start() {
    try {
        // Build FormCMS HTTP client
        // API key is injected per-request from headers via AsyncLocalStorage (see middleware above)
        const formcmsClientBuilder = new McpFormCmsClientBuilder(config.FORMCMS_BASE_URL);
        const mcpServer = createMcpServer(formcmsClientBuilder);

        const transports = new Map<string, SSEServerTransport>();

        app.get('/sse', async (req, res) => {
            const transport = new SSEServerTransport('/messages', res);
            transports.set(transport.sessionId, transport);
            console.log(`📡 New SSE session: ${transport.sessionId}`);

            // Clean up when the client disconnects
            res.on('close', () => {
                console.log(`🔌 SSE session closed: ${transport.sessionId}`);
                transports.delete(transport.sessionId);
            });

            await mcpServer.connect(transport);
        });

        app.post('/messages', async (req, res) => {
            const sessionId = req.query.sessionId as string;
            const transport = transports.get(sessionId);
            if (!transport) {
                res.status(404).send('Session not found');
                return;
            }
            await transport.handlePostMessage(req, res);
        });

        app.get('/health', (req, res) => {
            res.json({ status: 'ok', service: 'formcms-mcp-server' });
        });

        app.listen(config.PORT, () => {
            console.log(`🤖 FormCMS MCP Server ready`);
            console.log(`   Legacy SSE      : http://localhost:${config.PORT}/sse`);
            console.log(`   Messages        : http://localhost:${config.PORT}/messages`);
            console.log(`   Health          : http://localhost:${config.PORT}/health`);
            console.log(`   Upstream        : ${config.FORMCMS_BASE_URL}`);
        });
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

start();
