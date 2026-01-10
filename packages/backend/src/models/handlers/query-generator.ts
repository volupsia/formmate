import { object } from 'zod/v4';
import type { AIAgent } from '../../infrastructures/agent.interface';
import type { FormCMSClient } from '../../infrastructures/formcms-client';
import type { ServiceLogger } from '../../types/logger';
import { type ChatHandler, type ChatContext } from './chat-handler';
import { type QueryResponse } from '@formmate/shared';

export class QueryGenerator implements ChatHandler {
    constructor(
        private readonly aiAgent: AIAgent,
        private readonly systemPrompt: string,
        private readonly formCMSClient: FormCMSClient,
        private readonly logger: ServiceLogger,
    ) { }

    async handle(userInput: string, context: ChatContext): Promise<void> {
        try {
            await context.saveAssistantMessage('I am query generator, I am fetching the latest schema and generating your query...');

            // 1. Fetch SDL
            const sdl = await this.formCMSClient.generateSDL(context.externalCookie);

            // 2. Call AI Agent to generate GraphQL query
            // Developer message is set as SDL
            const queryResponse: QueryResponse = await this.aiAgent.generate(
                this.systemPrompt,
                `\nGRAPHQL SDL:\n${sdl}`,
                userInput
            );

            // Save AI response to database log
            await context.saveAiResponseLog('query-generator',
                JSON.stringify({ ...queryResponse, taskType: context.taskType })
            );

            const schemaIds: string[] = [];

            for (const [name, source] of Object.entries(queryResponse.queries)) {

                await context.saveAssistantMessage(`Executing generated query "${name}":\n${source}`);

                // 3. Execute query against FormCMS
                const schemaId = await this.formCMSClient.saveQuery(context.externalCookie, name, source);
                schemaIds.push(schemaId);

                await context.saveAssistantMessage(`Query "${name}" executed successfully.`);
            }

            if (schemaIds.length > 0) {
                await context.onSchemasSync({
                    task_type: 'query_generator',
                    schemasId: schemaIds
                });
            }


        } catch (error: any) {
            this.logger.error({ error, stack: error?.stack }, 'Error in QueryGenerator handle');
            const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
            await context.saveAssistantMessage(`I'm sorry, I encountered an error while generating or executing your query:\n${errorMessage}`);
        }
    }
}
