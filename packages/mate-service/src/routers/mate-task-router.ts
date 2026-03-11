import type { FastifyPluginAsync } from 'fastify';
import { ENDPOINTS } from '@formmate/shared';

const mateTaskRouter: FastifyPluginAsync = async (fastify) => {
    fastify.log.info('Registering mate task router...');
    console.log('MATE TASK ROUTER LOADING...', ENDPOINTS.MATE_TASKS.LATEST);
    fastify.get(ENDPOINTS.MATE_TASKS.LATEST, {
        preHandler: [fastify.authenticate]
    }, async (request) => {
        const { limit } = request.query as { limit?: string };
        const tasks = await fastify.agentTaskRepository.findLatest(limit ? parseInt(limit, 10) : 20);
        return { success: true, data: tasks };
    });

    fastify.patch(ENDPOINTS.MATE_TASKS.TOGGLE_ITEM, {
        preHandler: [fastify.authenticate]
    }, async (request) => {
        const { taskId, index } = request.params as { taskId: string, index: string };
        fastify.log.info({ taskId, index }, 'PATCH toggle item request received');
        await fastify.taskOperator.toggleItemStatus(parseInt(taskId, 10), parseInt(index, 10));
        return { success: true };
    });
};

export default mateTaskRouter;
