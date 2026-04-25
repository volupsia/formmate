import express from 'express';
import cors from 'cors';
import { Readable } from 'node:stream';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { config } from './config.js';
import { McpFormCmsClientBuilder } from './infrastructure/formcms-client.js';
import { createMcpServer } from './mcp-server.js';
import { requestContext } from './context.js';
import { EventEmitter } from 'events';
import { adminHtml } from './ui/admin-ui.js';
import { insertLog, getRecentLogs, clearAllLogs } from './infrastructure/db.js';

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
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    requestContext.run({ apiKey, baseUrl }, next);
});

async function start() {
    try {
        // Build FormCMS HTTP client
        // API key is injected per-request from headers via AsyncLocalStorage (see middleware above)
        const formcmsClientBuilder = new McpFormCmsClientBuilder(
            config.FORMCMS_BASE_URL,
            () => requestContext.getStore()?.apiKey
        );
        const transports = new Map<string, SSEServerTransport>();

        app.get('/mcp/sse', async (req, res) => {
            const transport = new SSEServerTransport('/mcp/messages', res);
            transports.set(transport.sessionId, transport);
            console.log(`📡 New SSE session: ${transport.sessionId}`);

            const mcpServer = createMcpServer(formcmsClientBuilder);

            // Clean up when the client disconnects
            res.on('close', async () => {
                console.log(`🔌 SSE session closed: ${transport.sessionId}`);
                transports.delete(transport.sessionId);
                try {
                    await mcpServer.close();
                } catch (err) {
                    console.error('Error closing MCP server:', err);
                }
            });

            // Intercept outgoing messages BEFORE connect() so no message is missed
            const originalSend = transport.send.bind(transport);
            transport.send = async (message) => {
                const timestamp = new Date().toISOString();
                logEmitter.emit('log', { timestamp, type: 'outgoing', sessionId: transport.sessionId, message });
                insertLog(timestamp, 'outgoing', transport.sessionId, message);
                return originalSend(message);
            };

            await mcpServer.connect(transport);
        });

        // Use express.raw() to buffer the body so we can log it AND still pass
        // it to handlePostMessage (which reads the stream internally)
        app.post('/mcp/messages', express.raw({ type: 'application/json' }), async (req, res) => {
            const sessionId = req.query.sessionId as string;
            const transport = transports.get(sessionId);
            if (!transport) {
                res.status(404).send('Session not found');
                return;
            }
            const rawBody = req.body as Buffer;
            // Log the incoming message
            if (rawBody?.length) {
                const timestamp = new Date().toISOString();
                try {
                    const parsed = JSON.parse(rawBody.toString('utf-8'));
                    logEmitter.emit('log', { timestamp, type: 'incoming', sessionId, message: parsed });
                    insertLog(timestamp, 'incoming', sessionId, parsed);
                } catch { /* ignore parse errors */ }
            }
            // Reconstruct a readable stream from the buffered body for the SDK
            const fakeReq = Object.assign(
                new Readable({ read() {} }),
                { headers: req.headers, method: req.method, url: req.url }
            );
            fakeReq.push(rawBody ?? Buffer.alloc(0));
            fakeReq.push(null);
            await transport.handlePostMessage(fakeReq as any, res);
        });

        app.get('/mcp/health', (req, res) => {
            res.json({ status: 'ok', service: 'formcms-mcp-server' });
        });

        app.get('/mcp/admin', (req, res) => {
            res.send(adminHtml);
        });

        app.get('/mcp/admin/history', (req, res) => {
            const limit = parseInt(req.query.limit as string) || 200;
            res.json(getRecentLogs(limit));
        });

        app.delete('/mcp/admin/history', (req, res) => {
            clearAllLogs();
            res.json({ status: 'ok' });
        });

        app.get('/mcp/admin/stream', (req, res) => {
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
            console.log(`   Legacy SSE      : http://localhost:${config.PORT}/mcp/sse`);
            console.log(`   Messages        : http://localhost:${config.PORT}/mcp/messages`);
            console.log(`   Health          : http://localhost:${config.PORT}/mcp/health`);
            console.log(`   Live Logs UI    : http://localhost:${config.PORT}/mcp/admin`);
            console.log(`   Upstream        : ${config.FORMCMS_BASE_URL}`);
        });
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

start();
