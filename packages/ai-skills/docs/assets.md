## Assets API

Use these endpoints for file uploads and asset management. Always use `multipart/form-data` with field name `files`.

### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/assets` | Upload new file(s) — `multipart/form-data`, field name `files` |
| `GET`  | `/api/assets` | List all assets |
| `GET`  | `/api/assets/:id` | Get single asset by ID |
| `POST` | `/api/assets/:id` | Replace an existing asset's file |
| `POST` | `/api/assets/delete/:id` | Delete an asset |
| `POST` | `/api/assets/meta` | Update asset metadata |
| `GET`  | `/api/assets/base` | Get the asset base URL (for resolving relative paths) |

### Uploading a file

```typescript
const formData = new FormData();
formData.append('files', file); // field name MUST be "files"

const res = await axios.post('/api/assets', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
// res.data is a plain string — the relative path, e.g. "/files/2024/01/photo.jpg"
// Store this string directly. Do not parse or modify it.
```

### Linking assets to entity fields

For entity fields of type `image` or `file`, store the asset's **`path`** (not the full URL) in the entity payload. The backend automatically creates a link between the record and the asset.

```typescript
// Step 1 — Upload the asset, get back its path
const formData = new FormData();
formData.append('files', selectedFile);
const uploadRes = await axios.post('/api/assets', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
const assetPath = uploadRes.data; // string, e.g. "/files/2024/01/photo.jpg"

// Step 2 — Include the path in the entity payload
await axios.post('/api/entities/post/insert', {
  title: 'My Post',
  featured_image: assetPath, // ← store the path, not the full URL
});
```

When using an existing asset (e.g. from an asset picker), use its `path` the same way:

```typescript
await axios.post('/api/entities/post/update', {
  id: postId,
  featured_image: selectedAsset.path,
});
```

> **Always store the asset `path`, never the full URL.** The backend uses the path to establish the asset–record link.

### Displaying assets

Asset paths may be relative. Resolve them using `/api/assets/base`:

```typescript
const baseRes = await axios.get('/api/assets/base');
const assetBaseUrl = baseRes.data; // e.g. "http://localhost:5000"

function getFullAssetUrl(path: string) {
  if (!path) return path;
  return path.startsWith('http') ? path : `${assetBaseUrl}${path}`;
}

// Use in JSX
<img src={getFullAssetUrl(post.featured_image)} alt="Featured" />
```
