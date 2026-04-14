import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { type SaveSchemaPayload, type XEntityDto, FormCmsApiClient } from '@formmate/shared';
import { FormCmsError } from './form-cms-error';

export class FormCMSClient {
    private populatingPromise: Promise<void> | null = null;
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

    // ─── Domain-specific methods with real logic ────────────────────────────────

    async generateSDL(externalCookie: string): Promise<string> {
        const { getIntrospectionQuery, buildClientSchema, printSchema } = await import('graphql');
        const query = getIntrospectionQuery();

        const resp = await this.createAxios(externalCookie).post('/graphql', { query });

        const introspectionResponse = resp.data.data;
        const schema = buildClientSchema(introspectionResponse);
        return printSchema(schema);
    }

    async insertSingleData(externalCookie: string, entity: XEntityDto, data: any) {
        // Data cleaning logic
        delete data[entity.primaryKey];
        delete data['createdAt'];
        delete data['updatedAt'];
        delete data['createdBy'];

        return this.getClient(externalCookie).insertEntity(entity.name, data);
    }

    async insertData(externalCookie: string, entity: XEntityDto, data: any, idMaps: Record<string, Record<string, any>> = {}) {
        await this.populateExamplePics(externalCookie);

        for (const attr of entity.attributes) {
            const field = attr.field;
            if (attr.lookup && data[field]) {
                const target = attr.lookup;
                const item = data[field];
                const originalId = item[target.primaryKey];

                if (!idMaps[field]) idMaps[field] = {};

                if (originalId && idMaps[field][originalId]) {
                    data[field][attr.lookup!.primaryKey] = idMaps[field][originalId];
                } else {
                    const resp = await this.insertSingleData(externalCookie, attr.lookup!, item);
                    const newId = resp[target.primaryKey];
                    if (originalId) idMaps[field][originalId] = newId;
                    item[target.primaryKey] = newId;
                }
            } else if (attr.junction && Array.isArray(data[field])) {
                const target = attr.junction
                if (!idMaps[field]) idMaps[field] = {};
                for (const item of data[field]) {
                    const originalId = item[target.primaryKey];
                    if (originalId && idMaps[field][originalId]) {
                        item[target.primaryKey] = idMaps[field][originalId];
                    } else {
                        const resp = await this.insertSingleData(externalCookie, target, item);
                        const newId = resp[target.primaryKey];
                        if (originalId) idMaps[field][originalId] = newId;
                        item[target.primaryKey] = newId;
                    }
                }
            } else if (attr.displayType == 'image') {
                const client = this.getClient(externalCookie);
                const assets = await client.getAllAsset();
                if (assets.items.length > 0) {
                    const randomAsset = assets.items[Math.floor(Math.random() * assets.items.length)];
                    if (randomAsset) {
                        data[field] = randomAsset.path;
                    }
                }
            }
        }
        await this.insertSingleData(externalCookie, entity, data);
    }

    async populateExamplePics(externalCookie: string) {
        if (this.populatingPromise) {
            return this.populatingPromise;
        }

        this.populatingPromise = (async () => {
            try {
                const client = this.getClient(externalCookie);
                const assetsResp = await client.getAllAsset();

                if (assetsResp.totalRecords !== 0) {
                    return;
                }

                const __filename = fileURLToPath(import.meta.url);
                const __dirname = path.dirname(__filename);
                const examplePicsPath = path.resolve(__dirname, '../../resources/assets', 'example_pics');
                if (!fs.existsSync(examplePicsPath)) {
                    return;
                }

                const categories = fs.readdirSync(examplePicsPath);
                for (const category of categories) {
                    const categoryPath = path.join(examplePicsPath, category);
                    if (!fs.statSync(categoryPath).isDirectory()) continue;

                    const files = fs.readdirSync(categoryPath);
                    for (const file of files) {
                        const filePath = path.join(categoryPath, file);
                        if (!fs.statSync(filePath).isFile()) continue;

                        const formData = new FormData();
                        const fileBuffer = fs.readFileSync(filePath);
                        const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
                        formData.append('Files', blob, file);

                        await this.createAxios(externalCookie).post('/api/assets', formData, {
                            timeout: 30000,
                        });
                    }
                }
            } catch (error) {
                console.error('Failed to populate example pics:', error);
            } finally {
                this.populatingPromise = null;
            }
        })();

        return this.populatingPromise;
    }
}
