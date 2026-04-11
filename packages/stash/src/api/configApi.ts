import { apiFetchJson, apiBaseUrl } from './client';

export interface AnalyticsConfig {
  enabled: boolean;
  measurementId: string;
}

export const configApi = {
  fetchAnalyticsConfig: () =>
    apiFetchJson<{ success: boolean; data: AnalyticsConfig }>('/mateapi/public-config/analytics'),
    
  analyticsConfigUrl: () => `${apiBaseUrl}/mateapi/public-config/analytics`,
};

