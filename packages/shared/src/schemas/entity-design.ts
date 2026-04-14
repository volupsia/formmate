// ─── Entity-Design Shared Constants ──────────────────────────────────────────
//
// Single source of truth for:
//   • JSON Schemas used to validate entity/attribute/relationship payloads
//   • The entity-designer LLM system prompt
//
// Consumers:
//   • @formmate/service  — reads these at startup instead of fs.readFile
//   • @formmate/mcp-server — exposes them as MCP Resources + Prompt template

// ─── Attribute JSON Schema ────────────────────────────────────────────────────

export const ATTRIBUTE_JSON_SCHEMA = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    title: 'Attribute',
    required: ['field', 'header', 'inList', 'inDetail', 'displayType', 'validation', 'options'],
    properties: {
        field: {
            minLength: 1,
            type: 'string',
            title: 'Field',
            description: 'The internal name of this attribute, used in the database and code (camelCase)',
        },
        header: {
            minLength: 1,
            type: 'string',
            title: 'Header',
            description: 'The human-readable label shown in the UI for this field',
        },
        inList: {
            type: 'boolean',
            title: 'In List',
            description: 'Whether this field should appear in list views or tables in the UI',
            default: true,
        },
        inDetail: {
            default: true,
            type: 'boolean',
            title: 'In Detail',
            description: 'Whether this field should appear on detailed entity view pages',
        },
        displayType: {
            title: 'Display Type',
            description: 'How the field should be displayed or edited in the UI',
            type: 'string',
            enum: [
                'text',
                'textarea',
                'editor',
                'number',
                'localDatetime',
                'datetime',
                'date',
                'image',
                'gallery',
                'file',
                'dictionary',
                'dropdown',
                'multiselect',
            ],
        },
        validation: {
            title: 'Validation Rule',
            type: 'string',
            description: 'A regex pattern used to validate user input for this field',
        },
        options: {
            title: 'Options',
            type: 'string',
            description: "Comma-separated list of options, required if displayType is 'dropdown' or 'multiselect'",
        },
    },
} as const;

// ─── Entity JSON Schema ───────────────────────────────────────────────────────

export const ENTITY_JSON_SCHEMA = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Entity',
    type: 'object',
    required: ['name', 'displayName', 'tableName', 'labelAttributeName', 'attributes'],
    properties: {
        name: {
            type: 'string',
            description: 'Internal entity name used in code and database (camelCase)',
        },
        displayName: {
            type: 'string',
            description: 'Human-readable name for this entity, shown in the UI',
        },
        tableName: {
            type: 'string',
            description: 'Name of the database table that stores this entity',
        },
        labelAttributeName: {
            type: 'string',
            description: 'The main attribute that represents this entity, used as a label in lists or dropdowns',
        },
        attributes: {
            type: 'array',
            description: 'List of attributes (fields) for this entity',
            items: ATTRIBUTE_JSON_SCHEMA,
            minItems: 1,
        },
    },
} as const;

// ─── Relationship JSON Schema ─────────────────────────────────────────────────

export const RELATIONSHIP_JSON_SCHEMA = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Relationship',
    type: 'object',
    required: ['sourceEntity', 'fieldName', 'targetEntity', 'cardinality'],
    additionalProperties: false,
    properties: {
        sourceEntity: {
            type: 'string',
            description: 'The entity where this relationship is defined (camelCase)',
        },
        fieldName: {
            type: 'string',
            description: 'The field name on the source entity representing this relationship (camelCase)',
        },
        label: {
            type: 'string',
            description: 'Human-readable label for this relationship, shown in the UI',
        },
        targetEntity: {
            type: 'string',
            description: 'The related entity (camelCase)',
        },
        cardinality: {
            type: 'string',
            enum: ['oneToMany', 'manyToOne', 'manyToMany'],
            description: 'Overall relationship cardinality from sourceEntity to targetEntity',
        },
    },
} as const;

// ─── Combined Entity-Design JSON Schema ──────────────────────────────────────
// Top-level payload shape: { entities[], relationships[] }

export const ENTITY_DESIGN_JSON_SCHEMA = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'EntityDesign',
    description: 'Top-level payload for creating or updating FormCMS entity designs',
    type: 'object',
    required: ['entities', 'relationships'],
    properties: {
        entities: {
            type: 'array',
            description: 'Entities to create or update',
            items: { $ref: '#/definitions/entity' },
            minItems: 1,
        },
        relationships: {
            type: 'array',
            description:
                'Cross-entity relationships. Do NOT model relationships as attributes — they belong here only.',
            items: { $ref: '#/definitions/relationship' },
        },
    },
    definitions: {
        attribute: ATTRIBUTE_JSON_SCHEMA,
        entity: ENTITY_JSON_SCHEMA,
        relationship: RELATIONSHIP_JSON_SCHEMA,
    },
} as const;

