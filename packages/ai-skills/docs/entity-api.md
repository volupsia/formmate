## Entity API

Used for standard CRUD operations on entities.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET`  | `/api/entities/{entity}` | List records (supports query params: `limit`, `offset`, filters) |
| `GET`  | `/api/entities/{entity}/{id}` | Get single record |
| `POST` | `/api/entities/{entity}/insert` | Create |
| `POST` | `/api/entities/{entity}/update` | Update |
| `POST` | `/api/entities/{entity}/delete` | Delete |

### List response shape

```json
{
  "items": [
    { "id": 1, "title": "...", "published": "true", "publicationStatus": "published", "createdAt": "...", "updatedAt": "..." }
  ],
  "totalRecords": 100
}
```

> Note: `published` is a string `"true"` / `"false"`, not a boolean.

Example (List with filters):
```typescript
const res = await axios.get('/api/entities/post', {
  params: { limit: 10, offset: 0 },
});
const { items, totalRecords } = res.data;
```

Example (Insert):
```typescript
await axios.post('/api/entities/post/insert', {
  title: 'New Post',
  published: 'true',
});
```
