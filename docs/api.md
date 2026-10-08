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
- `INVALID_INPUT`: Request body or parameters failed Zod validation or invalid cursor format/mode.
- `UNAUTHORIZED`: Missing, invalid, or expired JWT access token.
- `FORBIDDEN`: User does not have permission (e.g. incomplete profile, modifying another user's requirement, reopening closed requirement, or unverified access to VERIFIED_ONLY requirement).
- `NOT_FOUND`: The requested resource was not found (or requirement is PAUSED/CLOSED for non-owners, or blocked).
- `CONFLICT`: Resource already exists or duplicate constraint.
- `RATE_LIMIT_EXCEEDED`: Too many requests submitted in a given window.
- `DAILY_LIMIT_REACHED`: Daily interest submission cap exceeded (HTTP 429).
- `INVALID_TRANSITION`: Illegal state transition attempted on interest (HTTP 409).
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

### 6. Interest Statuses (`config/interestTransitions.ts`)
`PENDING` | `ACCEPTED` | `LATER` | `DECLINED` | `WITHDRAWN`

---

## Interest State Machine Specification

| Action | Allowed Actor | Allowed From Statuses | Target Status | Description |
|---|---|---|---|---|
| `accept` | `owner` | `PENDING`, `LATER` | `ACCEPTED` | Owner accepts interest. Atomically creates Connection and Conversation in ONE transaction. Rejects if requirement is `CLOSED`. |
| `later` | `owner` | `PENDING` | `LATER` | Owner marks interest for later review. |
| `decline` | `owner` | `PENDING`, `LATER` | `DECLINED` | Owner declines candidate interest. Terminal state. |
| `withdraw` | `candidate` | `PENDING`, `LATER` | `WITHDRAWN` | Candidate withdraws sent interest. Terminal state. |

> [!IMPORTANT]
> - `ACCEPTED`, `DECLINED`, and `WITHDRAWN` are **terminal states**.
> - Re-expressing interest after `DECLINED` or `WITHDRAWN` is **not possible** in V1 due to the `(requirementId, candidateId)` unique constraint.

---

## Contact Unlock Specification

`shareablePhone` and `shareableEmail` are private fields written via `PUT /me`.
- **Phone Normalization**: Phone numbers are normalized by stripping spaces, dashes, and parentheses (`/^\+?[0-9]{8,15}$/`).
- **Visibility Allow-list**:
  1. Caller's own `GET /me` & `PUT /me` responses.
  2. `GET /connections/:id` (other user object) **ONLY AFTER BOTH** participants have executed `POST /connections/:id/share-contact` **AND** no block exists between the users.
- **Absence**: In all other endpoints (`GET /requirements`, `GET /requirements/:id`, `GET /requirements/:id/interests`, `GET /me/interests`, `GET /connections`), `shareablePhone` and `shareableEmail` are **completely absent** (omitted from the response object).

---

## Interests & Connections API

### 1. Express Interest (`POST /requirements/:id/interest`)
- **POST** `/requirements/:id/interest`
- **Auth Required**: Yes (`Bearer <accessToken>`)
- **Body**: `{}` (`.strict()`)
- **Rules**:
  - Requires `profileComplete === true` and `commitmentComplete === true` (`403 FORBIDDEN`).
  - Owner cannot express interest in own requirement (`403 FORBIDDEN`).
  - Requirement must be `ACTIVE`, visible, and unblocked (`404 NOT_FOUND`).
  - Daily limit: max `DAILY_INTEREST_CAP` (10 per 24 hours) (`429 DAILY_LIMIT_REACHED`).
  - Duplicate submission returns `409 CONFLICT`.
  - Server calculates recommendation score and snapshots `score`, `breakdown`, and `reasons`. Client-sent scores are rejected.

---

### 2. Get Requirement Interests (`GET /requirements/:id/interests`)
- **GET** `/requirements/:id/interests`
- **Auth Required**: Yes (`Bearer <accessToken>`) - Requirement Owner Only (`404 NOT_FOUND` for non-owners).
- **Query Params**: `status` (`PENDING` | `ACCEPTED` | `LATER` | `DECLINED` | `WITHDRAWN`), `cursor`, `limit`.
- **Response**: List of candidate interests with snapshot score/breakdown/reasons and safe candidate profile/commitment subset.

---

### 3. Get Sent Interests (`GET /me/interests`)
- **GET** `/me/interests`
- **Auth Required**: Yes (`Bearer <accessToken>`) - Candidate sent interests.
- **Query Params**: `status`, `cursor`, `limit`.
- **Response**: List of caller's sent interests with snapshot score/breakdown/reasons and safe requirement subset.

---

### 4. Update Interest Status (`PATCH /interests/:id`)
- **PATCH** `/interests/:id`
- **Auth Required**: Yes (`Bearer <accessToken>`)
- **Body**: `{ "action": "accept" | "later" | "decline" | "withdraw" }` (`.strict()`)
- **Rules**:
  - Wrong actor role returns `403 FORBIDDEN`. Outsider returns `404 NOT_FOUND`.
  - Invalid transition returns `409 INVALID_TRANSITION`.
  - On `accept`, updates interest status and creates 1 `Connection` + 1 `Conversation` atomically inside ONE Prisma transaction.

---

### 5. Get Connections List (`GET /connections`)
- **GET** `/connections`
- **Auth Required**: Yes (`Bearer <accessToken>`)
- **Response**: List of connections with other user's safe subset, `iHaveShared`, `theyHaveShared`, and `conversationId`. Contact fields are **NOT** included.

---

### 6. Get Connection Detail (`GET /connections/:id`)
- **GET** `/connections/:id`
- **Auth Required**: Yes (`Bearer <accessToken>`) - Participants Only (`404 NOT_FOUND` for others).
- **Response**: Connection details + other user profile. Includes `shareablePhone` and `shareableEmail` **only if** both `iHaveShared` and `theyHaveShared` are true AND no block exists.

---

### 7. Share Contact Information (`POST /connections/:id/share-contact`)
- **POST** `/connections/:id/share-contact`
- **Auth Required**: Yes (`Bearer <accessToken>`)
- **Rules**:
  - Requires caller to have at least one shareable contact field (`shareablePhone` or `shareableEmail`) filled in profile (`400 INVALID_INPUT` if neither is set).
  - Sets caller's share flag. Idempotent one-way action in V1.

---

### 8. Get Received Interests (`GET /me/received-interests`)
- **GET** `/me/received-interests`
- **Auth Required**: Yes (`Bearer <accessToken>`)
- **Query Params**:
  - `status`: optional enum (`PENDING` | `LATER` | `ACCEPTED` | `DECLINED` | `WITHDRAWN`). Default returns all statuses including `WITHDRAWN`. Invalid status -> `400 INVALID_INPUT`.
  - `requirementId`: optional UUID string. Restricts items to a requirement owned by caller. If requirement belongs to another user, returns `{ items: [], nextCursor: null }` with 200 OK (never reveals existence). Invalid UUID -> `400 INVALID_INPUT`.
  - `limit`: optional integer between 1 and 50 (default 20). Invalid limit -> `400 INVALID_INPUT`.
  - `cursor`: optional opaque cursor string for pagination. Invalid or tampered cursor -> `400 INVALID_INPUT`.
- **Response**: List of candidate interests across all requirements owned by caller, sorted newest first.
  - Each item includes: `id`, `status`, `createdAt`, `score`, `breakdown`, `reasons`, `connectionId` (present when status is `ACCEPTED`), `requirement` subset (`{ id, title, status }`), and `candidate` safe subset.
  - `requirement.status` is included so mobile clients can disable Accept when the requirement is `CLOSED` (`409 CONFLICT`).
  - Interests on `CLOSED` requirements appear in this list with `requirement.status === 'CLOSED'`.
  - Excludes interests where a block exists in either direction between owner and candidate.
  - **Candidate Allow-list**: `candidate` object strictly contains ONLY `id`, `name`, `city`, `industry`, `skills`, `experienceYears`, `previousStartup`, `badges`, `commitment`. Never contains email, phone, or shareable contact fields.

---

### 9. Get Header Counts (`GET /me/counts`)
- **GET** `/me/counts`
- **Auth Required**: Yes (`Bearer <accessToken>`)
- **Response**: `{ pendingReceivedInterests: number, connections: number }`
- **Rules**:
  - `pendingReceivedInterests`: total count of `PENDING` interests on `ACTIVE` or `PAUSED` requirements owned by caller (excludes `CLOSED` requirements and blocked pairs).
  - `connections`: total count of active connections for caller, calculated using the exact same shared filter as `GET /connections`.
  - Lightweight query intended to be called on tab focus.

