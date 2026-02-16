---
name: Build FormCMS React App
description: Guidelines and patterns for building React applications that integrate with FormCMS backend.
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

## 2. Authentication

FormCMS uses cookie-based authentication. You must include `credentials: 'include'` in all fetch requests.

### Auth Context Pattern
Create a `contexts/AuthContext.tsx` to handle user state.

KEY POINTS:
- **Check Session**: GET `/api/me`.
- **Login**: POST `/api/login` with `{ usernameOrEmail, password }`.
- **Guest Access**: POST `/api/login` with guest credentials if supported.
- **Register**: POST `/api/register`.

Example `fetch` for login:
```typescript
const res = await fetch(`${CONFIG.API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // CRITICAL for cookies
    body: JSON.stringify({ usernameOrEmail, password }),
})
```

## 3. Data Fetching

Interacting with FormCMS data involves two main API types: **Entity APIs** and **Named Queries**.

### Entity API
Used for standard CRUD operations on entities.
Endpoint pattern: `/api/entities/{entityName}/{action}`

**Actions**: `insert`, `update`, `delete`, `list`, `get`.

Example (Insert Goal):
```typescript
await fetch(`${CONFIG.API_BASE_URL}/api/entities/goal/insert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
        targetValue: 5,
        title: "New Goal"
    }),
});
```

### Named Queries
Used for fetching specific data sets defined in FormCMS.
Endpoint pattern: `/api/queries/{queryName}`

Example (Fetch Suggestions):
```typescript
const response = await fetch(`${CONFIG.API_BASE_URL}/api/queries/habitTemplateList?limit=10`);
const data = await response.json();
```

## 4. UI Best Practices (Zen Aesthetic)
- Use **Lucide React** for icons.
- Use **Framer Motion** for transitions.
- Maintain a clean, minimal aesthetic with consistent spacing.
