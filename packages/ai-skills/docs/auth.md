## Authentication

FormCMS uses **cookie-based session authentication** via axios.

### Setup (`src/main.tsx` or `src/App.tsx`)

```typescript
import axios from 'axios';
// Must be set globally — ensures cookies are sent on every request
axios.defaults.withCredentials = true;
```

### Auth service (`src/services/auth.ts`)

Use axios directly and wrap calls with `catchClient` to return `{ data } | { error, errorDetail }` instead of throwing:

```typescript
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
```

### Consuming in a component

```tsx
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
```

### Auth Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/api/me` | Get current session user (401 if not logged in) |
| `POST` | `/api/login` | Login — body: `{ usernameOrEmail, password }` |
| `POST` | `/api/register` | Register — body: `{ email, password, userName }` |
| `GET`  | `/api/logout` | Clear session cookie |
| `POST` | `/api/profile/password` | Change password — body: `{ oldPassword, password }` |
| `POST` | `/api/profile/avatar` | Upload avatar — `multipart/form-data`, field name `file` |

### Key Rules
- Set `axios.defaults.withCredentials = true` **once** at app startup — applies to all requests.
- Auth calls return `{ data } | { error, errorDetail }` — always check `res.error`, never rely on thrown exceptions.
- Use SWR's `mutate()` after login/logout to sync the cached session without a full page reload.
- `userInfo.roles` controls access (e.g. `'admin'`).
