export const ENDPOINTS = {
    CHAT: {
        HISTORY: '/mateapi/chat/history',
        ENGAGEMENT_BAR: '/mateapi/chat/engagement-bar',
    },
    AUTH: {
        LOGIN: '/api/login',
        LOGOUT: '/api/logout',
        ME: '/api/me',
    },
    AI: {
        PROVIDERS: '/mateapi/ai/providers',
        LOGS: '/mateapi/ai/logs',
        ACT_ON_LOG: '/mateapi/ai/logs/:id/act',
        DELETE_LOG: '/mateapi/ai/logs/:id',
    },
    SCHEMA: {
        ALL: '/api/schemas?type=',
        SAVE: '/api/schemas',
        DEFINE: '/api/schemas/entity/define',
        DELETE: '/api/schemas/:id',
        PUBLISH: '/api/schemas/publish',
        HISTORY: '/api/schemas/history/:schemaId',
    },
    QUERY: {
        GET_DATA: '/api/queries/:id',
        PAGE_DATA: '/api/page-data',
    },
    ASSETS: '/api/assets',
    GRAPHQL: '/graphql',
} as const;
