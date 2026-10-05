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
- `INVALID_INPUT`: Request body or parameters failed Zod validation (details contains issues).
- `UNAUTHORIZED`: Missing, invalid, or expired JWT access token.
- `FORBIDDEN`: User does not have permission to access or modify this resource.
- `NOT_FOUND`: The requested resource was not found.
- `CONFLICT`: Resource already exists (e.g., email already registered).
- `RATE_LIMIT_EXCEEDED`: Too many requests submitted in a given window.
- `INTERNAL_SERVER_ERROR`: Unexpected server error.

---

## Allowed Skills Specification

Skill values across profiles and requirements must be selected from the following canonical list (`config/skills.ts`):

`TECH` | `MARKETING` | `SALES` | `FINANCE` | `OPERATIONS` | `PRODUCT` | `DESIGN` | `OTHER`

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
- **LINKEDIN**: `{ type: "LINKEDIN", status: "linked", method: "linked-only", verifiedAt: null, linkedAt: "ISO-String" }` *(Note: Represents profile/account linking only, NOT official identity verification)*.

---

## Auth Endpoints

### 1. Register User
- **POST** `/auth/register`
- **Auth Required**: No

#### Request Body
```json
{
  "email": "founder@example.com",
  "password": "Password123!",
  "role": "FOUNDER" // "FOUNDER" | "SEEKER" | "BOTH"
}
```

#### Success Response (`201 Created`)
Creates user and automatically creates an initial `EMAIL` verification record (`method: "self-declared"`).

```json
{
  "user": {
    "id": "uuid-v4-string",
    "email": "founder@example.com",
    "role": "FOUNDER",
    "createdAt": "2026-10-05T12:00:00.000Z"
  },
  "tokens": {
    "accessToken": "jwt-access-token-string",
    "refreshToken": "jwt-refresh-token-string",
    "expiresIn": 900
  }
}
```

---

### 2. Login
- **POST** `/auth/login`
- **Auth Required**: No

#### Request Body
```json
{
  "email": "founder@example.com",
  "password": "Password123!"
}
```

#### Success Response (`200 OK`)
```json
{
  "user": {
    "id": "uuid-v4-string",
    "email": "founder@example.com",
    "role": "FOUNDER",
    "createdAt": "2026-10-05T12:00:00.000Z"
  },
  "tokens": {
    "accessToken": "jwt-access-token-string",
    "refreshToken": "jwt-refresh-token-string",
    "expiresIn": 900
  }
}
```

---

### 3. Refresh Tokens
- **POST** `/auth/refresh`
- **Auth Required**: No

#### Request Body
```json
{
  "refreshToken": "jwt-refresh-token-string"
}
```

#### Success Response (`200 OK`)
```json
{
  "tokens": {
    "accessToken": "new-jwt-access-token-string",
    "refreshToken": "new-jwt-refresh-token-string",
    "expiresIn": 900
  }
}
```

---

### 4. Logout
- **POST** `/auth/logout`
- **Auth Required**: No

#### Request Body
```json
{
  "refreshToken": "jwt-refresh-token-string"
}
```

---

## User & Profile Endpoints

### 1. Get Current User (`/me`)
- **GET** `/me`
- **Auth Required**: Yes (`Bearer <accessToken>`)

#### Success Response (`200 OK`)
Never returns `passwordHash` or `refreshTokens`.

```json
{
  "user": {
    "id": "uuid-v4-string",
    "email": "founder@example.com",
    "role": "FOUNDER",
    "createdAt": "2026-10-05T12:00:00.000Z",
    "updatedAt": "2026-10-05T12:00:00.000Z",
    "profileComplete": true,
    "commitmentComplete": true,
    "profile": {
      "id": "uuid-v4-string",
      "userId": "uuid-v4-string",
      "name": "Alex Rivera",
      "city": "San Francisco, CA",
      "ageRange": "28-34",
      "industry": "Artificial Intelligence",
      "bio": "Serial entrepreneur building dev tools.",
      "skills": ["PRODUCT", "TECH", "SALES"],
      "experienceYears": 8,
      "previousStartup": true,
      "currentWork": "Building VentureMatch",
      "shareablePhone": "+1-555-0192",
      "shareableEmail": "alex.rivera@example.com"
    },
    "commitmentProfile": {
      "id": "uuid-v4-string",
      "userId": "uuid-v4-string",
      "hoursPerWeek": 50,
      "availability": "FULL",
      "minMonths": 12,
      "canInvestAmount": 25000,
      "contributes": ["PRODUCT", "FINANCE"],
      "equityExpectation": 50,
      "compensationPref": "EQUITY",
      "remote": true
    },
    "verificationRecords": [
      {
        "id": "uuid-v4-string",
        "type": "EMAIL",
        "status": "unverified",
        "method": "self-declared",
        "verifiedAt": null
      }
    ]
  }
}
```

