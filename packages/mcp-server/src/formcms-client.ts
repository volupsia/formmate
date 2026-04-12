import axios, { type AxiosInstance } from 'axios';
import { requestContext } from './context.js';

export class FormCmsClient {
    private readonly client: AxiosInstance;

    constructor(baseUrl: string, apiKey: string) {
        this.client = axios.create({
            baseURL: baseUrl,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.client.interceptors.request.use(config => {
            const store = requestContext.getStore();
            const key = store?.apiKey || apiKey;
            if (key) {
                config.headers['X-Api-Key'] = key;
            }
            return config;
        });

        this.client.interceptors.response.use(
            response => response,
            error => {
                const title = error.response?.data?.title ?? error.response?.data?.error ?? error.message;
                throw new Error(title ?? 'FormCMS request failed');
            }
        );
    }

    // ─── Schema ──────────────────────────────────────────────────────────────

    async listSchemas(type: 'entity' | 'query' = 'entity') {
        const resp = await this.client.get(`/api/schemas?type=${type}`);
        return resp.data;
    }

    async getSchemaByName(name: string, type: 'entity' | 'query' = 'entity') {
        const resp = await this.client.get(`/api/schemas/name/${name}?type=${type}`);
        return resp.data;
    }

    async saveSchema(payload: unknown) {
        const resp = await this.client.post('/api/schemas', payload);
        return resp.data;
    }

    async saveEntityDefine(payload: unknown) {
        const resp = await this.client.post('/api/schemas/entity/define', payload);
        return resp.data;
    }

    async getXEntity(entityName: string) {
        const resp = await this.client.get(`/api/schemas/entity/${entityName}`);
        return resp.data;
    }

    // ─── Entities ─────────────────────────────────────────────────────────────

    async listEntities(schemaName: string, qs: Record<string, string> = {}) {
        const params = new URLSearchParams(qs).toString();
        const url = `/api/entities/${schemaName}${params ? `?${params}` : ''}`;
        const resp = await this.client.get(url);
        return resp.data;
    }

    async getEntity(schemaName: string, id: string) {
        const resp = await this.client.get(`/api/entities/${schemaName}/${id}`);
        return resp.data;
    }

    async insertEntity(schemaName: string, data: unknown) {
        const resp = await this.client.post(`/api/entities/${schemaName}/insert`, data);
        return resp.data;
    }

    async updateEntity(schemaName: string, data: unknown) {
        const resp = await this.client.post(`/api/entities/${schemaName}/update`, data);
        return resp.data;
    }

    async deleteEntity(schemaName: string, data: unknown) {
        const resp = await this.client.post(`/api/entities/${schemaName}/delete`, data);
        return resp.data;
    }

    // ─── Queries ──────────────────────────────────────────────────────────────

    async runQuery(queryName: string, params: Record<string, string> = {}) {
        const qs = new URLSearchParams(params).toString();
        const url = `/api/queries/${queryName}${qs ? `?${qs}` : ''}`;
        const resp = await this.client.get(url);
        return resp.data;
    }
}
