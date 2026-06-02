# Access Control

All access control logic lives in `src/access/`. **Never inline access logic directly in a collection or field definition** — always import from a module. This keeps security rules auditable, testable, and reusable.

---

## How Payload Access Control Works

Payload evaluates access at three levels, in this order:

1. **Collection-level** — Gates the entire operation (read, create, update, delete).
2. **Field-level** — Gates read/write of specific fields within a document.
3. **Document-level** — Returns a Payload `Where` query to filter which documents a user can access, rather than a boolean.

Access functions receive an `AccessArgs` object containing `req` (with `req.user`, `req.payload`, etc.) and for collection operations: `id` and `data`. They return either:
- `true` — allow
- `false` — deny
- A `Where` query object — allow only matching documents

---

## Role System

Roles are stored on the `Users` collection as a multi-select field with three values:

| Role | Description |
|---|---|
| `admin` | Full platform access — all collections, all docs, field-level overrides |
| `creative` | Authenticated creator — can upload media, manage own portfolios and collections |
| `viewer` | Default for new registrations — read-only, minimal access |

Roles are checked via the shared utility `checkRole`:

```typescript
// src/access/utilities.ts
export const checkRole = (allRoles: User['roles'] = [], user?: User | null): boolean => {
  if (user && allRoles) {
    return allRoles.some((role) =>
      user?.roles?.some((individualRole) => individualRole === role)
    )
  }
  return false
}
```

Call it as `checkRole(['admin'], user)` or `checkRole(['admin', 'creative'], user)`.

---

## Access Modules

### `adminOnly`

```typescript
// src/access/adminOnly.ts
export const adminOnly: Access = ({ req: { user } }) => {
  if (user) return checkRole(['admin'], user)
  return false
}
```

**Use when:** The operation is for platform administrators only. Applied to: `AdminActivityLogs`, `AdminDiagnosticSessions`, `Pages`, `Articles`, `Downloads`, `Tutorials`, `Users.delete`, `PortfolioDownloadLogs.read`.

---

### `adminOnlyFieldAccess`

```typescript
// src/access/adminOnlyFieldAccess.ts
export const adminOnlyFieldAccess: FieldAccess = ({ req: { user } }) => {
  if (user) return checkRole(['admin'], user)
  return false
}
```

**Use when:** A field within a document should only be readable or writable by admins, regardless of collection-level access. Type is `FieldAccess` not `Access`.

**Example usage — `Users.roles` field:**
```typescript
{
  name: 'roles',
  type: 'select',
  access: {
    create: adminOnlyFieldAccess,
    read: adminOnlyFieldAccess,
    update: adminOnlyFieldAccess,
  },
  // ...
}
```

**Example usage — `sectionAnchorOverride` in Portfolios:**
```typescript
{
  name: 'sectionAnchorOverride',
  type: 'text',
  access: {
    read: adminOnlyFieldAccess,
    update: adminOnlyFieldAccess,
    create: adminOnlyFieldAccess,
  },
}
```

---

### `creativeOrAdmin`

```typescript
// src/access/creativeOrAdmin.ts
export const creativeOrAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  return true  // Any authenticated user can create their own content
}
```

**Use when:** The operation requires authentication but is open to all logged-in users (creatives and admins). Applied to: `Media.create`, `Sessions.create`, `SmartCollections.create`, `UploadBatches.create`.

**Note:** The implementation currently returns `true` for any authenticated user. In a future revision this may check for `creative` or `admin` roles explicitly.

---

### `ownerOrAdmin`

```typescript
// src/access/ownerOrAdmin.ts
export const ownerOrAdmin: Access = ({ req: { user } }) => {
  if (!user) return false

  if (checkRole(['admin'], user)) {
    return true  // Admin sees all docs
  }

  return {
    owner: {
      equals: user.id,  // User sees only their own docs
    },
  }
}
```

**Use when:** A user should only be able to read/update/delete documents they created. Returns a `Where` clause so Payload filters at the DB level — not a post-fetch permission check.

Applied to: `Media.update/delete`, `Sessions.read/update/delete`, `SmartCollections.read/update/delete`, `UploadBatches.read/update/delete`, `Portfolios.update/delete`.

**Assumption:** The collection must have an `owner` field (relationship → Users) populated on create.

---

### `adminOrSelf`

```typescript
// src/access/adminOrSelf.ts
export const adminOrSelf: Access = ({ req: { user } }) => {
  if (user) {
    if (checkRole(['admin'], user)) return true
    return { id: { equals: user.id } }
  }
  return false
}
```

