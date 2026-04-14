import type { AxiosInstance } from 'axios';
import type { User } from '../types/contracts.js';
import type { SchemaDto, SaveSchemaPayload, XEntityDto, AssetListResponse } from '../types/cms.dto.js';
import type { SchemaSummary } from '../types/mate.dto.js';
import { RelationshipModel } from '../models/relationship-model.js';

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

    async commitEntities(summary: SchemaSummary): Promise<string[]> {
        const schemaIds = new Set<string>();

        // 1. Commit regular entities
        if (summary.entities.length > 0) {
            for (const item of summary.entities) {
                const payload: SaveSchemaPayload = {
                    schemaId: item.schemaId || null,
                    type: 'entity',
                    description: summary.userInput,
                    settings: {
                        entity: item as any
                    }
                };

                try {
                    const resp = await this.saveEntityDefine(payload);
                    if (resp.data?.schemaId) {
                        schemaIds.add(resp.data.schemaId);
                    }
                } catch (saveError: any) {
                    throw saveError;
                }
            }
        }

        // 2. Commit relationships
        if (summary.relationships && summary.relationships.length > 0) {
            const resls = summary.relationships.map(rel => new RelationshipModel(rel).normalize());
            const allEntities = await this.getAllEntities();

            const modifiedIds1 = await this.applyAndSave(resls, allEntities, (model, entities) => model.applyLookupAndJunctionToEntities(entities));
            modifiedIds1.forEach(id => schemaIds.add(id));

            const modifiedIds2 = await this.applyAndSave(resls, allEntities, (model, entities) => model.applyCollectionToEntities(entities));
            modifiedIds2.forEach(id => schemaIds.add(id));
        }

        return Array.from(schemaIds);
    }

    private async applyAndSave(
        relationships: any[],
        allEntities: SchemaDto[],
        applyFn: (relModel: RelationshipModel, allEntities: SchemaDto[]) => SchemaDto[]
    ): Promise<string[]> {
        const modifiedEntitiesMap = new Map<string, SchemaDto>();

        for (const rel of relationships) {
            try {
                const relModel = new RelationshipModel(rel);
                const changed = applyFn(relModel, allEntities);
                for (const entity of changed) {
                    modifiedEntitiesMap.set(entity.schemaId!, entity);
                }
            } catch (error) {
                throw new Error(`Failed to apply relationship to entities: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        for (const entity of modifiedEntitiesMap.values()) {
            const payload: SaveSchemaPayload = {
                schemaId: entity.schemaId!,
                type: 'entity',
                settings: {
                    entity: entity.settings.entity!
                }
            };
            try {
                await this.saveEntityDefine(payload);
            } catch (saveError) {
                throw saveError;
            }
        }

        return Array.from(modifiedEntitiesMap.keys());
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

    async saveQuery(schemaId: string, queryName: string, query: string): Promise<string> {
        const payload: SaveSchemaPayload = {
            schemaId: schemaId,
            type: 'query',
            settings: {
                query: {
                    name: queryName,
                    entityName: '',
                    source: query,
                    filters: [],
                    sorts: [],
                    variables: [],
                    distinct: false,
                    ideUrl: '',
                    pagination: { offset: '0', limit: '10' }
                }
            }
        };
        const saveResp = await this.saveSchema(payload);
        return saveResp.schemaId;
    }

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
