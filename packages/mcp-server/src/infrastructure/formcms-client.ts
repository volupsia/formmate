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
                const title = error.response?.data?.title ?? error.response?.data?.error ?? error.message;
                throw new Error(title ?? 'FormCMS request failed');
            }
        );

        this.client = new FormCmsApiClient(instance);
    }

    getClient(_externalCookie: string = ''): FormCmsApiClient {
        return this.client;
    }
}
