import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { requestContext } from '../context.js';
import type { FormCmsApiClient } from '@formmate/shared';

/**
 * Registers system-level tools that expose server configuration.
 */
export function registerSystemTools(server: McpServer, client: FormCmsApiClient): void {

    // ─── Server Info ───────────────────────────────────────────────────────────

    server.tool(
        'get_server_info',
        [
            'Returns the FormCMS server configuration — most importantly the base URL of the FormCMS backend.',
            'Call this FIRST before generating vite.config.ts or any other configuration file.',
            'Use the returned formcmsBaseUrl as the proxy target for /api and /files routes.',
            'Also returns the API key for direct REST API calls (e.g. SPA deployment, asset uploads).',
        ].join(' '),
        {},
        async () => {
            const store = requestContext.getStore();
            const baseUrl = store?.baseUrl;
            const apiKey = store?.apiKey;
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            {
                                formcmsBaseUrl: baseUrl,
                                apiKey: apiKey || null,
                                note: 'Use formcmsBaseUrl as the proxy target for /api and /files in vite.config.ts',
                                directApiAccess: {
                                    description: 'For operations that require binary uploads (e.g. SPA deployment, file uploads), call the FormCMS REST API directly using curl with the Authorization: Bearer header instead of MCP tools.',
                                    authHeader: 'Authorization: Bearer <apiKey>',
                                    spaEndpoints: {
                                        deploy: 'POST /api/system/add-spa (multipart: file, path, dir)',
                                        list: 'GET /api/system/spas',
                                        delete: 'DELETE /api/system/spas?path=<urlPath>',
                                        rename: 'PUT /api/system/spas?oldPath=<old>&newPath=<new>',
                                    },
                                },
                            },
                            null,
                            2
                        ),
                    },
                ],
            };
        }
    );
}
