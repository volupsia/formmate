import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
    apiKey: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();
