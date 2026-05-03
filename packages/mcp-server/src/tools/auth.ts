import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { requestContext } from '../context.js';
/**
 * Registers auth tools:
 *  - login_to_formcms:  returns a login URL; resolves when the user completes the browser flow
 *  - logout_from_formcms: clears this session's stored cookie
 *
 * Auth is per-SSE-session, stored only in memory. The sessionId is embedded in the
 * login URL so the POST /mcp/login handler can map the captured cookie back to the
 * correct session slot.
 */
export function registerAuthTools(
    server: McpServer,
    port: number,
    sessionId: string,
    sessionCookies: Map<string, string>,
    pendingLogins: Map<string, (cookie: string) => void>,
): void {
    // ─── login_to_formcms ─────────────────────────────────────────────────────

    server.tool(
        'login_to_formcms',
        [
            'Returns a URL for the user to open in their browser to log in to FormCMS.',
            'The tool waits (up to 1200 s) for the user to complete the login.',
            'Once logged in, the session cookie is stored in memory for this MCP session.',
            'Call this tool first if other tools return 401 Unauthorized.',
        ].join(' '),
        {},
        async () => {
            const cookie = await new Promise<string | null>(resolve => {
                const timer = setTimeout(() => {
                    pendingLogins.delete(sessionId);
                    resolve(null);
                }, 1200_000);

                pendingLogins.set(sessionId, (capturedCookie: string) => {
                    clearTimeout(timer);
                    resolve(capturedCookie);
                });
            });

            if (!cookie) {
                return {
                    content: [{
                        type: 'text' as const,
                        text: '❌ Login timed out after 120 seconds. Please call login_to_formcms again.',
                    }],
                };
            }

            return {
                content: [{
                    type: 'text' as const,
                    text: `✅ Logged in to FormCMS successfully. This session is now authenticated.`,
                }],
            };
        }
    );

    // Return the login URL separately so the AI agent can show it immediately
    // without waiting for the promise.
    server.tool(
        'get_login_url',
        'Returns the FormCMS MCP login URL for the current session. Open this URL in a browser to authenticate.',
        {},
        async () => {
            const baseUrl = requestContext.getStore()?.baseUrl;
            const loginUrl = `${baseUrl}/mcp/login?sessionId=${sessionId}`;
            return {
                content: [{
                    type: 'text' as const,
                    text: `Open this URL in your browser to log in:\n${loginUrl}`,
                }],
            };
        }
    );

    // ─── logout_from_formcms ──────────────────────────────────────────────────

    server.tool(
        'logout_from_formcms',
        'Clears the FormCMS session cookie for the current MCP session.',
        {},
        async () => {
            sessionCookies.set(sessionId, '');
            return {
                content: [{
                    type: 'text' as const,
                    text: '✅ Logged out from FormCMS. Call login_to_formcms to authenticate again.',
                }],
            };
        }
    );
}