---

### 2. Update Profile (`PUT /me`)
- **PUT** `/me`
- **Auth Required**: Yes (`Bearer <accessToken>`)
- **Strict Zod Payload**: Rejects unknown fields (`role`, `id`, `userId`, etc.)

#### Request Body
```json
{
  "name": "Alex Rivera",
  "city": "San Francisco, CA",
  "ageRange": "28-34",
  "industry": "Artificial Intelligence",
  "bio": "Serial entrepreneur building dev tools.",
  "skills": ["PRODUCT", "TECH"],
  "experienceYears": 8,
  "previousStartup": true,
  "currentWork": "Founder & CEO",
  "shareablePhone": "+1-555-0192",
  "shareableEmail": "alex@example.com"
}
```

#### Success Response (`200 OK`)
```json
{
  "profile": {
    "id": "uuid-v4-string",
    "userId": "uuid-v4-string",
    "name": "Alex Rivera",
    "city": "San Francisco, CA",
    "skills": ["PRODUCT", "TECH"],
    "experienceYears": 8
  }
}
```

---

### 3. Get Commitment Profile (`GET /me/commitment`)
- **GET** `/me/commitment`
- **Auth Required**: Yes (`Bearer <accessToken>`)

#### Success Response (`200 OK`)
```json
{
  "commitment": {
    "id": "uuid-v4-string",
    "userId": "uuid-v4-string",
    "hoursPerWeek": 50,
    "availability": "FULL",
    "minMonths": 12,
    "canInvestAmount": 25000,
    "contributes": ["PRODUCT", "FINANCE"],
    "equityExpectation": 50,
    "compensationPref": "EQUITY",
    "remote": true
  }
}
```

---

### 4. Update Commitment Profile (`PUT /me/commitment`)
- **PUT** `/me/commitment`
- **Auth Required**: Yes (`Bearer <accessToken>`)
- **Strict Zod Payload**: Rejects unknown fields.

#### Request Body
```json
{
  "hoursPerWeek": 50,
  "availability": "FULL",
  "minMonths": 12,
  "canInvestAmount": 25000,
  "contributes": ["PRODUCT", "FINANCE"],
  "equityExpectation": 50, // Integer 0-100
  "compensationPref": "EQUITY", // "EQUITY" | "SALARY" | "REV_SHARE"
  "remote": true
}
```

#### Success Response (`200 OK`)
```json
{
  "commitment": {
    "id": "uuid-v4-string",
    "userId": "uuid-v4-string",
    "hoursPerWeek": 50,
    "equityExpectation": 50
  }
}
```

---

### 5. Link LinkedIn Account Stub (`POST /me/verification/linkedin`)
- **POST** `/me/verification/linkedin`
- **Auth Required**: Yes (`Bearer <accessToken>`)

#### Request Body
```json
{
  "linkedinUrl": "https://linkedin.com/in/alexrivera"
}
```

#### Success Response (`200 OK`)
```json
{
  "verification": {
    "id": "uuid-v4-string",
    "type": "LINKEDIN",
    "status": "linked",
    "method": "linked-only",
    "linkedinUrl": "https://linkedin.com/in/alexrivera",
    "verifiedAt": null,
    "linkedAt": "2026-10-05T12:00:00.000Z"
  }
}
```

---

## Health Check Endpoint
- **GET** `/health`
- **Auth Required**: No
