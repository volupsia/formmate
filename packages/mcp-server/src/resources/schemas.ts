import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
    ATTRIBUTE_JSON_SCHEMA,
    ENTITY_JSON_SCHEMA,
    RELATIONSHIP_JSON_SCHEMA,
    ENTITY_DESIGN_JSON_SCHEMA,
} from '@formmate/shared';

export function registerSchemaResources(server: McpServer): void {
    server.resource(
        'attribute-schema',
        'schema://formcms/attribute',
        {
            description:
                'JSON Schema for a single FormCMS attribute (field). ' +
                'Use this to understand what properties are required when defining entity fields.',
            mimeType: 'application/json',
        },
        async (uri) => ({
            contents: [
                {
                    uri: uri.href,
                    mimeType: 'application/json',
                    text: JSON.stringify(ATTRIBUTE_JSON_SCHEMA, null, 2),
                },
            ],
        })
    );

    server.resource(
        'entity-schema',
        'schema://formcms/entity',
        {
            description:
                'JSON Schema for a FormCMS entity (name, tableName, displayName, labelAttributeName, attributes[]). ' +
                'Use this before calling define_entity or save_schema to ensure the payload is valid.',
            mimeType: 'application/json',
        },
        async (uri) => ({
            contents: [
                {
                    uri: uri.href,
                    mimeType: 'application/json',
                    text: JSON.stringify(ENTITY_JSON_SCHEMA, null, 2),
                },
            ],
        })
    );

    server.resource(
        'relationship-schema',
        'schema://formcms/relationship',
        {
            description:
                'JSON Schema for a FormCMS relationship between entities (sourceEntity, targetEntity, fieldName, cardinality). ' +
                'Relationships MUST NOT be modelled as attributes — they live in a separate top-level relationships array.',
            mimeType: 'application/json',
        },
        async (uri) => ({
            contents: [
                {
                    uri: uri.href,
                    mimeType: 'application/json',
                    text: JSON.stringify(RELATIONSHIP_JSON_SCHEMA, null, 2),
                },
            ],
        })
    );

    server.resource(
        'entity-design-schema',
        'schema://formcms/entity-design',
        {
            description:
                'Combined JSON Schema for the full FormCMS entity-design payload: { entities[], relationships[] }. ' +
                'This is the canonical shape expected by the define_entity tool.',
            mimeType: 'application/json',
        },
        async (uri) => ({
            contents: [
                {
                    uri: uri.href,
                    mimeType: 'application/json',
                    text: JSON.stringify(ENTITY_DESIGN_JSON_SCHEMA, null, 2),
                },
            ],
        })
    );
}
