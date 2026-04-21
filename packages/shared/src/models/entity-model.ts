import { type EntityDto } from '../types/cms.dto.js';
import { normalizeAttribute } from './attribute-model.js';
import { camelize } from '../utils/string.js';

export class EntityModel {
    constructor(public readonly entity: EntityDto) { }

    normalize(): EntityDto {
        const entity = { ...this.entity };

        // Convert name to camelCase (e.g., Course -> course, CourseModule -> courseModule)
        if (entity.name) {
            entity.name = camelize(entity.name);
        }

        const attributes = (entity.attributes || []).map(normalizeAttribute);

        return {
            ...entity,
            displayName: entity.displayName || this.entity.name, // Keep original name as display name if not provided
            primaryKey: entity.primaryKey || 'id',
            labelAttributeName: entity.labelAttributeName || attributes[0]?.field || 'id',
            defaultPageSize: entity.defaultPageSize || 20,
            defaultPublicationStatus: entity.defaultPublicationStatus || 'published',
            pageUrl: entity.pageUrl || `/${entity.name.toLowerCase()}`,
            attributes
        };
    }
}
