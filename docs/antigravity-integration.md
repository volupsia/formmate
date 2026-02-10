# Antigravity + FormCMS Integration Workflow

This document outlines how developers can use Antigravity (AI code agent) with FormCMS to build full-stack applications, and proposes enhancements for seamless integration.

## Current Workflow (Manual)

### How It Works Today

**Step 1: Generate Backend in FormMate UI**
```
1. Developer opens FormMate UI (http://localhost:5000/mate)
2. Uses AI to generate schema: "Create a blog with posts and authors"
3. FormMate generates entities, relationships, queries
4. Developer gets API endpoints: /api/posts, /api/authors
```

**Step 2: Build Frontend with Antigravity**
```
1. Developer opens Antigravity
2. Tells Antigravity: "Build a React blog that calls these APIs:
   - GET /api/posts
   - POST /api/posts
   - GET /api/authors"
3. Antigravity generates React components
4. Developer has working full-stack app
```

### Pros & Cons

**Pros:**
- ✅ Works today with no changes
- ✅ Developer has full control over each step
- ✅ Can review backend schema before generating frontend
- ✅ Separation of concerns

**Cons:**
- ❌ Manual copy-paste of API endpoints
- ❌ Context switching between UIs
- ❌ Slower iteration cycle
- ❌ Antigravity doesn't know backend schema details

---

## Proposed Workflow (Integrated)

### Vision: One Conversation, Full-Stack App

**User tells Antigravity:**
```
"Build me a blog app with posts, authors, and categories.
Users should be able to create posts, view posts, and filter by category."
```

**Antigravity orchestrates everything:**
```typescript
// 1. Generate backend schema via FormCMS API
const schema = await formcms.generateSchema({
  prompt: "Blog with posts, authors, categories"
});

// 2. Generate queries via FormCMS API
const queries = await formcms.generateQueries({
  schemaId: schema.id,
  operations: ["create", "read", "update", "delete", "filter"]
});

// 3. Generate React frontend (Antigravity's expertise)
const components = await antigravity.generateComponents({
  apiEndpoint: formcms.getEndpoint(schema.id),
  schema: schema,
  queries: queries
});

// 4. Deploy everything
await deploy({ backend: schema, frontend: components });
```

**Result:** Working full-stack app in one conversation

### Benefits

- ✅ No context switching
- ✅ Faster iteration (minutes vs hours)
- ✅ Antigravity has full backend context
- ✅ Consistent API usage across frontend
- ✅ Better error handling (Antigravity knows schema constraints)

---

## Implementation Options

### Option 1: FormCMS REST API (Recommended)

**Add these endpoints to FormCMS:**

#### Generate Schema
```http
POST /api/ai/schema/generate
Content-Type: application/json

{
  "prompt": "Blog with posts, authors, and categories",
  "geminiApiKey": "optional-override"
}

Response:
{
  "success": true,
  "data": {
    "schemaId": "post-123",
    "name": "Post",
    "fields": [
      { "name": "title", "type": "string", "required": true },
      { "name": "content", "type": "text", "required": true },
      { "name": "authorId", "type": "reference", "ref": "Author" }
    ],
    "endpoints": {
      "list": "/api/posts",
      "get": "/api/posts/:id",
      "create": "/api/posts",
      "update": "/api/posts/:id",
      "delete": "/api/posts/:id"
    }
  }
}
```

#### Generate Query
```http
POST /api/ai/query/generate
Content-Type: application/json

{
  "schemaId": "post-123",
  "prompt": "Get all posts with author, sorted by date descending"
}

Response:
{
  "success": true,
  "data": {
    "queryId": "recent-posts",
    "endpoint": "/api/queries/recent-posts",
    "graphql": "query { posts(orderBy: createdAt_DESC) { id title author { name } } }"
  }
}
```

#### Get Schema Details
```http
GET /api/schemas/:schemaId

Response:
{
  "success": true,
  "data": {
    "id": "post-123",
    "name": "Post",
    "fields": [...],
    "relationships": [...],
    "endpoints": {...}
  }
}
```

