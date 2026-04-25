import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
    apiKey: string;
    baseUrl: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();
