import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ENTITY_DESIGNER_PROMPT, QUERY_BUILDER_PROMPT } from '@formmate/shared';

export function registerQueryPrompts(server: McpServer): void {
    server.prompt(
        'design-query',
        'Generate FormCMS named GraphQL queries from a natural language description and a GraphQL SDL schema. ' +
        'Returns a JSON payload ready for the save_query tool.',
        {
            description: z
                .string()
                .describe(
                    'Natural language description of the query logic. ' +
                    'Example: "A query to list all posts with their titles and category names."'
                ),
            sdl: z
                .string()
                .describe(
                    'The GraphQL SDL schema to use as context for generating the query.'
                ),
        },
        ({ description, sdl }) => {
            return {
                messages: [
                    {
                        role: 'user',
                        content: {
                            type: 'text',
                            text: `${QUERY_BUILDER_PROMPT}\n\n---\n\nGRAPHQL SDL SCHEMA:\n${sdl}\n\nQUERY REQUEST:\n${description}`,
                        },
                    },
                ],
            };
        }
    );
}

export function registerSchemaPrompts(server: McpServer): void {
    server.prompt(
        'design-entity',
        'Generate a FormCMS entity schema (entities + relationships) from a natural language description. ' +
        'Returns a ready-to-use JSON payload for the define_entity tool.',
        {
            description: z
                .string()
                .describe(
                    'Natural language description of the domain or entities to design. ' +
                    'Example: "A blogging platform with posts, categories, and tags."'
                ),
            existingSchema: z
                .string()
                .optional()
                .describe(
                    'Optional: JSON string of an existing entity schema to modify rather than create from scratch.'
                ),
        },
        ({ description, existingSchema }) => {
            const userMessage = existingSchema
                ? `EXISTING ENTITY SCHEMA:\n${existingSchema}\n\nModification request:\n${description}`
                : description;

            return {
                messages: [
                    {
                        role: 'user',
                        content: {
                            type: 'text',
                            text: `${ENTITY_DESIGNER_PROMPT}\n\n---\n\n${userMessage}`,
                        },
                    },
                ],
            };
        }
    );
}
