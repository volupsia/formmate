import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { config } from '../config.js';

/**
 * Registers informational tools that expose server configuration.
 * Useful for code agents that need to know the FormCMS base URL
 * before generating vite.config.ts or other connection config.
 */
export function registerInfoTools(server: McpServer): void {
    server.tool(
        'get_server_info',
        [
            'Returns the FormCMS server configuration — most importantly the base URL of the FormCMS backend.',
            'Call this FIRST before generating vite.config.ts or any other configuration file.',
            'Use the returned formcmsBaseUrl as the proxy target for /api and /files routes.',
        ].join(' '),
        {},
        async () => {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(
                            {
                                formcmsBaseUrl: config.FORMCMS_BASE_URL,
                                mcpServerPort: config.PORT,
                                note: 'Use formcmsBaseUrl as the proxy target for /api and /files in vite.config.ts',
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
