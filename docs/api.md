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

## Recommendation Scoring Specification

Every requirement returned via `GET /requirements` and `GET /requirements/:id` includes a personalized recommendation score and breakdown for the authenticated user.

> [!NOTE]
> Terminology: The UI displays this as **"recommendation score"**, never "compatibility".

### Component Weights (`config/matching.ts`) Total = 100
- `skillComplement` (**25 pts**): `1.0` if candidate has `needSkill` and owner lacks it; `0.6` if both have it; `0.0` if candidate lacks it.
- `requirementFit` (**20 pts**): `1.0` for exact availability match (`FULL`/`PART`/`WEEKEND`); `0.4` if requirement is `FULL` and candidate is `PART`; `0.0` otherwise.
- `commitment` (**15 pts**): Evaluates `hoursPerWeek` ($\ge 35$: 1.0, $\ge 20$: 0.7, $\ge 10$: 0.4, $< 10$: 0.2) and `minMonths` ($\ge 12$: 1.0, $\ge 6$: 0.7, $\ge 3$: 0.4, $< 3$: 0.2).
- `industryExperience` (**10 pts**): Same industry base (0.8) or different industry (0.3) + `previousStartup` bonus (+0.2, capped at 1.0).
- `stage` (**10 pts**): Candidate `experienceYears` / `previousStartup` vs requirement `stage` (`IDEA`: 1.0; `MVP`: $\ge 1$ yr/startup 1.0; `EARLY_TRACTION`: $\ge 3$ yrs 1.0; `GROWTH`: $\ge 5$ yrs 1.0).
- `equityCompensation` (**10 pts**): Candidate expectation vs requirement `equityOfferMax` (maximum equity the founder is willing to offer - public):
  - `candEquity <= reqEquityOfferMax` $\rightarrow$ `High` / `1.0` (full points).
  - Exceeds max offered by $1..10$ points $\rightarrow$ `"Needs discussion"` / `0.5` (partial points).
  - Exceeds max offered by $> 10$ points $\rightarrow$ `Low` / `0.0` (0 points).
  - Missing `equityOfferMax` $\rightarrow$ `"Needs discussion"` / `0.5` (neutral points).
- `location` (**5 pts**): `1.0` (`High`) if `requirement.remote === true` OR normalized cities match (taking substring before first comma, e.g. `"Austin, TX"` vs `"Austin"`); `0.0` (`Low`) otherwise. Candidate's `remote` capability flag does NOT make an onsite requirement match.
- `preferences` (**5 pts**): Neutral placeholder constant (`0.5` / `Medium` label) until real preference data exists.

### Breakdown Item Shape
Each component returns:
```json
{
  "weight": 25,
  "points": 25,
  "label": "High" // "High" | "Medium" | "Low" | "Needs discussion"
}
```
*Rounding*: `score` = sum of component points, clamped to $0..100$.

### Null Score Cases
- **Incomplete Candidate Profile or Commitment**: Returns `score: null`, `breakdown: null`, `reasons: ["Complete your profile to see your score"]`.
- **Requirement Owner**: Returns `score: null`, `breakdown: null`, `reasons: []`.

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
  "equityOfferMax": 50, // maximum equity the founder is willing to offer (public, 0-100)
  "commitment": "FULL", // "FULL" | "PART" | "WEEKEND"
  "location": "San Francisco, CA",
  "remote": true, // Default: true
  "visibility": "PUBLIC" // "PUBLIC" | "VERIFIED_ONLY"
}
```

#### Success Response (`201 Created`)
Returns requirement DTO with `score: null`.

---

### 2. Browse Requirements (`GET /requirements`)
- **GET** `/requirements`
- **Auth Required**: Yes (`Bearer <accessToken>`)

#### Field Visibility Rules
- `startupName` (`string`, optional): Returned **ONLY IF** `startupNamePublic === true` OR caller is the requirement owner.
- `equityOfferMax` (`number | null`): Maximum equity offered (0-100). Public field.

#### Query Parameters
- `q` (`string`, optional): Search query.
  - Terms $\ge 3$ chars: Uses MySQL FULLTEXT search (`MATCH(title, industry, needSkill) AGAINST(:term IN BOOLEAN MODE)`). Strips boolean operators (`+ - < > ( ) ~ * " @`).
  - Terms $< 3$ chars (e.g. `"AI"`): Uses `LIKE` search on `title`, `industry`, or `needSkill` with wildcard escaping.
- `skill` (`string`, optional): Filter by canonical skill (e.g. `TECH`).
- `stage` (`string`, optional): Filter by stage (`IDEA`, `MVP`, `EARLY_TRACTION`, `GROWTH`).
- `commitment` (`string`, optional): Filter by commitment (`FULL`, `PART`, `WEEKEND`).
- `location` (`string`, optional): Filter by location substring.
- `remote` (`boolean`, optional): `true` or `false`.
- `sort` (`string`, optional): `recent` (default) or `match`.
- `cursor` (`string`, optional): Opaque base64 cursor string.
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
      "equityOfferMax": 50,
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
      },
      "score": 98,
      "breakdown": {
        "skillComplement": { "weight": 25, "points": 25, "label": "High" },
        "requirementFit": { "weight": 20, "points": 20, "label": "High" },
        "commitment": { "weight": 15, "points": 15, "label": "High" },
        "industryExperience": { "weight": 10, "points": 10, "label": "High" },
        "stage": { "weight": 10, "points": 10, "label": "High" },
        "equityCompensation": { "weight": 10, "points": 10, "label": "High" },
        "location": { "weight": 5, "points": 5, "label": "High" },
        "preferences": { "weight": 5, "points": 3, "label": "Medium" }
      },
      "reasons": [
        "You have the TECH skill this founder needs.",
        "Your FULL availability matches what the founder is looking for.",
        "Your commitment of 40 hrs/wk for 12+ months provides good stability.",
        "Relevant industry background in Artificial Intelligence.",
        "Your experience level (5 yrs) aligns with the MVP stage.",
        "You expect 20% and the founder offers up to 50%.",
        "Remote role, location is not a constraint.",
        "Default preference score (placeholder until preference data exists)."
      ]
    }
  ],
  "nextCursor": "eyJtb2RlIjoibWF0Y2giLCJzY29yZSI6OTgsImlkIjoidXVpZC12NC1zdHJpbmcifQ=="
}
```

---

### 3. Get My Owned Requirements (`GET /requirements/mine`)
- **GET** `/requirements/mine`
- **Auth Required**: Yes (`Bearer <accessToken>`)

#### Success Response (`200 OK`)
Returns list of all requirements owned by caller. Includes `startupName` regardless of `startupNamePublic`. `score` is always `null` for owned items.

---

### 4. Get Single Requirement Detail (`GET /requirements/:id`)
- **GET** `/requirements/:id`
- **Auth Required**: Yes (`Bearer <accessToken>`)

#### Rules
- Returns `404 NOT_FOUND` if requirement does not exist, if blocked in either direction, OR if `status !== "ACTIVE"` and caller is not owner.
- Returns `403 FORBIDDEN` if requirement is `VERIFIED_ONLY` and caller is not owner and has no `LINKEDIN`/`PHONE` verification record.
- `startupName` is returned ONLY IF `startupNamePublic === true` OR caller is the requirement owner.

---

### 5. Update Requirement (`PATCH /requirements/:id`)
- **PATCH** `/requirements/:id`
- **Auth Required**: Yes (`Bearer <accessToken>`)
- **Owner Only**: Returns `403 FORBIDDEN` if caller is not owner.
- **Strict Zod Payload**: `.strict()`
