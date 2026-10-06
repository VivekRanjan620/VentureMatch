# VentureMatch API Specification

Single source of truth for the VentureMatch REST API contract.

## Base URL
`http://localhost:4000/api/v1`

---

## Global Response & Error Format

All error responses strictly adhere to the following JSON shape:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "details": {} // Optional field containing validation errors or contextual info
  }
}
```

### Common Error Codes
- `INVALID_INPUT`: Request body or parameters failed Zod validation or invalid cursor format.
- `UNAUTHORIZED`: Missing, invalid, or expired JWT access token.
- `FORBIDDEN`: User does not have permission (e.g. incomplete profile, modifying another user's requirement, reopening closed requirement, or unverified access to VERIFIED_ONLY requirement).
- `NOT_FOUND`: The requested resource was not found (or requirement is PAUSED/CLOSED for non-owners, or blocked).
- `CONFLICT`: Resource already exists.
- `RATE_LIMIT_EXCEEDED`: Too many requests submitted in a given window.
- `INTERNAL_SERVER_ERROR`: Unexpected server error.

---

## Canonical Enums & Allowed Values

### 1. Skills (`config/skills.ts`)
`TECH` | `MARKETING` | `SALES` | `FINANCE` | `OPERATIONS` | `PRODUCT` | `DESIGN` | `OTHER`

### 2. Startup Stages (`config/stages.ts`)
`IDEA` | `MVP` | `EARLY_TRACTION` | `GROWTH`

### 3. Commitment Options
`FULL` | `PART` | `WEEKEND`

### 4. Visibility Options
`PUBLIC` | `VERIFIED_ONLY`

### 5. Requirement Statuses
`ACTIVE` | `PAUSED` | `CLOSED`

---

## Profile & Commitment Completeness Definitions

Calculated dynamically on `GET /me`:

1. **`profileComplete`** (`boolean`):
   - Returns `true` if profile exists AND `name`, `city`, `industry`, `experienceYears` are non-null/non-empty AND `skills` is a non-empty array containing at least 1 valid skill from the allowed skills list.
   - Otherwise returns `false`.

2. **`commitmentComplete`** (`boolean`):
   - Returns `true` if commitmentProfile exists AND `hoursPerWeek` (1-80), `availability` (`FULL` | `PART` | `WEEKEND`), `minMonths` (1-60), `compensationPref` (`EQUITY` | `SALARY` | `REV_SHARE`), and `equityExpectation` (0-100) are non-null.
   - Otherwise returns `false`.

---

## Verification Status Specification

Verification records indicate account linking or self-declared contact methods. They are **never** labeled as `"verified"`:

- **EMAIL**: `{ type: "EMAIL", status: "unverified", method: "self-declared", verifiedAt: null }`
- **LINKEDIN**: `{ type: "LINKEDIN", status: "linked", method: "linked-only", verifiedAt: null, linkedAt: "ISO-String" }`

---

## Requirements API

### 1. Create Requirement (`POST /requirements`)
- **POST** `/requirements`
- **Auth Required**: Yes (`Bearer <accessToken>`)
- **Pre-requisite**: Requires `profileComplete === true`. Returns `403 FORBIDDEN` if profile is incomplete.
- **Strict Zod Payload**: `.strict()`

#### Request Body
```json
{
  "title": "CTO & Technical Co-Founder for AI Engine",
  "needSkill": "TECH",
  "startupName": "AgenticFlow",
  "startupNamePublic": true, // Default: false
  "industry": "Artificial Intelligence",
  "stage": "MVP", // "IDEA" | "MVP" | "EARLY_TRACTION" | "GROWTH"
  "currentUsers": 150,
  "ownerContributes": "Product Strategy, 100k angel funding raised",
  "offer": "40-50% Equity",
  "commitment": "FULL", // "FULL" | "PART" | "WEEKEND"
  "location": "San Francisco, CA",
  "remote": true, // Default: true
  "visibility": "PUBLIC" // "PUBLIC" | "VERIFIED_ONLY"
}
```

#### Success Response (`201 Created`)
Returns requirement DTO. Note: `startupName` is returned ONLY if `startupNamePublic === true`. Owner contact info is NEVER included.

```json
{
  "requirement": {
    "id": "uuid-v4-string",
    "title": "CTO & Technical Co-Founder for AI Engine",
    "needSkill": "TECH",
    "industry": "Artificial Intelligence",
    "stage": "MVP",
    "currentUsers": 150,
    "ownerContributes": "Product Strategy, 100k angel funding raised",
    "offer": "40-50% Equity",
    "commitment": "FULL",
    "location": "San Francisco, CA",
    "remote": true,
    "createdAt": "2026-10-05T12:00:00.000Z",
    "status": "ACTIVE",
    "visibility": "PUBLIC",
    "startupName": "AgenticFlow",
    "owner": {
      "id": "uuid-v4-string",
      "name": "Alex Rivera",
      "city": "San Francisco, CA",
      "badges": ["EMAIL_DECLARED"]
    }
  }
}
```

---

### 2. Browse Requirements (`GET /requirements`)
- **GET** `/requirements`
- **Auth Required**: Yes (`Bearer <accessToken>`)

#### Query Parameters
- `q` (`string`, optional): Search query.
  - Terms ≥ 3 chars: Uses MySQL FULLTEXT search (`MATCH(title, industry, needSkill) AGAINST(:term IN BOOLEAN MODE)`). Strips boolean operators (`+ - < > ( ) ~ * " @`).
  - Terms < 3 chars (e.g. `"AI"`): Uses `LIKE` search on `title`, `industry`, or `needSkill` with wildcard escaping.
