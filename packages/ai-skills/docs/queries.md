## Named Queries

Used for fetching specific data sets defined in FormCMS.

Endpoint: `GET /api/queries/{queryName}?param=value`

```typescript
const res = await axios.get('/api/queries/habitTemplateList', {
  params: { limit: 10 },
});
const data = res.data;
```
