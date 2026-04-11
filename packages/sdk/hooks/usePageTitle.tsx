import { useEffect } from 'react';

/**
 * Sets the browser document.title with a formatted pattern.
 *
 * @param pageLabel  – The label for the current page (e.g. "Blog Posts", "Dashboard")
 * @param appName   – The application name suffix (e.g. "Admin", "Portal")
 * @param emoji     – Optional leading emoji
 *
 * Resulting title: "📝 Blog Posts • Admin"
 */
export function usePageTitle(pageLabel: string | undefined, appName: string, emoji?: string) {
  useEffect(() => {
    if (!pageLabel) return;
    const prefix = emoji ? `${emoji} ` : '';
    document.title = `${prefix}${pageLabel} • ${appName}`;
  }, [pageLabel, appName, emoji]);
}
