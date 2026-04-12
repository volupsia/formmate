import express from 'express';
import cors from 'cors';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { config } from './config.js';
import { FormCmsClient } from './formcms-client.js';
import { createMcpServer } from './mcp-server.js';
import { requestContext } from './context.js';

const app = express();

app.use(cors({
    origin: true,
    credentials: true,
}));

// Apply AsyncLocalStorage middleware
app.use((req, res, next) => {
    let apiKey = req.headers['x-api-key'] as string | '';
    if (!apiKey && req.headers.authorization?.startsWith('Bearer ')) {
        apiKey = req.headers.authorization.substring(7);
    }
    requestContext.run({ apiKey }, next);
});

async function start() {
    try {
        // Build FormCMS HTTP client
        const formcmsClient = new FormCmsClient(config.FORMCMS_BASE_URL, config.FORMCMS_API_KEY);
        const mcpServer = createMcpServer(formcmsClient);

        let transport: SSEServerTransport;

        app.get('/sse', async (req, res) => {
            transport = new SSEServerTransport('/messages', res);
            await mcpServer.connect(transport);
        });

        app.post('/messages', async (req, res) => {
            if (!transport) {
                res.status(500).send('Session not initialized');
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