**Use when:** A user should be able to access only their own user document (e.g. reading or updating their profile). Applied to: `Users.read/update`.

The `Where` filter matches on `id` rather than an `owner` field.

---

### `publicAccess`

```typescript
// src/access/publicAccess.ts
export const publicAccess: Access = () => true
```

**Use when:** The operation is unconditionally allowed — no auth required. Applied to: `Users.create` (open registration), `Categories.read`.

---

### `adminOrPublishedStatus`

```typescript
// src/access/adminOrPublishedStatus.ts
export const adminOrPublishedStatus: Access = ({ req: { user } }) => {
  if (user && checkRole(['admin'], user)) return true
  return { _status: { equals: 'published' } }
}
```

**Use when:** A collection uses Payload's draft/publish workflow and anonymous users should see only published docs. Applied to: `Pages.read`, `Articles.read`, `Downloads.read`, `Tutorials.read`.

---

### `creativeOnly`

```typescript
// src/access/creativeOnly.ts
```

Exists as a module but is less commonly used directly — check the file for its exact implementation before using.

---

## Document-Level Access (Where Queries)

When an access function returns a `Where` object, Payload appends it as a filter to the DB query. This is the correct pattern for multi-tenant ownership — do **not** fetch all docs and filter in memory.

**Pattern — PortfolioClientReviews:**
```typescript
read: ({ req: { user } }) => {
  if (!user) return false
  if (checkRole(['admin'], user)) return true
  // Creatives see only reviews on portfolios they own
  return {
    'portfolio.owner': { equals: user.id },
  }
},
```

**Pattern — Portfolios (complex public + owner query):**
```typescript
read: ({ req: { user } }) => {
  if (user?.roles?.includes('admin')) return true

  const publishedPublicQuery: Where = {
    and: [
      { visibility: { in: ['public', 'shared'] } },
      { _status: { equals: 'published' } },
    ],
  }

  if (!user) return publishedPublicQuery

  return {
    or: [
      publishedPublicQuery,
      { owner: { equals: user.id } },
    ],
  }
},
```

---

## Adding New Access Rules

1. Create `src/access/myNewRule.ts` — export a typed `Access` or `FieldAccess` function.
2. Import it into the collection(s) that need it.
3. **Never** write inline arrow functions in the collection config for access. Even a one-liner should live in a named module.

**Template for a new collection-level rule:**
```typescript
// src/access/myNewRule.ts
import type { Access } from 'payload'
import { checkRole } from '@/access/utilities'

export const myNewRule: Access = ({ req: { user } }) => {
  if (!user) return false
  if (checkRole(['admin'], user)) return true
  // Return boolean or Where query
  return { owner: { equals: user.id } }
}
```

**Template for a new field-level rule:**
```typescript
// src/access/myFieldRule.ts
import type { FieldAccess } from 'payload'
import { checkRole } from '@/access/utilities'

export const myFieldRule: FieldAccess = ({ req: { user } }) => {
  if (user) return checkRole(['admin'], user)
  return false
}
```

---

## Common Patterns Quick Reference

| Scenario | Module |
|---|---|
| Admin-only collection | `adminOnly` |
| Admin-only field | `adminOnlyFieldAccess` |
| Any logged-in user can create | `creativeOrAdmin` |
| User owns the doc | `ownerOrAdmin` |
| User is the doc (user record) | `adminOrSelf` |
| Public read, published only | `adminOrPublishedStatus` |
| Fully public | `publicAccess` |
| Custom multi-tenant filter | Inline `Where` in collection config, extracted to a named module |

---

## Hooks That Enforce Role Integrity

Field-level access prevents API writes, but two hooks also enforce roles at the model level:

- **`ensureFirstUserIsAdmin`** (`Users.roles.beforeChange`): Promotes the first user ever created to `admin`. Runs before field access is checked — ensures the platform always has at least one admin even if the field was locked.

- **`protectRoles`** (`Users.roles.beforeChange`): Prevents a non-admin from changing their own roles. Even if field access is bypassed (e.g. Payload internal `overrideAccess`), the hook provides a defence-in-depth layer.

---

## overrideAccess

Payload's `payload.create/update/delete` methods accept an `overrideAccess: true` flag that bypasses collection and field access entirely. This is used for server-side operations where the calling code is trusted (e.g. `AdminActivityLogs.create` from a hook). Use sparingly, and always document why access is being overridden at the call site.
