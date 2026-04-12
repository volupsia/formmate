
# FormCMS + MCP + Antigravity Integration Summary

## Goal

Enable Antigravity to create FormCMS schemas via an MCP server using structured JSON contracts.

---

## Architecture

```

Antigravity (AI client)
↓
MCP Server (Node.js / Docker)
↓
FormCMS API (ASP.NET Core)
↓
Database

```

---

## MCP Server

### Responsibilities
- Expose tools (e.g. `create_entity_schema`)
- Validate input (Zod)
- Forward request to FormCMS API
- Return structured response

---

## Tool: create_entity_schema

### Input
- Uses strict schema (Zod based on JSON Schema)
- Includes:
  - Entity metadata
  - Attributes array
  - Validation rules

### Key Rules
- `field` → camelCase
- `labelAttributeName` must exist in attributes
- `dropdown` / `multiselect` require `options`

---

## Antigravity Behavior

### How it works
1. Discovers MCP tools
2. Reads tool schema + description
3. Generates JSON arguments
4. Calls MCP tool

---

## Important Insight

Antigravity does NOT inherently understand your contract.

It relies on:
```

Tool Schema (Zod) + Tool Description + Prompt Context

```

---

## Where to Put Instructions

### 1. MCP Tool Description (MOST IMPORTANT)

Used to guide AI behavior when generating arguments.

Example:
- Always generate valid FormCMS schema JSON
- Prefer common CMS patterns
- Blog → title, content, status

---

### 2. System Prompt (Optional)

Global guidance in Antigravity settings.

---

### 3. User Prompt (Weakest)

Example:
```

Create a blog entity

```

---

## Authentication Strategy

### Recommended: MCP API Tokens

Avoid cookie-based auth.

Flow:
```

User → Generate token → Paste into Antigravity → Use Bearer token

```

### Why
- No cookie handling
- No login flow needed
- Works with Docker / remote
- Better security control

---

## Antigravity Token Handling

- Can store headers (Bearer token)
- Cannot:
  - Handle login pages
  - Manage cookies
  - Refresh tokens automatically

---

## Backend (FormCMS)

### Endpoint
```

POST /api/schema

```

### Responsibilities
- Validate schema
- Enforce rules
- Persist schema
- Reject invalid AI input

---

## MCP Server Implementation

### Core Logic

```

Receive request → Validate → Forward → Return result

```

### Pass auth

```

Authorization: Bearer <token>

````

---

## Reliability Improvements

### 1. Tool Description
- Add rules + examples

### 2. Normalize Input
- Fill missing fields
- Ensure defaults

### 3. Backend Validation
- Never trust AI

---

## Example AI Output (Blog)

```json
{
  "name": "blog",
  "displayName": "Blog",
  "tableName": "blogs",
  "labelAttributeName": "title",
  "attributes": [
    { "field": "title", "displayType": "text" },
    { "field": "content", "displayType": "editor" },
    { "field": "status", "displayType": "dropdown", "options": "draft,published" }
  ]
}
````

---

## Key Takeaways

* MCP is the bridge between AI and your CMS
* Schema-driven design fits perfectly with MCP
* Tool description is critical for good AI output
* Always validate on backend
* Use token-based auth (not cookies)

---

## Future Enhancements

* update_schema / delete_schema tools
* schema diff + migration engine
* auto-generate DB tables
* AI → full CMS builder
