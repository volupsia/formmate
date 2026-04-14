import {
    type SchemaSummary,
    type SchemaDto,
    type SaveSchemaPayload,
    type EntityDto,
    type RelationshipDto
} from '@formmate/shared';
import type { FormCMSClient } from '../infrastructures/formcms-client';
import type { ServiceLogger } from '../types/logger';

export class EntityOperator {
    constructor(
        private readonly formCMSClient: FormCMSClient,
        private readonly logger: ServiceLogger
    ) { }

    async prepareSummary(
        normalizedEntities: EntityDto[],
        relationships: RelationshipDto[],
        userInput: string,
        externalCookie: string
    ): Promise<SchemaSummary> {
        this.logger.info('Comparing with existing schemas and preparing summary in EntityOperator...');
        const existingSchemas = await this.formCMSClient.getClient(externalCookie).getAllEntities();

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
}
