import axios from 'axios';
import { FormCmsApiClient } from '@formmate/shared';
import { requestContext } from './context.js';

/**
 * Creates a FormCmsApiClient configured for the MCP server.
 * API key is injected per-request from AsyncLocalStorage.
 */
export function createFormCmsClient(baseUrl: string): FormCmsApiClient {
    const instance = axios.create({
        baseURL: baseUrl,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    instance.interceptors.request.use(config => {
        const store = requestContext.getStore();
        const key = store?.apiKey;
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

    return new FormCmsApiClient(instance);
}
