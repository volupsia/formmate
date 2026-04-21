import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const AUTH_API_REFERENCE = `
# FormCMS Authentication API Reference

FormCMS uses **cookie-based session authentication**. Every fetch call MUST include
\`credentials: 'include'\` so the browser sends/receives the session cookie.

---

## Endpoints

### Check current session
\`\`\`
GET /api/me
\`\`\`
Returns the currently authenticated user, or 401 if not logged in.

Response shape:
\`\`\`json
{
  "id": "string | number",
  "name": "string",
  "email": "string",
  "avatarUrl": "string | null",
  "roles": ["admin", "..."],
  "allowedMenus": ["..."]
}
\`\`\`

---

### Login
\`\`\`
POST /api/login
Content-Type: application/json
\`\`\`
Request body:
\`\`\`json
{ "usernameOrEmail": "alice@example.com", "password": "secret" }
\`\`\`
- Returns the user object on success.
- Sets an HttpOnly session cookie automatically.

---

### Register
\`\`\`
POST /api/register
Content-Type: application/json
\`\`\`
Request body:
\`\`\`json
{ "email": "alice@example.com", "password": "secret", "userName": "alice" }
\`\`\`
- Returns the created user object.
- The user is logged in immediately after registration (session cookie is set).

---

### Logout
\`\`\`
GET /api/logout
\`\`\`
Clears the session cookie. No request body needed.

---

### Change password
\`\`\`
POST /api/profile/password
Content-Type: application/json
\`\`\`
Request body:
\`\`\`json
{ "oldPassword": "current", "password": "newPassword" }
\`\`\`

---

### Upload avatar
\`\`\`
POST /api/profile/avatar
Content-Type: multipart/form-data
\`\`\`
Send a \`FormData\` object with a single field named \`file\`.

---

## React Implementation Pattern

### 1. Config (\`src/config.ts\`)
\`\`\`typescript
export const CONFIG = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || ''
};
\`\`\`

### 2. AuthContext (\`src/contexts/AuthContext.tsx\`)
\`\`\`tsx
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

  // Check existing session on mount
  useEffect(() => {
    fetch(\`\${CONFIG.API_BASE_URL}/api/me\`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data ? { id: data.id, username: data.name ?? data.email, email: data.email, avatarUrl: data.avatarUrl, roles: data.roles } : null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (usernameOrEmail: string, password: string) => {
    const res = await fetch(\`\${CONFIG.API_BASE_URL}/api/login\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',           // CRITICAL — must include for cookies
      body: JSON.stringify({ usernameOrEmail, password }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    setUser({ id: data.id, username: data.name ?? data.email, email: data.email, avatarUrl: data.avatarUrl, roles: data.roles });
  };

  const register = async (email: string, password: string, userName: string) => {
    const res = await fetch(\`\${CONFIG.API_BASE_URL}/api/register\`, {
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
    await fetch(\`\${CONFIG.API_BASE_URL}/api/logout\`, { credentials: 'include' });
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
\`\`\`

### 3. Wrap your app (\`src/main.tsx\`)
\`\`\`tsx
import { AuthProvider } from './contexts/AuthContext';
// ...
root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
\`\`\`

### 4. Use in a component
\`\`\`tsx
const { user, login, logout, loading } = useAuth();
if (loading) return <Spinner />;
if (!user) return <LoginForm onSubmit={login} />;
return <Dashboard user={user} onLogout={logout} />;
\`\`\`

---

## Key Rules
- ALWAYS pass \`credentials: 'include'\` on every fetch/axios call — without it, cookies are never sent.
- After login or register, the session cookie is set automatically; no token storage needed.
- Use \`GET /api/me\` on app startup to restore an existing session.
- \`roles\` on the User object controls what the user can see/do (e.g. \`"admin"\`).
`;

export function registerAuthPrompts(server: McpServer): void {
    server.prompt(
        'formcms-auth-api',
        'FormCMS authentication API reference with React implementation patterns. ' +
        'Use this when building login, register, logout, or session-management features.',
        () => ({
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: AUTH_API_REFERENCE,
                    },
                },
            ],
        })
    );
}
