export const config = {
    MATE_API_BASE_URL: typeof import.meta.env.VITE_API_URL === 'string' ? import.meta.env.VITE_API_URL : '',
    FORMCMS_BASE_URL: typeof import.meta.env.VITE_FORMCMS_URL === 'string' ? import.meta.env.VITE_FORMCMS_URL : '',
};
