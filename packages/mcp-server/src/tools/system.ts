import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { config } from '../config.js';
import { requestContext } from '../context.js';
import type { FormCmsApiClient } from '@formmate/shared';

/**
 * Registers system-level tools that expose server configuration and
 * administrative capabilities such as serving Single Page Applications (SPAs).
 */
export function registerSystemTools(server: McpServer, client: FormCmsApiClient): void {

    // ─── Server Info ───────────────────────────────────────────────────────────

    server.tool(
        'get_server_info',
        [
            'Returns the FormCMS server configuration — most importantly the base URL of the FormCMS backend.',
            'Call this FIRST before generating vite.config.ts or any other configuration file.',
            'Use the returned formcmsBaseUrl as the proxy target for /api and /files routes.',
            'Also describes the SPA hosting feature: FormCMS can serve arbitrary Single Page Applications',
            'at custom URL paths by uploading a ZIP of the build artifacts via the deploy_spa tool.',
        ].join(' '),
        {},
        async () => {
            const baseUrl = requestContext.getStore()?.baseUrl;
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            {
                                formcmsBaseUrl: baseUrl,
                                note: 'Use formcmsBaseUrl as the proxy target for /api and /files in vite.config.ts',
                                spaHosting: {
                                    description: 'FormCMS can serve Single Page Applications at configurable URL prefixes.',
                                    deployTool: 'deploy_spa',
                                    listEndpoint: 'GET /api/system/spas',
                                    deleteEndpoint: 'DELETE /api/system/spas?path=<urlPath>',
                                    renamEndpoint: 'PUT /api/system/spas?oldPath=<old>&newPath=<new>',
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

    // ─── Deploy SPA ────────────────────────────────────────────────────────────

    server.tool(
        'deploy_spa',
        [
            'Deploys a Single Page Application (SPA) to the FormCMS server so it can be served at a custom URL path.',
            'The SPA build output (e.g. the "dist" or "build" folder) must be zipped into a single .zip file before calling this tool.',
            'After deployment the SPA is immediately accessible at the configured urlPath on the FormCMS host.',
            'Use list_spas to see currently installed SPAs and their URL paths.',
        ].join(' '),
        {
            zipBase64: z.string().describe(
                'Base64-encoded contents of the .zip file containing the SPA build artifacts (index.html, assets/, etc.).'
            ),
            zipFilename: z.string().describe(
                'Original filename of the zip (e.g. "my-app.zip"). Used as a hint for the server.'
            ),
            urlPath: z.string().describe(
                'The URL prefix at which the SPA will be served, e.g. "/dashboard" or "/blog".'
            ),
            directory: z.string().describe(
                'Server-side directory name where the files will be extracted, e.g. "dashboard_v1". Must be unique.'
            ),
        },
        async ({ zipBase64, zipFilename, urlPath, directory }) => {
            const binaryStr = atob(zipBase64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'application/zip' });

            const formData = new FormData();
            formData.append('file', blob, zipFilename);
            formData.append('path', urlPath);
            formData.append('dir', directory);

            const resp = await client.axios.post('/api/system/add-spa', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            {
                                success: true,
                                urlPath,
                                directory,
                                message: `SPA deployed successfully at ${urlPath}`,
                                response: resp.data,
                            },
                            null,
                            2
                        ),
                    },
                ],
            };
        }
    );

    // ─── List SPAs ─────────────────────────────────────────────────────────────

    server.tool(
        'list_spas',
        'Lists all Single Page Applications (SPAs) currently installed and served by FormCMS.',
        {},
        async () => {
            const resp = await client.axios.get('/api/system/spas');
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(resp.data, null, 2),
                    },
                ],
            };
        }
    );
}
