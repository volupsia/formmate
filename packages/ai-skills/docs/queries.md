## Named Queries (Runtime)

Named queries are **created at dev-time** using MCP tools (`get_graphql_sdl` → `save_query`). At runtime, fetch query results via REST. Do not create queries from app code.

Endpoint: `GET /api/queries/{queryName}?param=value`

```typescript
const res = await axios.get('/api/queries/habitTemplateList', {
  params: { limit: 10 },
});
const data = res.data;
```
