## Configuration

FormCMS apps typically communicate with the backend via API. To avoid CORS issues during development, use a proxy in your Vite configuration instead of hardcoding an API base URL.

### `vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // In Docker, nginx (default port 5000) is the single gateway:
      //   /api/ → .NET FormCMS backend
      //   /mcp/ → MCP server
      // Point the proxy target at your Docker nginx URL.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/mcp': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
});
```
