import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const API_REFERENCE = `
# FormCMS API Reference

## Authentication

FormCMS uses **cookie-based session authentication** via axios.

### Setup (\`src/main.tsx\` or \`src/App.tsx\`)

\`\`\`typescript
import axios from 'axios';
// Must be set globally — ensures cookies are sent on every request
axios.defaults.withCredentials = true;
\`\`\`

### Auth service (\`src/services/auth.ts\`)

Use axios directly and wrap calls with \`catchClient\` to return \`{ data } | { error, errorDetail }\` instead of throwing:

\`\`\`typescript
import axios from 'axios';
import useSWR from 'swr';

// ── Helpers ────────────────────────────────────────────────────────────────
const fetcher = (url: string) => axios.get(url).then(r => r.data);

export async function catchClient<T>(req: () => Promise<T>) {
  try {
    return { data: await req() };
  } catch (err: any) {
    const title = err.response?.data?.title ?? 'An error has occurred.';
    return { error: title, errorDetail: err.response?.data };
  }
}

// ── Session ────────────────────────────────────────────────────────────────
// SWR caches the session; returns undefined while loading, null when logged out
export function useUserInfo() {
  return useSWR('/api/me', fetcher, { revalidateOnFocus: false, shouldRetryOnError: false });
}

// ── Auth actions (these return no data — just check for success) ──────────
export const login    = (payload: { usernameOrEmail: string; password: string }) =>
  catchClient(() => axios.post('/api/login', payload));

export const register = (payload: { email: string; password: string; userName: string }) =>
  catchClient(() => axios.post('/api/register', payload));

export const logout   = () =>
  catchClient(() => axios.get('/api/logout'));
\`\`\`

### Consuming in a component

\`\`\`tsx
import { useUserInfo, login, logout } from '../services/auth';

export function App() {
  const { data: userInfo, isLoading, mutate } = useUserInfo();

  const handleLogin = async (usernameOrEmail: string, password: string) => {
    const res = await login({ usernameOrEmail, password });
    if (res.error) {
      setError(res.errorDetail?.title || res.error);
    } else {
      await mutate(); // re-fetch /api/me to hydrate session
    }
  };

  const handleLogout = async () => {
    await logout();
    await mutate(null, false); // clear cached user without refetch
  };

  if (isLoading) return <Spinner />;
  if (!userInfo) return <LoginForm onSubmit={handleLogin} />;
  return <Dashboard user={userInfo} onLogout={handleLogout} />;
}
\`\`\`

### Auth Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| \`GET\`  | \`/api/me\` | Get current session user (401 if not logged in) |
| \`POST\` | \`/api/login\` | Login — body: \`{ usernameOrEmail, password }\` |
| \`POST\` | \`/api/register\` | Register — body: \`{ email, password, userName }\` |
| \`GET\`  | \`/api/logout\` | Clear session cookie |
| \`POST\` | \`/api/profile/password\` | Change password — body: \`{ oldPassword, password }\` |
| \`POST\` | \`/api/profile/avatar\` | Upload avatar — \`multipart/form-data\`, field name \`file\` |

### Key Rules
- Set \`axios.defaults.withCredentials = true\` **once** at app startup — applies to all requests.
- Auth calls return \`{ data } | { error, errorDetail }\` — always check \`res.error\`, never rely on thrown exceptions.
- Use SWR's \`mutate()\` after login/logout to sync the cached session without a full page reload.
- \`userInfo.roles\` controls access (e.g. \`'admin'\`).

---

## Entity API

Used for standard CRUD operations on entities.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| \`GET\`  | \`/api/entities/{entity}\` | List records (supports query params: \`limit\`, \`offset\`, filters) |
| \`GET\`  | \`/api/entities/{entity}/{id}\` | Get single record |
| \`POST\` | \`/api/entities/{entity}/insert\` | Create |
| \`POST\` | \`/api/entities/{entity}/update\` | Update |
| \`POST\` | \`/api/entities/{entity}/delete\` | Delete |

### List response shape

\`\`\`json
{
  "items": [
    { "id": 1, "title": "...", "published": "true", "publicationStatus": "published", "createdAt": "...", "updatedAt": "..." }
  ],
  "totalRecords": 100
}
\`\`\`

> Note: \`published\` is a string \`"true"\` / \`"false"\`, not a boolean.

Example (List with filters):
\`\`\`typescript
const res = await axios.get('/api/entities/post', {
  params: { limit: 10, offset: 0 },
});
const { items, totalRecords } = res.data;
\`\`\`

Example (Insert):
\`\`\`typescript
await axios.post('/api/entities/post/insert', {
  title: 'New Post',
  published: 'true',
});
\`\`\`

## Named Queries

Used for fetching specific data sets defined in FormCMS.

Endpoint: \`GET /api/queries/{queryName}?param=value\`

\`\`\`typescript
const res = await axios.get('/api/queries/habitTemplateList', {
  params: { limit: 10 },
});
const data = res.data;
\`\`\`
`;

export function registerAuthPrompts(server: McpServer): void {
    server.prompt(
        'formcms-auth-api',
        'FormCMS API reference — authentication, entity CRUD, and named queries. ' +
        'Use this when building login, register, logout, data fetching, or session-management features.',
        () => ({
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: API_REFERENCE,
                    },
                },
            ],
        })
    );
}
