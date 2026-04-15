import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
    ATTRIBUTE_JSON_SCHEMA,
    ENTITY_JSON_SCHEMA,
    EntityModel,
    RELATIONSHIP_JSON_SCHEMA,
    RelationshipModel,
} from '@formmate/shared';
import type { FormCmsApiClient, EntityOperator } from '@formmate/shared';

// ─── Zod schemas – derived from @formmate/shared JSON Schema constants ─────────
//
// Single source of truth: packages/shared/src/entity-design.ts
// These Zod schemas are the MCP-layer binding; every value comes from the
// shared constants so there is NOTHING to keep in sync here.

// Pull the display-type enum directly from the JSON Schema so this list
// never drifts from what the backend expects.
const displayTypeValues = ATTRIBUTE_JSON_SCHEMA.properties.displayType.enum;
// Zod requires a non-empty tuple for z.enum(); the cast is safe because the
// shared constant is typed `as const` with at least one element.
const displayTypeEnum = z.enum(
    displayTypeValues as unknown as [string, ...string[]]
);

const AttributeSchema = z.object({
    field: z
        .string()
        .min(ATTRIBUTE_JSON_SCHEMA.properties.field.minLength)
        .describe(ATTRIBUTE_JSON_SCHEMA.properties.field.description),
    header: z
        .string()
        .min(ATTRIBUTE_JSON_SCHEMA.properties.header.minLength)
        .describe(ATTRIBUTE_JSON_SCHEMA.properties.header.description),
    displayType: displayTypeEnum.describe(
        ATTRIBUTE_JSON_SCHEMA.properties.displayType.description +
        '. Use "dropdown" or "multiselect" ONLY when options are provided. "select" is forbidden.'
    ),
    validation: z
        .string()
        .describe(
            ATTRIBUTE_JSON_SCHEMA.properties.validation.description +
            ' Use simple character-set patterns (e.g. "^[A-Za-z]+$"). ' +
            'NO lookaheads/lookbehinds. For image/gallery/file fields use ".*".'
        ),
    options: z
        .string()
        .describe(
            ATTRIBUTE_JSON_SCHEMA.properties.options.description +
            ' Required for dropdown/multiselect; leave empty for all other types.'
        ),
    inList: z
        .boolean()
        .default(ATTRIBUTE_JSON_SCHEMA.properties.inList.default)
        .describe(ATTRIBUTE_JSON_SCHEMA.properties.inList.description),
    inDetail: z
        .boolean()
        .default(ATTRIBUTE_JSON_SCHEMA.properties.inDetail.default)
        .describe(ATTRIBUTE_JSON_SCHEMA.properties.inDetail.description),
});

const RelationshipSchema = z.object({
    sourceEntity: z
        .string()
        .describe(RELATIONSHIP_JSON_SCHEMA.properties.sourceEntity.description),
    targetEntity: z
        .string()
        .describe(RELATIONSHIP_JSON_SCHEMA.properties.targetEntity.description),
    fieldName: z
        .string()
        .describe(
            RELATIONSHIP_JSON_SCHEMA.properties.fieldName.description +
            ' Do NOT create a matching attribute — relationships must NOT be modelled as attributes.'
        ),
    label: z
        .string()
        .optional()
        .describe(RELATIONSHIP_JSON_SCHEMA.properties.label.description),
    cardinality: z
        .enum(
            RELATIONSHIP_JSON_SCHEMA.properties.cardinality.enum as unknown as [string, ...string[]]
        )
        .describe(
            RELATIONSHIP_JSON_SCHEMA.properties.cardinality.description +
            ' "manyToOne" means the source holds the foreign key.'
        ),
});

