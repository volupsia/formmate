import axios from 'axios';
import { FormCmsApiClient, type IFormCmsClientBuilder } from '@formmate/shared';

/**
 * Creates a FormCmsApiClient configured for the MCP server.
 * API key is injected per-request via the getKey callback.
 */
export class McpFormCmsClientBuilder implements IFormCmsClientBuilder {
    private client: FormCmsApiClient;

    constructor(
        private readonly baseUrl: string,
        private readonly getKey: () => string | undefined
    ) {
        const instance = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        instance.interceptors.request.use(config => {
            const key = this.getKey();
            if (key) {
                config.headers['X-Api-Key'] = key;
            }
            return config;
        });

        instance.interceptors.response.use(
            response => response,
            error => {
                const status: number | undefined = error.response?.status;
                const data = error.response?.data;

                // Build a rich error message with all available upstream detail
                const parts: string[] = [];
                if (status) parts.push(`HTTP ${status}`);

                const title: string | undefined =
                    data?.title ?? data?.error ?? data?.message ?? error.message;
                if (title) parts.push(title);

                const detail: string | undefined = data?.detail;
                if (detail) parts.push(`Detail: ${detail}`);

                // Include validation errors or arbitrary body for debugging
                const extra = data?.errors ?? (typeof data === 'string' ? data : undefined);
                if (extra) parts.push(`Body: ${typeof extra === 'string' ? extra : JSON.stringify(extra)}`);

                const message = parts.join(' | ') || 'FormCMS request failed';

                // Always log the full upstream response to the server console
                console.error('[FormCMS upstream error]', {
                    method: error.config?.method?.toUpperCase(),
                    url: error.config?.url,
                    status,
                    data,
                });

                throw new Error(message);
            }
        );

        this.client = new FormCmsApiClient(instance);
    }

    getClient(_externalCookie: string = ''): FormCmsApiClient {
        return this.client;
    }
}
