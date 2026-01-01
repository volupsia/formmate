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
        SAVE: '/api/schemas/save',
        DELETE: '/api/schemas/:id',
    }
} as const;