// Convenience: JSON strings (drop-in replacement for fs.readFile output)
export const ATTRIBUTE_JSON_SCHEMA_STR = JSON.stringify(ATTRIBUTE_JSON_SCHEMA, null, 2);
export const ENTITY_JSON_SCHEMA_STR = JSON.stringify(ENTITY_JSON_SCHEMA, null, 2);
export const RELATIONSHIP_JSON_SCHEMA_STR = JSON.stringify(RELATIONSHIP_JSON_SCHEMA, null, 2);

// ─── Entity-Designer LLM System Prompt ───────────────────────────────────────
// Mirrors: packages/mate-service/src/agent/entity-designer.md

export const ENTITY_DESIGNER_PROMPT = `You are a schema generator for FormCMS.

<system_goal>
Generate a valid JSON schema for a Content Management System.
Output ONLY valid JSON. No markdown, no conversational text.
</system_goal>

<strict_constraints>
### IMMEDIATELY FORBIDDEN (Violations will cause system failure)
1. **Forbidden Regex:** Do NOT use lookarounds (\`(?=)\`, \`(?!)\`) in validation rules. Regex must be simple and structural only (e.g. \`^[0-9-]*$\`).
2. **Forbidden Identifiers:** Do NOT generate primary keys, \`id\` fields, or fields ending in \`Id\` or \`Ids\`.
3. **Forbidden Formatting:** PascalCase is NOT allowed. Use camelCase for all identifiers.
4. **Forbidden Entities:** Do NOT generate \`User\` or \`Comment\` entities.
5. **Forbidden Fields:** Do NOT generate built-in fields or fields with similar functional meanings (e.g. "state", "postDate", "creationTime"): \`status\`, \`publishedAt\`, \`createdAt\`, \`updatedAt\`, \`publicationStatus\`.
6. **Forbidden Relationships:** Do NOT model relationships as attributes. They must exist ONLY in the \`relationships\` array.
</strict_constraints>

<schema_definitions>

  <section name="ATTRIBUTES">
    * **Concept:** Attributes represent scalar data ONLY.
    * **Structure:** Must be defined in the \`attributes\` array.
    * **Required Properties:** \`field\`, \`header\`, \`displayType\`, \`inList\`, \`inDetail\`, \`validation\`, \`options\`.
    * **Validation Rules:**
        * Must be a STRING representing a valid RegEx.
        * **FORBIDDEN:** Do not use \`(?=\`, \`(?!\`, or any lookaround.
        * **STRATEGY:** Use "Allowed Character" sets rather than "Exact Sequence" logic.
        * **EXAMPLES:** - For ISBN: "^[0-9X-]*$"
            - For Phone: "^[0-9+\\\\s-]*$"
            - For SKU: "^[A-Z0-9-]*$"
        * If a structural pattern cannot be achieved without lookarounds, fallback to \`.*\`.
        * **Image Attributes:** For fields with \`displayType: "image"\`, do NOT generate a validation RegEx (use \`.*\` or empty string if required).
    * **DisplayType Rules:**
        * Use \`dropdown\` or \`multiselect\` ONLY if \`options\` are provided.
        * \`options\` must be a single comma-separated STRING (e.g., "A,B,C").
        * Forbidden value: \`select\`.
  </section>

  <section name="RELATIONSHIPS">
    * **Concept:** Connections between entities.
    * **Location:** MUST appear in the top-level \`relationships\` array, NOT inside entities.
    * **Required Properties:** \`sourceEntity\`, \`targetEntity\`, \`fieldName\`, \`cardinality\`.
    * **Cardinality:**
        * Allowed values: \`oneToMany\`, \`manyToOne\`, \`manyToMany\`.
        * Defined from Source -> Target.
        * \`manyToOne\` implies the Source holds the foreign key.
  </section>

  <section name="MODIFICATIONS">
    * If an \`EXISTING ENTITY SCHEMA\` is provided, you MUST use it as the base.
    * Keep existing attributes unless explicitly asked to remove them.
    * Output the FULL entity definition, not just the changes.
  </section>

</schema_definitions>

<output_template>
{
  "entities": [
    {
      "name": "camelCaseName",
      "displayName": "Human Readable Name",
      "tableName": "camelCaseName",
      "labelAttributeName": "camelCaseField",
      "attributes": [
        {
          "field": "camelCaseField",
          "header": "Human Readable Header",
          "displayType": "text",
          "validation": "^[A-Za-z]+$",
          "options": "",
          "inList": true,
          "inDetail": true
        }
      ]
    }
  ],
  "relationships": [
    {
      "sourceEntity": "sourceName",
      "targetEntity": "targetName",
      "fieldName": "relationField",
      "cardinality": "oneToMany"
    }
  ]
}
</output_template>`;
