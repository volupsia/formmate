import {
    RelationshipModel,
    EntityModel,
    type SchemaSummary,
    type EntityDto,
    type RelationshipDto,
    type SchemaDto,
    type SaveSchemaPayload,
    type FormCmsApiClient
} from '../index.js';
import type { IFormCmsClientBuilder } from './formcms-client-builder.interface.js';

export interface EntityOperatorLogger {
    info(msg: string, ...args: any[]): void;
}

export class EntityOperator {
    constructor(
        private readonly formCMSClientBuilder: IFormCmsClientBuilder,
        private readonly logger: EntityOperatorLogger
    ) { }

    async prepareSummary(
        normalizedEntities: EntityDto[],
        relationships: RelationshipDto[],
        userInput: string,
        externalCookie: string
    ): Promise<SchemaSummary> {
        this.logger.info('Comparing with existing schemas and preparing summary in EntityOperator...');
        const existingSchemas = await this.formCMSClientBuilder.getClient(externalCookie).getAllEntities();

        const summaryEntities = normalizedEntities.map(ne => {
            const existing = existingSchemas.find(es => es.name === ne.name);
            return {
                ...ne,
                schemaId: existing?.schemaId || null
            };
        });

        const summaryText = summaryEntities.map(se =>
            `- ${se.name} (${se.schemaId ? 'update' : 'new'}${se.schemaId ? ` - existing sid: ${se.schemaId}` : ''})`
        ).join('\n');

        const summarySummaryText = `Proposed Schema Changes:\n${summaryText}`;

        return {
            userInput: userInput,
            summary: summarySummaryText,
            entities: summaryEntities,
            relationships: relationships
        };
    }

    async commitEntityDesign(externalCookie: string,
        summary: SchemaSummary
    ): Promise<string[]> {

        const client = this.formCMSClientBuilder.getClient(externalCookie);
        const schemaIds = new Set<string>();

        // 1. Commit regular entities
        if (summary.entities && summary.entities.length > 0) {
            for (const item of summary.entities) {

                const payload: SaveSchemaPayload = {
                    schemaId: item.schemaId ?? null,
                    type: 'entity',
                    description: summary.userInput || '',
                    settings: {
                        entity: item
                    }
                };

                try {
                    const resp = await client.saveEntityDefine(payload);
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
            const allEntities = await client.getAllEntities();

            const modifiedIds1 = await this.applyAndSave(client, resls, allEntities, (model, entities) => model.applyLookupAndJunctionToEntities(entities));
            modifiedIds1.forEach(id => schemaIds.add(id));

            const modifiedIds2 = await this.applyAndSave(client, resls, allEntities, (model, entities) => model.applyCollectionToEntities(entities));
            modifiedIds2.forEach(id => schemaIds.add(id));
        }

        return Array.from(schemaIds);
    }

    private async applyAndSave(
        client: FormCmsApiClient,
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
                await client.saveEntityDefine(payload);
            } catch (saveError) {
                throw saveError;
            }
        }

        return Array.from(modifiedEntitiesMap.keys());
    }
}
