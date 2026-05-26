import express from 'express';
import cors from 'cors';
import { Readable } from 'node:stream';
import crypto from 'node:crypto';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
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

// Populate per-request context:
//  - apiKey: from Authorization: Bearer header (for testing/CI)
app.use((req, res, next) => {
    const auth    = req.headers.authorization ?? '';
    const apiKey  = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    requestContext.run({ apiKey, cookie: '', baseUrl }, next);
});

async function start() {
    try {
        // Build FormCMS HTTP client
        // Session cookie is injected per-request from the in-memory sessionCookies map
        // via AsyncLocalStorage (see middleware above).
        const formcmsClientBuilder = new McpFormCmsClientBuilder(
            config.FORMCMS_BASE_URL,
            () => requestContext.getStore()?.apiKey,
            () => requestContext.getStore()?.cookie,
        );
        const transports = new Map<string, SSEServerTransport>();

        app.get('/mcp/sse', async (req, res) => {
            // Include sessionId in both the path and query parameters
            // - The path prevents issues with clients that strip query parameters
            // - The query parameter prevents issues with clients that strictly parse it from the query
            const sessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7);
            const absoluteEndpoint = `http://${req.get('host')}/mcp/messages/${sessionId}?sessionId=${sessionId}&session_id=${sessionId}`;
            const transport = new SSEServerTransport(absoluteEndpoint, res);
            // Override the generated sessionId with our own since SSEServerTransport doesn't accept one
            (transport as any)._sessionId = sessionId;
            
            // PATCH: Override start() to force sending an absolute URL
            // because the Antigravity Go client drops relative URLs and falls back to POSTing to /mcp/sse.
            const originalStart = transport.start.bind(transport);
            transport.start = async () => {
                if ((transport as any)._sseResponse) {
                    throw new Error('SSEServerTransport already started!');
                }
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache, no-transform',
                    Connection: 'keep-alive'
                });
                res.write(`event: endpoint\ndata: ${absoluteEndpoint}\n\n`);
                (transport as any)._sseResponse = res;
                res.on('close', () => {
                    (transport as any)._sseResponse = undefined;
                    transport.onclose?.();
                });
            };

            
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
        app.post(['/mcp/messages', '/mcp/messages/:sessionId'], express.raw({ type: 'application/json', limit: config.FORMCMS_MAX_REQUEST_SIZE }), async (req, res) => {
            console.log(`[messages] req.url=${req.url}, req.originalUrl=${req.originalUrl}, req.params.sessionId=${req.params.sessionId}, req.query.sessionId=${req.query.sessionId}`);
            const sessionId = req.params.sessionId || req.query.sessionId as string;
            const transport = transports.get(sessionId);
            if (!transport) {
                console.error(`Session not found for sessionId: "${sessionId}"`);
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

        // ── Streamable HTTP transport (modern) ─────────────────────────
        // Single endpoint for clients that speak Streamable HTTP (Codex, etc.)
        // Runs in stateless mode — each request gets its own server instance.
        app.post('/mcp', express.json(), async (req, res) => {
            try {
                const transport = new StreamableHTTPServerTransport() as any;
                const mcpServer = createMcpServer(formcmsClientBuilder);

                res.on('close', async () => {
                    try {
                        await transport.close();
                        await mcpServer.close();
                    } catch { /* ignore cleanup errors */ }
                });

                await mcpServer.connect(transport);
                await transport.handleRequest(req, res, req.body);
            } catch (err) {
                console.error('Streamable HTTP error:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Internal server error' });
                }
            }
        });

        // GET and DELETE on /mcp are not used in stateless mode
        app.get('/mcp', (_req, res) => {
            res.status(405).set('Allow', 'POST').send('Method Not Allowed');
        });
        app.delete('/mcp', (_req, res) => {
            res.status(405).set('Allow', 'POST').send('Method Not Allowed');
        });

        app.get('/mcp/health', (req, res) => {
            res.json({ status: 'ok', service: 'formcms-mcp-server' });
        });

        const SERVER_START_TIME = new Date().toLocaleString();
        app.get('/mcp/admin', (req, res) => {
            res.send(adminHtml.replace('{{SERVER_START_TIME}}', SERVER_START_TIME));
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
            console.log(`   Streamable HTTP : http://localhost:${config.PORT}/mcp`);
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
