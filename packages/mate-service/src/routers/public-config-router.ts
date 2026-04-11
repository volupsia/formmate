import type { FastifyPluginAsync } from 'fastify';

const publicConfigRouter: FastifyPluginAsync = async (fastify) => {
    // GET /mateapi/public-config/analytics - Get GA settings without authentication
    fastify.get('/mateapi/public-config/analytics', async (_request, _reply) => {
        const enabled = await fastify.systemSettingRepository.get('ENABLE_GOOGLE_ANALYTICS');
        const measurementId = await fastify.systemSettingRepository.get('GA_MEASUREMENT_ID');
        
        return {
            success: true,
            data: {
                enabled: enabled === 'true',
                measurementId: measurementId ?? ''
            }
        };
    });
};

export default publicConfigRouter;
