---
name: Build FormCMS React App
description: Guidelines and patterns for building React applications that integrate with FormCMS backend. Covers configuration, authentication, data fetching (Entity API + Named Queries).
---

# Building a React App with FormCMS

This skill outlines the standard patterns for connecting a React frontend to a FormCMS backend.

## 1. Configuration

FormCMS apps typically require an API base URL configuration. Use Vite's environment variables.

### `src/config.ts`
```typescript
export const CONFIG = {
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || ''
};
```

Ensure your `.env` or `.env.local` contains:
```
VITE_API_BASE_URL=http://localhost:3000
```

---

## 2. Authentication

FormCMS uses **cookie-based session authentication**. Every `fetch` call MUST include
`credentials: 'include'` so the browser sends/receives the session cookie.

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/api/me` | Get current session user (401 if not logged in) |
| `POST` | `/api/login` | Login — body: `{ usernameOrEmail, password }` |
| `POST` | `/api/register` | Register — body: `{ email, password, userName }` |
| `GET`  | `/api/logout` | Clear session cookie |
| `POST` | `/api/profile/password` | Change password — body: `{ oldPassword, password }` |
| `POST` | `/api/profile/avatar` | Upload avatar — `multipart/form-data`, field name `file` |

### AuthContext Pattern (`src/contexts/AuthContext.tsx`)

```tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { CONFIG } from '../config';

interface User {
  id: string | number;
  username: string;
  email?: string;
  avatarUrl?: string | null;
  roles?: string[];
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (email: string, password: string, userName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore existing session on mount
  useEffect(() => {
    fetch(`${CONFIG.API_BASE_URL}/api/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data
        ? { id: data.id, username: data.name ?? data.email, email: data.email, avatarUrl: data.avatarUrl, roles: data.roles }
        : null
      ))
      .finally(() => setLoading(false));
  }, []);

  const login = async (usernameOrEmail: string, password: string) => {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',   // CRITICAL — cookie will not be set without this
      body: JSON.stringify({ usernameOrEmail, password }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    setUser({ id: data.id, username: data.name ?? data.email, email: data.email, avatarUrl: data.avatarUrl, roles: data.roles });
  };

  const register = async (email: string, password: string, userName: string) => {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, userName }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    setUser({ id: data.id, username: data.name ?? data.email, email: data.email, avatarUrl: data.avatarUrl, roles: data.roles });
  };

  const logout = async () => {
    await fetch(`${CONFIG.API_BASE_URL}/api/logout`, { credentials: 'include' });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
```

### Wrap app in `src/main.tsx`
```tsx
import { AuthProvider } from './contexts/AuthContext';
root.render(<AuthProvider><App /></AuthProvider>);
```

### Use in components
```tsx
const { user, login, logout, loading } = useAuth();
if (loading) return <Spinner />;
if (!user) return <LoginForm onSubmit={login} />;
return <Dashboard user={user} onLogout={logout} />;
```

### Key Rules
- Always pass `credentials: 'include'` on **every** fetch/axios call.
- After login or register, the session cookie is set automatically — no token storage needed.
- Use `GET /api/me` on app startup to restore an existing session.
- `roles` on User controls access (e.g. `'admin'`).

---

## 3. Data Fetching

Interacting with FormCMS data involves two main API types: **Entity APIs** and **Named Queries**.

### Entity API
Used for standard CRUD operations on entities.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET`  | `/api/entities/{entity}` | List records (supports query params: `limit`, `offset`, filters) |
| `GET`  | `/api/entities/{entity}/{id}` | Get single record |
| `POST` | `/api/entities/{entity}/insert` | Create |
| `POST` | `/api/entities/{entity}/update` | Update |
| `POST` | `/api/entities/{entity}/delete` | Delete |

Example (Insert):
```typescript
await fetch(`${CONFIG.API_BASE_URL}/api/entities/goal/insert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ targetValue: 5, title: 'New Goal' }),
});
```

### Named Queries
Used for fetching specific data sets defined in FormCMS.
Endpoint: `GET /api/queries/{queryName}?param=value`

```typescript
const response = await fetch(`${CONFIG.API_BASE_URL}/api/queries/habitTemplateList?limit=10`);
const data = await response.json();
```

---

## 4. UI Best Practices (Zen Aesthetic)
- Use **Lucide React** for icons.
- Use **Framer Motion** for transitions.
- Maintain a clean, minimal aesthetic with consistent spacing.
