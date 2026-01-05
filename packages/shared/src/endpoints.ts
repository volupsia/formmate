export const ENDPOINTS = {
    CHAT: {
        HISTORY: '/mateapi/chat/history',
    },
    AUTH: {
        LOGIN: '/api/login',
        LOGOUT: '/api/logout',
        ME: '/api/me',
    },
    AI: {
        AGENTS: '/mateapi/ai/agents',
        LOGS: '/mateapi/ai/logs',
    },
    SCHEMA: {
        ALL: '/api/schemas?type=',
        SAVE: '/api/schemas',
        DEFINE: '/api/schemas/entity/define',
        DELETE: '/api/schemas/:id',
    },
    QUERY: {
        GET_DATA: '/api/queries/:id',
    },
    GRAPHQL: '/graphql',
} as const;
