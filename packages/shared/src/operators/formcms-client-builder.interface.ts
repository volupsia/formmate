import type { FormCmsApiClient } from '../index.js';

export interface IFormCmsClientBuilder {
    getClient(externalCookie: string): FormCmsApiClient;
}