**Antigravity Integration:**
```typescript
// Antigravity can call these APIs directly
const response = await fetch('http://localhost:5000/api/ai/schema/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: userRequest
  })
});

const { schemaId, endpoints } = await response.json();

// Now generate React code using these endpoints
```

---

### Option 2: FormCMS TypeScript SDK

**Create an npm package:**

```bash
npm install @formcms/sdk
```

**SDK Usage:**
```typescript
import { FormCMS } from '@formcms/sdk';

const cms = new FormCMS({
  baseUrl: 'http://localhost:5000',
  apiKey: process.env.FORMCMS_API_KEY
});

// Generate schema
const schema = await cms.ai.generateSchema({
  prompt: "Blog with posts and authors"
});

// Generate query
const query = await cms.ai.generateQuery({
  schemaId: schema.id,
  prompt: "Get recent posts with authors"
});

// Get endpoints
const endpoints = cms.getEndpoints(schema.id);
// { list: '/api/posts', create: '/api/posts', ... }
```

**Antigravity Integration:**
```typescript
// Antigravity uses the SDK
import { FormCMS } from '@formcms/sdk';

async function buildFullStackApp(userPrompt: string) {
  const cms = new FormCMS({ 
    baseUrl: process.env.FORMCMS_URL 
  });
  
  // Generate backend
  const schema = await cms.ai.generateSchema({ prompt: userPrompt });
  
  // Generate React frontend
  const components = await generateReactComponents({
    apiEndpoint: cms.getEndpoints(schema.id),
    schema: schema.toTypeScript() // Get TypeScript types
  });
  
  return { backend: schema, frontend: components };
}
```

---

### Option 3: MCP Server (Model Context Protocol)

**FormCMS exposes an MCP server:**

```typescript
// FormCMS MCP Server
const formcmsMCP = {
  name: "formcms",
  version: "1.0.0",
  
  tools: [
    {
      name: "generate_schema",
      description: "Generate a database schema from natural language",
      inputSchema: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Natural language description" }
        }
      }
    },
    {
      name: "generate_query",
      description: "Generate a query for a schema",
      inputSchema: {
        type: "object",
        properties: {
          schemaId: { type: "string" },
          prompt: { type: "string" }
        }
      }
    },
    {
      name: "get_endpoints",
      description: "Get REST API endpoints for a schema",
      inputSchema: {
        type: "object",
        properties: {
          schemaId: { type: "string" }
        }
      }
    }
  ]
};
```

**Antigravity uses MCP:**
```
User: "Build a blog app with posts and authors"

Antigravity thinks: I need to create the backend first
Antigravity: [Calls formcms.generate_schema("blog with posts and authors")]
FormCMS MCP: Returns { schemaId: "blog-123", fields: [...], endpoints: {...} }

Antigravity thinks: Now I'll generate the React frontend
Antigravity: [Generates React code using the endpoints]

Antigravity: "I've created a full-stack blog app. The backend is ready at 
              http://localhost:5000/api/posts and I've generated React 
              components in src/components/Blog/"
```

---

## Recommended Implementation Path

### Phase 1: REST API Endpoints (Week 1-2)

**Add to FormCMS:**
1. `POST /api/ai/schema/generate` - Generate schema from prompt
2. `POST /api/ai/query/generate` - Generate query from prompt
3. `GET /api/schemas/:id` - Get schema details

**Benefits:**
- Simple to implement
- Works with any HTTP client
- No new dependencies
- Antigravity can use it immediately

### Phase 2: TypeScript SDK (Week 3-4)

**Create `@formcms/sdk`:**
1. Wrapper around REST API
2. TypeScript types for schemas
3. Helper methods for common operations
4. Better developer experience

**Benefits:**
- Type safety
- Better autocomplete
- Easier to use than raw HTTP
- Can be used in any Node.js/TypeScript project

### Phase 3: MCP Server (Month 2)

