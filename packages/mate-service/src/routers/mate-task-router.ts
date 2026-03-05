import type { FastifyPluginAsync } from 'fastify';
import { ENDPOINTS } from '@formmate/shared';

const mateTaskRouter: FastifyPluginAsync = async (fastify) => {
    fastify.get(ENDPOINTS.MATE_TASKS.LATEST, {
        preHandler: [fastify.authenticate]
    }, async (request) => {
        const { limit } = request.query as { limit?: string };
        const tasks = await fastify.agentTaskRepository.findLatest(limit ? parseInt(limit, 10) : 20);
        return { success: true, data: tasks };
    });
};

export default mateTaskRouter;
