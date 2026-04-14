import type { AxiosInstance } from 'axios';
import type { User } from './contracts.js';
import type { SchemaDto, SaveSchemaPayload, XEntityDto, AssetListResponse } from './cms.dto.js';

export class FormCmsApiClient {
    constructor(private readonly _axios: AxiosInstance) { }

    /** Expose raw axios for consumers that need direct access (e.g. GraphQL introspection). */
    get axios(): AxiosInstance {
        return this._axios;
    }

    // ─── Auth ──────────────────────────────────────────────────────────────────

    async getMe(): Promise<User> {
        const resp = await this._axios.get('/api/me');
        const externalUser = resp.data;

        const baseURL = this._axios.defaults.baseURL || '';

        return {
            id: externalUser.id,
            username: externalUser.name || externalUser.email,
            avatarUrl: externalUser.avatarUrl ? (externalUser.avatarUrl.startsWith('http') ? externalUser.avatarUrl : baseURL + externalUser.avatarUrl) : null,
            email: externalUser.email,
            roles: externalUser.roles,
            allowedMenus: externalUser.allowedMenus,
            ...externalUser
        } as User;
    }

    async login(payload: any): Promise<User> {
        const resp = await this._axios.post('/api/login', payload);
        const externalUser = resp.data;
        const baseURL = this._axios.defaults.baseURL || '';

        return {
            id: externalUser.id,
            username: externalUser.name || externalUser.email,
            avatarUrl: externalUser.avatarUrl ? (externalUser.avatarUrl.startsWith('http') ? externalUser.avatarUrl : baseURL + externalUser.avatarUrl) : null,
            ...externalUser
        } as User;
    }

    async register(payload: import('./contracts.js').RegisterReq): Promise<User> {
        const resp = await this._axios.post('/api/register', payload);
        return resp.data as User;
    }

    async changePassword(payload: import('./contracts.js').ChangePasswordReq): Promise<void> {
        await this._axios.post('/api/profile/password', payload);
    }

    async uploadAvatar(file: any): Promise<void> {
        const formData = new FormData();
        formData.append("file", file);
        await this._axios.post('/api/profile/avatar', formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    }

    async logout(): Promise<void> {
        await this._axios.get('/api/logout');
    }

    // ─── System ────────────────────────────────────────────────────────────────

    async getSystemStatus(): Promise<import('./contracts.js').SystemStatusResponse> {
        const resp = await this._axios.get('/api/system/is-ready');
        return resp.data;
    }

    // ─── Schemas ───────────────────────────────────────────────────────────────

    async listSchemas(type: 'entity' | 'query' | 'page' = 'entity'): Promise<SchemaDto[]> {
        const resp = await this._axios.get(`/api/schemas?type=${type}`);
        return resp.data;
    }

    async getAllSchemas(): Promise<SchemaDto[]> {
        const resp = await this._axios.get('/api/schemas?type=');
        return resp.data;
    }

    async getAllEntities(): Promise<SchemaDto[]> {
        return this.listSchemas('entity');
    }

    async getAllQueries(): Promise<SchemaDto[]> {
        return this.listSchemas('query');
    }

    async getSchemaByName(name: string, type: string = 'entity'): Promise<SchemaDto> {
        const resp = await this._axios.get(`/api/schemas/name/${name}?type=${type}`);
        return resp.data;
    }

    async getSchemaById(id: string): Promise<SchemaDto> {
        const resp = await this._axios.get(`/api/schemas/${id}`);
        return resp.data;
    }

    async getSchemaBySchemaId(id: string): Promise<SchemaDto> {
        const resp = await this._axios.get(`/api/schemas/schema/${id}`);
        return resp.data;
    }

    async getSchemaHistory(schemaId: string): Promise<SchemaDto[]> {
        const resp = await this._axios.get(`/api/schemas/history/${schemaId}`);
        return resp.data;
    }

    async getXEntity(entityName: string): Promise<XEntityDto> {
        const resp = await this._axios.get(`/api/schemas/entity/${entityName}`);
        return resp.data;
    }

    async getAllXEntity(): Promise<XEntityDto[]> {
        const entities = await this.getAllEntities();
        const promises = entities.map(e => this.getXEntity(e.name));
        return Promise.all(promises);
    }

    async saveEntityDefine(payload: SaveSchemaPayload): Promise<any> {
        const resp = await this._axios.post('/api/schemas/entity/define', payload);
        return resp.data;
    }

    async saveSchema(payload: SaveSchemaPayload): Promise<any> {
        const resp = await this._axios.post('/api/schemas', payload);
        return resp.data;
    }

    async deleteSchema(id: number): Promise<void> {
        await this._axios.delete(`/api/schemas/${id}`);
    }

    async publishSchema(id: number, schemaId: string): Promise<any> {
        const resp = await this._axios.post('/api/schemas/publish', { id: id.toString(), schemaId });
        return resp.data;
    }

    // ─── Entities (CRUD) ───────────────────────────────────────────────────────

    async listEntities(schemaName: string, qs: Record<string, string> = {}): Promise<any> {
        const params = new URLSearchParams(qs).toString();
        const url = `/api/entities/${schemaName}${params ? `?${params}` : ''}`;
        const resp = await this._axios.get(url);
        return resp.data;
    }

    async getEntity(schemaName: string, id: string): Promise<any> {
        const resp = await this._axios.get(`/api/entities/${schemaName}/${id}`);
        return resp.data;
    }

    async insertEntity(schemaName: string, data: any): Promise<any> {
        const resp = await this._axios.post(`/api/entities/${schemaName}/insert`, data);
        return resp.data;
    }

    async updateEntity(schemaName: string, data: any): Promise<any> {
        const resp = await this._axios.post(`/api/entities/${schemaName}/update`, data);
        return resp.data;
    }

    async deleteEntity(schemaName: string, data: any): Promise<any> {
        const resp = await this._axios.post(`/api/entities/${schemaName}/delete`, data);
        return resp.data;
    }

    /** @deprecated Use insertEntity instead */
    async insertSingleData(entityName: string, data: any): Promise<any> {
        return this.insertEntity(entityName, data);
    }

    // ─── Queries ───────────────────────────────────────────────────────────────

    async requestQuery(queryName: string, limit = 5): Promise<any> {
        const resp = await this._axios.get(`/api/queries/${queryName}?limit=${limit}`);
        return resp.data;
    }

    async runQuery(queryName: string, params: Record<string, string> = {}): Promise<any> {
        const qs = new URLSearchParams(params).toString();
        const url = `/api/queries/${queryName}${qs ? `?${qs}` : ''}`;
        const resp = await this._axios.get(url);
        return resp.data;
    }

    // ─── Assets ────────────────────────────────────────────────────────────────

    async getAllAsset(): Promise<AssetListResponse> {
        const resp = await this._axios.get('/api/assets');
        return resp.data;
    }
}