**Implement MCP protocol:**
1. MCP server in FormCMS
2. Tool definitions for AI agents
3. Documentation for AI integration

**Benefits:**
- Standard protocol for AI agents
- Works with any MCP-compatible agent
- Future-proof
- Better AI understanding of capabilities

---

## Example: Full Workflow

### User Request
```
"Build a recipe sharing app where users can post recipes, 
rate them, and search by ingredients"
```

### Antigravity Execution

**1. Generate Backend (via FormCMS API)**
```typescript
// Antigravity calls FormCMS
const schemas = await Promise.all([
  formcms.generateSchema({ prompt: "Recipe with title, instructions, ingredients" }),
  formcms.generateSchema({ prompt: "Rating with stars and comment" }),
  formcms.generateSchema({ prompt: "User with name and email" })
]);

// FormCMS returns endpoints
// /api/recipes, /api/ratings, /api/users
```

**2. Generate Queries (via FormCMS API)**
```typescript
const queries = await Promise.all([
  formcms.generateQuery({ 
    schemaId: schemas[0].id, 
    prompt: "Search recipes by ingredient name" 
  }),
  formcms.generateQuery({ 
    schemaId: schemas[0].id, 
    prompt: "Get top rated recipes" 
  })
]);

// FormCMS returns custom endpoints
// /api/queries/search-by-ingredient
// /api/queries/top-rated
```

**3. Generate React Frontend (Antigravity)**
```typescript
// Antigravity generates components
const components = [
  'src/components/RecipeCard.tsx',
  'src/components/RecipeForm.tsx',
  'src/components/SearchBar.tsx',
  'src/components/RatingStars.tsx',
  'src/pages/HomePage.tsx',
  'src/pages/RecipePage.tsx'
];

// All components use the FormCMS API endpoints
```

**4. Result**
```
✅ Backend: FormCMS with 3 entities, 2 custom queries
✅ Frontend: React app with 6 components
✅ Time: ~5 minutes (vs ~5 hours manually)
```

---

## Developer Experience Comparison

### Manual Workflow
```
Time: ~5 hours

1. Open FormMate UI (5 min)
2. Generate schema (10 min)
3. Test API endpoints (10 min)
4. Copy endpoint URLs (2 min)
5. Open code editor (1 min)
6. Tell Antigravity about APIs (5 min)
7. Review generated code (15 min)
8. Fix API integration issues (30 min)
9. Test full-stack app (20 min)
10. Deploy (30 min)

Total: ~2 hours (optimistic)
```

### Integrated Workflow
```
Time: ~5 minutes

1. Tell Antigravity: "Build a recipe app with [requirements]"
2. Antigravity generates everything
3. Review and deploy

Total: ~5 minutes
```

---

## Next Steps

### For FormCMS Team

1. **Add REST API endpoints** (Option 1)
   - Start with `/api/ai/schema/generate`
   - Add authentication
   - Document API

2. **Create TypeScript SDK** (Option 2)
   - Publish to npm as `@formcms/sdk`
   - Add examples
   - Write documentation

3. **Consider MCP Server** (Option 3)
   - Research MCP protocol
   - Implement if beneficial
   - Integrate with AI agents

### For Antigravity Users

**Today (Manual):**
```
1. Use FormMate UI to generate backend
2. Copy API endpoints
3. Tell Antigravity to build frontend using those endpoints
```

**Future (Integrated):**
```
1. Tell Antigravity to build full-stack app
2. Antigravity calls FormCMS API
3. Done
```

---

## Conclusion

**Best Approach:** Start with **Option 1 (REST API)** because:
- ✅ Simple to implement
- ✅ Works immediately with Antigravity
- ✅ No new dependencies
- ✅ Foundation for SDK and MCP later

**Impact:**
- 🚀 10x faster full-stack development
- 🎯 Better developer experience
- 🤖 True AI-powered app building
- 💡 Unique competitive advantage

The combination of FormCMS (AI backend generation) + Antigravity (AI frontend generation) = **No-code full-stack development** 🎉
