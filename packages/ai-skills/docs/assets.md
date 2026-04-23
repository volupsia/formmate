## Assets API

FormCMS provides a file/asset management system. Assets are uploaded via `multipart/form-data`.

### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|\n| `POST` | `/api/assets` | Upload new file(s) — `multipart/form-data`, field name `files` |
| `GET`  | `/api/assets` | List all assets |
| `GET`  | `/api/assets/:id` | Get single asset by ID |
| `POST` | `/api/assets/:id` | Replace an existing asset's file |
| `POST` | `/api/assets/delete/:id` | Delete an asset |
| `POST` | `/api/assets/meta` | Update asset metadata |
| `GET`  | `/api/assets/base` | Get the asset base URL (for resolving relative paths) |

### Upload a file

```typescript
const formData = new FormData();
formData.append('files', file); // field name MUST be "files"

const res = await axios.post('/api/assets', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
// res.data is the asset path string directly, e.g. "/files/2024/01/photo.jpg"
```

The upload response is a **plain string** — the relative path of the uploaded file.

### Using asset paths in entity fields (image / file fields)

For entity fields of type `image` or `file`, you store the asset's **`path`** in the entity payload.
After the entity is saved, the backend automatically creates a link between the record and the asset.

**Full flow:**

```typescript
// Step 1 — Upload the asset, get back its path
const formData = new FormData();
formData.append('files', selectedFile);
const uploadRes = await axios.post('/api/assets', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
const assetPath = uploadRes.data; // string, e.g. "/files/2024/01/photo.jpg"

// Step 2 — Include the path in the entity insert/update payload
await axios.post('/api/entities/post/insert', {
  title: 'My Post',
  featured_image: assetPath, // ← store the path, not the full URL
});
// The backend links the post record with the uploaded asset automatically.
```

**Or, if the user selects an existing asset** (e.g. from an asset picker), use its `path` in the same way:

```typescript
// selectedAsset comes from GET /api/assets or an asset picker UI
await axios.post('/api/entities/post/update', {
  id: postId,
  featured_image: selectedAsset.path,
});
```

> **Key rule:** Always store the asset **`path`** (not `url`) in entity fields. The backend uses the path to establish the asset–record link, enabling reference tracking and cleanup.

### Displaying an asset

Asset paths may be relative. Use `/api/assets/base` to resolve them for display:

```typescript
const baseRes = await axios.get('/api/assets/base');
const assetBaseUrl = baseRes.data; // e.g. "http://localhost:5000"

function getFullAssetUrl(path: string) {
  if (!path) return path;
  return path.startsWith('http') ? path : `${assetBaseUrl}${path}`;
}

// Display
<img src={getFullAssetUrl(post.featured_image)} alt="Featured" />
```