- `skill` (`string`, optional): Filter by canonical skill (e.g. `TECH`).
- `stage` (`string`, optional): Filter by stage (`IDEA`, `MVP`, `EARLY_TRACTION`, `GROWTH`).
- `commitment` (`string`, optional): Filter by commitment (`FULL`, `PART`, `WEEKEND`).
- `location` (`string`, optional): Filter by location substring.
- `remote` (`boolean`, optional): `true` or `false`.
- `sort` (`string`, optional): `recent` (default). `match` is accepted but reserved for Step 4.
- `cursor` (`string`, optional): Base64-encoded opaque cursor string `{ createdAt, id }`. Returns `400 INVALID_INPUT` if invalid.
- `limit` (`number`, optional): Items per page (default: 20, max: 50).

#### Browse Filtering Rules
- Returns ONLY `status === "ACTIVE"` requirements.
- Excludes requirements owned by the calling user.
- Excludes requirements owned by users blocked in either direction (`Block` table).
- Excludes `VERIFIED_ONLY` requirements if calling user has no `LINKEDIN` or `PHONE` verification record.

#### Success Response (`200 OK`)
```json
{
  "items": [
    {
      "id": "uuid-v4-string",
      "title": "CTO & Technical Co-Founder for AI Engine",
      "needSkill": "TECH",
      "industry": "Artificial Intelligence",
      "stage": "MVP",
      "currentUsers": 150,
      "ownerContributes": "Product Strategy, 100k angel funding raised",
      "offer": "40-50% Equity",
      "commitment": "FULL",
      "location": "San Francisco, CA",
      "remote": true,
      "createdAt": "2026-10-05T12:00:00.000Z",
      "status": "ACTIVE",
      "visibility": "PUBLIC",
      "owner": {
        "id": "uuid-v4-string",
        "name": "Alex Rivera",
        "city": "San Francisco, CA",
        "badges": ["EMAIL_DECLARED", "LINKEDIN_LINKED"]
      }
    }
  ],
  "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI2LTEwLTA1VDEyOjAwOjAwLjAwMFoiLCJpZCI6InV1aWQtdjQtc3RyaW5nIn0=" // null on last page
}
```

---

### 3. Get My Owned Requirements (`GET /requirements/mine`)
- **GET** `/requirements/mine`
- **Auth Required**: Yes (`Bearer <accessToken>`)

#### Success Response (`200 OK`)
Returns list of all requirements owned by the authenticated user sorted by `createdAt desc` (includes `ACTIVE`, `PAUSED`, and `CLOSED` items).

```json
{
  "requirements": [
    {
      "id": "uuid-v4-string",
      "title": "CTO & Technical Co-Founder for AI Engine",
      "needSkill": "TECH",
      "industry": "Artificial Intelligence",
      "stage": "MVP",
      "currentUsers": 150,
      "offer": "40-50% Equity",
      "commitment": "FULL",
      "location": "San Francisco, CA",
      "remote": true,
      "createdAt": "2026-10-05T12:00:00.000Z",
      "status": "ACTIVE",
      "visibility": "PUBLIC",
      "startupName": "AgenticFlow",
      "owner": {
        "id": "uuid-v4-string",
        "name": "Alex Rivera",
        "city": "San Francisco, CA",
        "badges": ["EMAIL_DECLARED"]
      }
    }
  ]
}
```

---

### 4. Get Single Requirement Detail (`GET /requirements/:id`)
- **GET** `/requirements/:id`
- **Auth Required**: Yes (`Bearer <accessToken>`)

#### Rules
- Returns `404 NOT_FOUND` if requirement does not exist, if blocked in either direction, OR if `status !== "ACTIVE"` and caller is not the owner.
- Returns `403 FORBIDDEN` if requirement is `VERIFIED_ONLY` and caller is not the owner and has no `LINKEDIN` or `PHONE` verification record.

#### Success Response (`200 OK`)
```json
{
  "requirement": {
    "id": "uuid-v4-string",
    "title": "CTO & Technical Co-Founder for AI Engine",
    "needSkill": "TECH",
    "industry": "Artificial Intelligence",
    "stage": "MVP",
    "currentUsers": 150,
    "offer": "40-50% Equity",
    "commitment": "FULL",
    "location": "San Francisco, CA",
    "remote": true,
    "createdAt": "2026-10-05T12:00:00.000Z",
    "status": "ACTIVE",
    "visibility": "PUBLIC",
    "owner": {
      "id": "uuid-v4-string",
      "name": "Alex Rivera",
      "city": "San Francisco, CA",
      "badges": ["EMAIL_DECLARED"]
    }
  }
}
```

---

### 5. Update Requirement (`PATCH /requirements/:id`)
- **PATCH** `/requirements/:id`
- **Auth Required**: Yes (`Bearer <accessToken>`)
- **Owner Only**: Returns `403 FORBIDDEN` if caller is not the owner.
- **Strict Zod Payload**: `.strict()` (whitelist: cannot pass `id`, `ownerId`, `createdAt`).

#### Status Transition Rules
- `ACTIVE` ↔ `PAUSED` allowed.
- `ACTIVE` / `PAUSED` ➔ `CLOSED` allowed.
- `CLOSED` requirements **cannot** be reopened (attempting to change status of a `CLOSED` requirement returns `400 INVALID_INPUT`).

#### Request Body
```json
{
  "title": "Updated Requirement Title",
  "status": "PAUSED" // "ACTIVE" | "PAUSED" | "CLOSED"
}
```

#### Success Response (`200 OK`)
```json
{
  "requirement": {
    "id": "uuid-v4-string",
    "title": "Updated Requirement Title",
    "status": "PAUSED"
  }
}
```
