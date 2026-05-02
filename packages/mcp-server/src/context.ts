import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
    apiKey: string;  // from Authorization: Bearer header — used for testing/CI
    cookie: string;  // from per-session browser login — used in production
    baseUrl: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();
