## Configuration

You must configure a Vite proxy so all `/api` and `/files` requests are forwarded to the FormCMS backend. This avoids CORS issues.

> **Always call `get_server_info` first** (if MCP is connected) to get the actual `formcmsBaseUrl`. Use that value as the proxy target — do not hardcode a URL.

### Create `vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Replace <FORMCMS_BASE_URL> with the value from get_server_info.
      // Both /api and /files must point to the same FormCMS backend URL.
      '/api': {
        target: '<FORMCMS_BASE_URL>', // e.g. http://localhost:5000
        changeOrigin: true,
      },
      '/files': {
        target: '<FORMCMS_BASE_URL>', // e.g. http://localhost:5000
        changeOrigin: true,
      }
    }
  }
});
```
