import type { FormCMSClient } from '../../infrastructures/formcms-client';
import type { ServiceLogger } from '../../types/logger';
import { type ChatHandler, type ChatContext, handleChatError } from './chat-handler';
import { type SaveSchemaPayload, type SchemaDto } from '@formmate/shared';
import { PageArchitect } from './page-architect';
import { RouterDesigner } from './router-designer';
import { HtmlGenerator } from './html-generator';

export class PageGenerator implements ChatHandler {
    constructor(
        private readonly formCMSClient: FormCMSClient,
        private readonly logger: ServiceLogger,
        private readonly baseUrl: string,
        private readonly pageArchitect: PageArchitect,
        private readonly routerDesigner: RouterDesigner,
        private readonly htmlGenerator: HtmlGenerator,
    ) { }

    async handle(userInput: string, context: ChatContext): Promise<void> {
        try {
            let existingPageSchema: SchemaDto | null = null;
            let schemaId = '';

            // 1. Identification: Check if user input contains #schemaId:
            const idMatch = userInput.match(/@page_generator#([^:]+):/);
            if (idMatch) {
                try {
                    existingPageSchema = await this.formCMSClient.getSchemaBySchemaId(context.externalCookie, idMatch[1] as string);
                    schemaId = idMatch[1] as string;
                    const pageName = existingPageSchema.settings?.page?.name || existingPageSchema.name;
                    let message = `I am Page generator, I found the existing page "${pageName}". I will fetch the latest schema and help you modify it...`;
                    if (existingPageSchema.publicationStatus === 'draft') {
                        message += "\n\n**Note: This page is currently a DRAFT. You should publish it to see the changes live.**";
                    }
                    await context.saveAssistantMessage(message);
                } catch (e) {
                    this.logger.warn({ schemaId }, 'Existing page not found for modification');
                    await context.saveAssistantMessage(`I am Page generator, I couldn't find the existing page with ID "${schemaId}". I will fetch the latest schema and generate a new page for you...`);
                }
            }

            // 2. Planning: Call Router Designer then Page Architect
            const metadataStr = existingPageSchema?.settings?.page?.metadata;
            let existingRoutingPlan: any = undefined;
            let existingArchitecture: any = undefined;

            if (metadataStr) {
                try {
                    const metadata = JSON.parse(metadataStr);
                    existingRoutingPlan = metadata.routingPlan;
                    existingArchitecture = metadata.architecturePlan;
                } catch (e) {
                    this.logger.warn({ metadataStr }, 'Failed to parse page metadata');
                }
            }


            const routingPlan = await this.routerDesigner.plan(userInput, context, existingRoutingPlan);
            const queries = await this.formCMSClient.getAllQueries(context.externalCookie);
            const architecturePlan = await this.pageArchitect.plan(userInput, context, queries, routingPlan, existingArchitecture);

            await context.saveAssistantMessage(`I've planned the routing for "${routingPlan.pageName}" and the UI structure for your "${architecturePlan.pageType}" page.`);

            // 3. Context Gathering: Fetch selected Queries and their sample data
            const queryDetails = await Promise.all(architecturePlan.selectedQueries.map(async (sq) => {
                const queryName = sq.queryName;
                const fieldName = sq.fieldName;
                try {
                    const sampleData = await this.formCMSClient.requestQuery(context.externalCookie, queryName);
                    return `QUERY: ${queryName} -> FIELD: ${fieldName}
                    ENDPOINTS: ${this.baseUrl}/api/queries/${queryName} 
                    REFERENCE RESPONSE SHAPE (DO NOT OUTPUT): ${JSON.stringify(sampleData)}`;
                } catch (e) {
                    return `QUERY: ${queryName} -> FIELD: ${fieldName}
                    ENDPOINTS: ${this.baseUrl}/api/queries/${queryName}`;
                }
            }));

            // 4. Generation: Call Html Generator
            const htmlResponse = await this.htmlGenerator.generate(
                userInput,
                routingPlan,
                architecturePlan,
                queryDetails,
                existingPageSchema
            );

            // Save AI response to database log
            await context.saveAiResponseLog('page-generator',
                JSON.stringify({ ...htmlResponse, ...routingPlan, ...architecturePlan, taskType: context.taskType })
            );

            let { title } = htmlResponse;
            let name = routingPlan.pageName || (existingPageSchema?.name) || `generated-page-${Date.now()}`;
            title = title || (existingPageSchema?.settings.page?.title) || 'Generated Page';

            // 5. Persistence: Save the generated page to FormCMS
            try {
                const payload: SaveSchemaPayload = {
                    schemaId,
                    type: 'page',
                    settings: {
                        page: {
                            name: name,
                            title: title,
                            html: htmlResponse.html,
                            source: 'ai',
                            metadata: JSON.stringify({
                                routingPlan,
                                architecturePlan,
                            }),
                        }
                    }
                };
                const saveResp = await this.formCMSClient.saveSchema(context.externalCookie, payload);
                const newSchemaId = saveResp.data.schemaId;

                this.logger.info({ name, schemaId: newSchemaId }, 'Successfully saved generated page to FormCMS');

                if (newSchemaId) {
                    await context.onSchemasSync({
                        task_type: 'page_generator',
                        schemasId: [newSchemaId]
                    });
                }
            } catch (saveError) {
                this.logger.error({ error: saveError }, 'Failed to save generated page to FormCMS');
            }

            // 6. Completion: Send the final message
            const finalMessage = existingPageSchema
                ? `I have updated the page "${name}", you can view it in FormCMS.`
                : "I have generated your HTML page, you can find it in FormCMS.";
            await context.saveAssistantMessage(finalMessage);

        } catch (error: any) {
            await handleChatError(error, context, this.logger, "generating your HTML page");
        }
    }
}
