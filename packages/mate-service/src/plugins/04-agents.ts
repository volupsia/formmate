import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    ENTITY_JSON_SCHEMA_STR,
    ATTRIBUTE_JSON_SCHEMA_STR,
    RELATIONSHIP_JSON_SCHEMA_STR,
    ENTITY_DESIGNER_PROMPT,
    AGENT_NAMES,
} from '@formmate/shared';
import { config } from '../config';

import { IntentClassifier } from '../agent/intent-classifier';
import { EntityGenerator } from '../agent/entity-designer';
import { QueryGenerator } from '../agent/query-builder';
import { PagePlanner } from '../agent/page-planner';
import { PageArchitect } from '../agent/page-architect';
import { DataGenerator } from '../agent/data-synthesizer';
import { PAGE_COMPONENT_REGISTRY } from '../agent/page-components/index';
import { PageComponentBuilder } from '../agent/page-components/page-component-builder';
import type { Agent } from '../agent/chat-assistant';
import { SystemArchitect } from '../agent/system-architect';

const agentsPlugin: FastifyPluginAsync = async (fastify) => {
    fastify.log.info('Starting agents plugin...');
    
    const providers = fastify.aiProvider;
    const formcmsClient = fastify.formCMS;
    const modelLogger = fastify.log.child({ component: 'MODEL' }, { level: config.LOG_LEVEL_MODEL });

    const entityOperator = fastify.entityOperator;
    const pageOperator = fastify.pageOperator;
    const prisma = fastify.prisma;

    // Resolve directories
    const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
    const agentsDir = path.join(__dirname, 'agent');

    // Schemas come from @formmate/shared — single source of truth
    const entitySchema = ENTITY_JSON_SCHEMA_STR;
    const attributeSchema = ATTRIBUTE_JSON_SCHEMA_STR;
    const relationshipSchema = RELATIONSHIP_JSON_SCHEMA_STR;

    const loadPrompt = async (fileName: string) => {
        try {
            return await fs.readFile(path.join(agentsDir, fileName), 'utf-8');
        } catch (err) {
            fastify.log.warn(`Prompt ${fileName} not found in agents folder, using empty string`);
            return '';
        }
    };

    // entity-designer prompt comes from @formmate/shared
    const entityGeneratorPrompt = ENTITY_DESIGNER_PROMPT;

    const [
        intentClassifierPrompt,
        queryGeneratorPrompt,
        dataGeneratorPrompt,
        pageArchitectPrompt,
        pagePlannerPrompt,
        systemArchitectPrompt,
    ] = await Promise.all([
        loadPrompt('intent-classifier.md'),
        loadPrompt('query-builder.md'),
        loadPrompt('data-synthesizer.md'),
        loadPrompt('page-architect.md'),
        loadPrompt('page-planner.md'),
        loadPrompt('system-architect.md'),
    ]);

    const intentClassifiers: Record<string, IntentClassifier> = {};

    for (const [providerName, provider] of Object.entries(providers)) {
        try {
            // DB-backed style lookup function
            const getStylePrompt = async (styleName: string, pageType: string): Promise<string> => {
                if (!styleName) return '';
                const style = await (prisma as any).designStyle.findUnique({ where: { name: styleName } });
                if (!style) return '';
                return pageType === 'detail' ? (style.detailPrompt || '') : (style.listPrompt || '');
            };

            // Load template options from DB for PagePlanner
            const getTemplateOptions = async (): Promise<{ id: string; name: string; description: string }[]> => {
                const styles = await (prisma as any).designStyle.findMany({ orderBy: { name: 'asc' } });
                return styles.map((s: any) => ({ id: s.name, name: s.displayName, description: s.description }));
            };

            const pageAddonsDir = path.join(__dirname, 'agent/page-components');

            // Build addon handlers from registry
            const addonHandlers: Record<string, Agent<any>> = {};

            for (const addon of PAGE_COMPONENT_REGISTRY) {
                let prompt = '';
                try {
                    prompt = await fs.readFile(path.join(pageAddonsDir, addon.resourceDir, 'prompt.md'), 'utf-8');
                } catch (err) {
                    fastify.log.warn(`Prompt for addon ${addon.id} not found at ${addon.resourceDir}/prompt.md`);
                }

                let snippet: string | undefined = undefined;
                if (addon.hasSnippet) {
                    try {
                        snippet = await fs.readFile(path.join(pageAddonsDir, addon.resourceDir, 'snippet.html'), 'utf-8');
                    } catch (err) {
                        fastify.log.warn(`Snippet for addon ${addon.id} not found at ${addon.resourceDir}/snippet.html`);
                    }
                }

                addonHandlers[addon.agentName] = new PageComponentBuilder(addon, provider, prompt, snippet, formcmsClient, modelLogger, pageOperator, config.FORMCMS_BASE_URL, getStylePrompt);
            }

            const pageArchitectAgent = new PageArchitect(provider, pageArchitectPrompt, formcmsClient, modelLogger, pageOperator);

            const entityGenerator = new EntityGenerator(provider, entityGeneratorPrompt,
                entitySchema, attributeSchema, relationshipSchema, formcmsClient, modelLogger, entityOperator);
            const queryGenerator = new QueryGenerator(provider, queryGeneratorPrompt, formcmsClient, modelLogger);
            const pagePlannerAgent = new PagePlanner(provider, pagePlannerPrompt, modelLogger, getTemplateOptions, formcmsClient, pageOperator);
            const dataGenerator = new DataGenerator(provider, dataGeneratorPrompt, formcmsClient, modelLogger);
            const systemArchitect = new SystemArchitect(provider, systemArchitectPrompt, prisma, modelLogger);

            const intentClassifier = new IntentClassifier(
                provider,
                intentClassifierPrompt
            );

            intentClassifiers[providerName] = intentClassifier;

            // @ts-ignore
            if (!fastify.chatHandlers) {
                fastify.decorate('chatHandlers', {});
            }
            // @ts-ignore
            if (!fastify.chatHandlers[providerName]) {
                // @ts-ignore
                fastify.chatHandlers[providerName] = {};
            }

            // @ts-ignore
            fastify.chatHandlers[providerName] = {
                [AGENT_NAMES.ENTITY_DESIGNER]: entityGenerator,
                [AGENT_NAMES.QUERY_BUILDER]: queryGenerator,
                [AGENT_NAMES.PAGE_PLANNER]: pagePlannerAgent,
                [AGENT_NAMES.DATA_SYNTHESIZER]: dataGenerator,
                [AGENT_NAMES.PAGE_ARCHITECT]: pageArchitectAgent,
                [AGENT_NAMES.SYSTEM_ARCHITECT]: systemArchitect,
                ...addonHandlers,
            };
        } catch (error) {
            fastify.log.warn(`Failed to load prompts for provider "${providerName}": ${(error as Error).message}`);
        }
    }

    fastify.decorate('intentClassifier', intentClassifiers);
};

export default fp(agentsPlugin, {
    name: 'agents',
    dependencies: ['infrastructure', 'operators', 'prisma']
});
