import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useSWR from 'swr';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

export interface AnalyticsConfig {
  enabled: boolean;
  measurementId: string;
}

let analyticsBaseUrl = '';
export function setAnalyticsBaseUrl(v: string) {
  analyticsBaseUrl = v;
}
export function fullAnalyticsUrl(subPath: string) {
  return analyticsBaseUrl + subPath;
}

const ANALYTICS_CONFIG_PATH = '/mateapi/public-config/analytics';

/**
 * Fetches the GA config from the server and injects the Google Analytics script.
 * Tracks page views on route changes via React Router.
 *
 * Call `setAnalyticsBaseUrl(baseUrl)` once during app initialisation before using this hook.
 */
export function useGoogleAnalytics() {
  const location = useLocation();

  const { data: gaResponse } = useSWR<{ success: boolean; data: AnalyticsConfig }>(
    fullAnalyticsUrl(ANALYTICS_CONFIG_PATH),
    (url: string) => fetch(url, { credentials: 'include' }).then(res => res.json())
  );

  const measurementId = gaResponse?.data?.measurementId;
  const isEnabled = gaResponse?.data?.enabled ?? false;

  // 1. Inject the GA Script once
  useEffect(() => {
    if (!isEnabled || !measurementId || document.getElementById('ga-script')) return;

    const script = document.createElement('script');
    script.id = 'ga-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());

    // Disable default page hit since we handle it manually via React Router
    window.gtag('config', measurementId, { send_page_view: false });
  }, [measurementId, isEnabled]);

  // 2. Track Route Changes
  useEffect(() => {
    if (isEnabled && measurementId && window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
      });
    }
  }, [location, measurementId, isEnabled]);
}
