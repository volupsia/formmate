import axios from 'axios';
import { type SaveSchemaPayload, type XEntityDto, FormCmsApiClient } from '@formmate/shared';
import { FormCmsError } from './form-cms-error';

export class FormCmsClientBuilder {
    constructor(private readonly baseUrl: string) { }

    /**
     * Returns a FormCmsApiClient for the given cookie.
     * This is the primary entry point — callers use the shared client directly.
     */
    getClient(externalCookie: string): FormCmsApiClient {
        return new FormCmsApiClient(this.createAxios(externalCookie));
    }

    private createAxios(externalCookie?: string) {
        const headers: Record<string, string> = {};
        if (externalCookie) {
            headers['Cookie'] = externalCookie;
        }

        const instance = axios.create({
            baseURL: this.baseUrl,
            headers
        });

        instance.interceptors.response.use(
            response => response,
            error => {
                const title = error.response?.data?.title;
                if (title) {
                    throw new FormCmsError(title, error);
                }
                throw error;
            }
        );

        return instance;
    }
}
