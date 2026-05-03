## Schema Introspection (Dev-time)

After creating entities (via `define_entity` or the admin UI), call `list_schemas` and `get_schema` to inspect the data model. Use this information to write your TypeScript types and understand relationship structures.

> **Do not fetch schemas at runtime.** Call these tools now, understand the structure, then hardcode the types into your app.

### Usage

```
# Discover all entity schemas
list_schemas

# Get full detail for a single entity
get_schema  { "name": "post" }
```

### Schema shape

Each schema object returned by these tools has this structure:

```typescript
interface SchemaResponse {
  name: string;              // entity name (e.g. "post")
  displayName: string;       // human-readable label (e.g. "Post")
  primaryKey: string;        // usually "id"
  labelAttributeName: string; // field used as the display label (e.g. "title")
  defaultPageSize: number;
  previewUrl: string;
  attributes: Attribute[];
}

interface Attribute {
  field: string;          // camelCase field name
  header: string;         // human-readable label
  displayType: string;    // "text" | "textarea" | "editor" | "number" | "image" | "dropdown" | "lookup" | ...
  inList: boolean;        // shown in list views
  inDetail: boolean;      // shown in detail views
  isDefault: boolean;     // system-managed field (id, createdAt, etc.)
  options: string;        // comma-separated options for dropdown/multiselect; target entity name for lookup
  validation: string;     // regex pattern

  // Relationship descriptors — null when the attribute is not a relationship
  junction: SchemaResponse | null;   // non-null for many-to-many fields
  lookup: SchemaResponse | null;     // non-null for many-to-one fields — embeds the related entity's full schema
  collection: SchemaResponse | null; // non-null for one-to-many fields
}
```

### Identifying relationships

Check which relationship descriptor is non-null on each attribute:

| `displayType` | Non-null field | Relationship type | What it contains |
|---------------|---------------|-------------------|-----------------|
| `"lookup"` | `lookup` | Many-to-One | Full schema of the related entity |
| (varies) | `junction` | Many-to-Many | Full schema of the junction target entity |
| (varies) | `collection` | One-to-Many | Full schema of the child entity |

> Use this information to decide which relationship API endpoints to use when building the app.
