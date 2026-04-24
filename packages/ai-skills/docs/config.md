## Configuration

FormCMS apps communicate with the backend via proxy to avoid CORS issues during development.

> **If you have the MCP server connected:** call `get_server_info` first — it returns `formcmsBaseUrl`, which is the correct proxy target. Use that value instead of the placeholder below.

### `vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Replace <FORMCMS_BASE_URL> with the value returned by the get_server_info MCP tool.
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
