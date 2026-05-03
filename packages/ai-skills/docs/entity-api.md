## Entity API (Runtime)

Use these endpoints for all CRUD operations in the React app.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET`  | `/api/entities/{entity}` | List records (supports `limit`, `offset`, filters) |
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

> **Warning:** `published` is a string `"true"` / `"false"`, not a boolean. Always send it as a string.

### Examples

```typescript
// List with pagination
const res = await axios.get('/api/entities/post', {
  params: { limit: 10, offset: 0 },
});
const { items, totalRecords } = res.data;

// Insert — note published is a string
await axios.post('/api/entities/post/insert', {
  title: 'New Post',
  published: 'true',
});
```

---

## Relationships

There are three relationship types. Relationships are defined on the schema (via `define_entity` at dev-time) and managed through dedicated REST endpoints at runtime. Do not duplicate relationship fields as regular attributes.

| Cardinality | SDK term | Example | How data is linked |
|-------------|----------|---------|-------------------|
| **Many-to-Many** | Junction | Post ↔ Tag | A junction table links IDs from both sides |
| **Many-to-One** | Lookup | Post → Category | The parent record stores a reference to the related record |
| **One-to-Many** | Collection | Post → Comment | Child records are owned by the parent |

> **Do not** include relationship fields as regular attributes in the entity payload. They are managed entirely through the relationship endpoints below.

---

### Junction (Many-to-Many)

Use junction endpoints when both entities can have multiple related records on each side (e.g. Post ↔ Tag).

#### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET`  | `/api/entities/junction/target_ids/{entity}/{id}/{field}` | Get IDs of related records |
| `GET`  | `/api/entities/junction/{entity}/{id}/{field}?exclude={bool}&{qs}` | List related (or unrelated) records |
| `POST` | `/api/entities/junction/{entity}/{id}/{field}/save` | Attach items |
| `POST` | `/api/entities/junction/{entity}/{id}/{field}/delete` | Detach items |

- `{entity}` — source entity name (e.g. `post`)
- `{id}` — source record's ID
- `{field}` — relationship field name from the schema (e.g. `tags`)

#### Examples

```typescript
// Get IDs of all tags linked to post #42
const idsRes = await axios.get('/api/entities/junction/target_ids/post/42/tags');
const tagIds: number[] = idsRes.data; // [1, 3, 7]

// List full tag records linked to post #42
const linkedRes = await axios.get('/api/entities/junction/post/42/tags', {
  params: { exclude: false, limit: 50, offset: 0 },
});
const { items, totalRecords } = linkedRes.data;

// List tags NOT yet linked (for a "pick tags" UI)
const availableRes = await axios.get('/api/entities/junction/post/42/tags', {
  params: { exclude: true, limit: 50, offset: 0 },
});

// Attach tags — send an array of objects with at least { id }
await axios.post('/api/entities/junction/post/42/tags/save', [
  { id: 2 },
  { id: 5 },
]);

// Detach tags
await axios.post('/api/entities/junction/post/42/tags/delete', [
  { id: 7 },
]);
```

---

### Lookup (Many-to-One)

Use lookup endpoints when a record references exactly one related record (e.g. Post → Category). The lookup endpoint provides a search/autocomplete API.

#### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET`  | `/api/entities/lookup/{entity}?query={search}` | Search for matching records to select as the lookup value |

#### Response shape

```typescript
interface LookupListResponse {
  hasMore: boolean;
  items: Record<string, any>[];
}
```

#### Examples

```typescript
// Search for categories matching "tech"
const res = await axios.get('/api/entities/lookup/category', {
  params: { query: 'tech' },
});
const { items, hasMore } = res.data;
// items = [{ id: 3, title: "Technology" }, { id: 8, title: "Tech News" }]

// Set the lookup — include the lookup field in the insert/update payload
// The field name is the relationship field name, the value is the target record's ID
await axios.post('/api/entities/post/insert', {
  title: 'My Tech Post',
  category: 3,  // ← lookup stores the target record's ID
});

// Or update an existing post's category
await axios.post('/api/entities/post/update', {
  id: 42,
  category: 3,
});
```

> The lookup value is stored directly on the parent record. Use the search endpoint to build autocomplete/picker UIs.

---

### Collection (One-to-Many)

Use collection endpoints when a parent entity owns multiple child records (e.g. Post → Comment). Always create child records under the parent — do not manually set a foreign key.

#### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET`  | `/api/entities/collection/{entity}/{id}/{field}?{qs}` | List child records |
| `POST` | `/api/entities/collection/{entity}/{id}/{field}/insert` | Create a child record under the parent |

#### Examples

```typescript
// List all comments for post #42
const res = await axios.get('/api/entities/collection/post/42/comments', {
  params: { limit: 20, offset: 0 },
});
const items = res.data;

// Add a new comment to post #42
await axios.post('/api/entities/collection/post/42/comments/insert', {
  body: 'Great post!',
  authorName: 'Jane',
});
```

> Do not manually set foreign keys for collection children. The API handles it automatically.

---

### Workflow: Creating an Entity with Relationships

When you need to create an entity with related data, follow this exact order:

1. **Insert the main entity** via `POST /api/entities/{entity}/insert` — this returns the new record (including its `id`).
2. **Set lookups** — include lookup field values in the insert payload (step 1), or update later via `/update`.
3. **Attach junction items** — call `POST /api/entities/junction/{entity}/{id}/{field}/save` with an array of related IDs.
4. **Add collection items** — call `POST /api/entities/collection/{entity}/{id}/{field}/insert` for each child.

```typescript
// Full example: create a post with a category (lookup), tags (junction), and a comment (collection)

// Step 1 — Create post with lookup
const postRes = await axios.post('/api/entities/post/insert', {
  title: 'Hello World',
  body: '<p>My first post</p>',
  category: 3,        // lookup — category ID
  published: 'true',
});
const newPost = postRes.data;  // { id: 99, ... }

// Step 2 — Attach tags (junction)
await axios.post('/api/entities/junction/post/99/tags/save', [
  { id: 1 },
  { id: 4 },
]);

// Step 3 — Add a comment (collection)
await axios.post('/api/entities/collection/post/99/comments/insert', {
  body: 'Welcome to my blog!',
  authorName: 'Admin',
});
```
