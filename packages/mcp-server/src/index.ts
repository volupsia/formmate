import express from 'express';
import cors from 'cors';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { config } from './config.js';
import { McpFormCmsClientBuilder } from './formcms-client.js';
import { createMcpServer } from './mcp-server.js';
import { requestContext } from './context.js';
import { EventEmitter } from 'events';
import { adminHtml } from './admin-ui.js';
import { insertLog, getRecentLogs } from './db.js';

const logEmitter = new EventEmitter();

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

            // 1. Intercept outgoing messages (Server -> Client)
            const originalSend = transport.send.bind(transport);
            transport.send = async (message) => {
                const timestamp = new Date().toISOString();
                logEmitter.emit('log', { timestamp, type: 'outgoing', sessionId: transport.sessionId, message });
                insertLog(timestamp, 'outgoing', transport.sessionId, message);
                return originalSend(message);
            };

            // 2. Intercept incoming messages (Client -> Server)
            const originalOnMessage = transport.onmessage?.bind(transport);
            if (originalOnMessage) {
                transport.onmessage = async (message) => {
                    const timestamp = new Date().toISOString();
                    logEmitter.emit('log', { timestamp, type: 'incoming', sessionId: transport.sessionId, message });
                    insertLog(timestamp, 'incoming', transport.sessionId, message);
                    return originalOnMessage(message);
                };
            }
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

        app.get('/admin', (req, res) => {
            res.send(adminHtml);
        });

        app.get('/admin/history', (req, res) => {
            const limit = parseInt(req.query.limit as string) || 200;
            res.json(getRecentLogs(limit));
        });

        app.get('/admin/stream', (req, res) => {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            
            // Ensure connection stays open
            res.flushHeaders();

            const onLog = (logData: any) => {
                res.write(`data: ${JSON.stringify(logData)}\n\n`);
            };
            
            logEmitter.on('log', onLog);
            
            res.on('close', () => {
                logEmitter.off('log', onLog);
            });
        });

        app.listen(config.PORT, () => {
            console.log(`🤖 FormCMS MCP Server ready`);
            console.log(`   Legacy SSE      : http://localhost:${config.PORT}/sse`);
            console.log(`   Messages        : http://localhost:${config.PORT}/messages`);
            console.log(`   Health          : http://localhost:${config.PORT}/health`);
            console.log(`   Live Logs UI    : http://localhost:${config.PORT}/admin`);
            console.log(`   Upstream        : ${config.FORMCMS_BASE_URL}`);
        });
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

start();