const EntitySchema = z.object({
    name: z
        .string()
        .min(1)
        .describe(ENTITY_JSON_SCHEMA.properties.name.description + ' Forbidden: "User", "Comment".'),
    displayName: z
        .string()
        .min(1)
        .describe(ENTITY_JSON_SCHEMA.properties.displayName.description),
    tableName: z
        .string()
        .min(1)
        .describe(ENTITY_JSON_SCHEMA.properties.tableName.description),
    labelAttributeName: z
        .string()
        .min(1)
        .describe(ENTITY_JSON_SCHEMA.properties.labelAttributeName.description),
    attributes: z
        .array(AttributeSchema)
        .min(1)
        .describe(ENTITY_JSON_SCHEMA.properties.attributes.description + ' Do NOT include relationship fields here.'),
});

/** Full design payload: one or more entities plus their relationships */
const EntityDesignPayload = z.object({
    entities: z
        .array(EntitySchema)
        .min(1)
        .describe('Entities to create or update'),
    relationships: z
        .array(RelationshipSchema)
        .describe(
            'Cross-entity relationships. Must NOT be duplicated inside attributes. ' +
            'Pass an empty array [] when there are no relationships.'
        ),
});

// ─── Tool registration ────────────────────────────────────────────────────────

export function registerSchemaTools(server: McpServer, client: FormCmsApiClient, entityOperator: EntityOperator) {
    // List all schemas of a given type
    server.tool(
        'list_schemas',
        'List all FormCMS schemas. Use type="entity" for data entities, type="query" for named queries.',
        {
            type: z.enum(['entity', 'query']).default('entity').describe('Schema type to list'),
        },
        async ({ type }) => {
            const data = await client.listSchemas(type);
            return {
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            };
        }
    );

    // Get a schema by name
    server.tool(
        'get_schema',
        'Get a FormCMS schema definition by its name.',
        {
            name: z.string().describe('Schema name (e.g. "post", "category")'),
            type: z.enum(['entity', 'query']).default('entity').describe('Schema type'),
        },
        async ({ name, type }) => {
            const data = await client.getSchemaByName(name, type);
            return {
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            };
        }
    );

    // Get expanded entity definition (attributes, relations, etc.)
    server.tool(
        'get_entity_definition',
        'Get the full expanded entity definition including all attributes, lookups, and junctions.',
        {
            entityName: z.string().describe('Entity name (e.g. "post")'),
        },
        async ({ entityName }) => {
            const data = await client.getXEntity(entityName);
            return {
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            };
        }
    );

    // Delete a schema by its numeric id
    server.tool(
        'delete_schema',
        'Delete a FormCMS schema by its numeric id. Use list_schemas first to find the id.',
        {
            id: z.number().int().positive().describe('Numeric id of the schema to delete'),
        },
        async ({ id }) => {
            await client.deleteSchema(id);
            return {
                content: [{ type: 'text', text: `Schema ${id} deleted successfully.` }],
            };
        }
    );

    // Define / update entity structure (strongly typed)
    server.tool(
        'define_entity',
        [
            'Define or update FormCMS entity schemas (attributes + relationships) and apply them to the database.',
            'Always read the schema://formcms/entity-design resource first to understand the required shape.',
            'Use the design-entity prompt to generate a valid payload from a natural language description.',
        ].join(' '),
        {
            payload: EntityDesignPayload.describe(
                'Entity design payload with entities[] and relationships[]. ' +
                'Use the design-entity prompt or schema://formcms/entity-design resource for the exact shape.'
            ),
        },
        async ({ payload }) => {
            // Normalize: handle cases where AI might return 'fields' instead of 'attributes'
            const entities = (payload.entities || []).map((e: any) => ({
                ...e,
                attributes: e.attributes || e.fields || []
            }));

            // normalize attributes using model behavior
            const normalizedEntities = entities.map((entity: any) => new EntityModel(entity).normalize());
            const normalizedRelationships = (payload.relationships || []).map(r => new RelationshipModel(r as any).normalize());


            // Compare with FormCMS to categorize entities and create summary
            const summary = await entityOperator.prepareSummary(normalizedEntities, normalizedRelationships, "", "");
            const data = await entityOperator.commitEntityDesign('', summary);
            return {
                content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
            };
        }
    );
}
