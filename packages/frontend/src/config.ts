export const config = {
    MATE_API_BASE_URL: typeof import.meta.env.VITE_API_URL === 'string' ? import.meta.env.VITE_API_URL : 'http://127.0.0.1:3001',
    FORMCMS_BASE_URL: typeof import.meta.env.VITE_FORMCMS_URL === 'string' ? import.meta.env.VITE_FORMCMS_URL : 'http://127.0.0.1:5000',
};
