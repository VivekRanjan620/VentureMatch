# VentureMatch Backend API

Express + TypeScript backend with Prisma ORM, MySQL 8, Zod validation, JWT authentication, and rate limiting.

## Setup Instructions (Windows)

### 1. Prerequisites
- **Node.js**: v18+ and `npm` installed.
- **MySQL Database**: Either Docker Desktop running OR a locally installed MySQL 8 server.

---

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```

If using Docker MySQL (default configuration):
```env
DATABASE_URL="mysql://venturematch:venturematch_pass@localhost:3306/venturematch"
```

If using a locally installed MySQL instance:
Update `DATABASE_URL` in `.env` with your root or custom MySQL credentials:
```env
DATABASE_URL="mysql://root:YourPassword@localhost:3306/venturematch"
```

---

### 3. Database Initialization

#### Option A: Docker Compose (Recommended)
Launch MySQL 8 in a background container:
```powershell
docker compose up -d
```

#### Option B: Local MySQL
Ensure your local MySQL 8 service is running and create the database:
```sql
CREATE DATABASE venturematch;
```

---

### 4. Install Dependencies, Sync Database & Seed

```powershell
# Install npm packages
npm install

# Push Prisma schema to MySQL
npx prisma db push

# Seed database with 5 sample users and requirements (NON-destructive upsert)
npm run prisma:seed
```

---

### 5. Database Safety & Destructive Commands Policy

To protect development data from accidental deletion:

- **NON-DESTRUCTIVE Seed (Default)**: `npm run prisma:seed`
  - Uses `upsert` by email for the 5 sample users, profiles, commitment profiles, and requirements.
  - **Never** deletes existing users or custom dev data.
- **DESTRUCTIVE Commands**:
  - `npx prisma migrate reset` / `npx prisma db push --force-reset`: Completely wipes all tables and schema.
  - `npm run prisma:seed:reset`: Destructively wipes all tables before seeding. Requires `ALLOW_DB_RESET=true` in environment and `NODE_ENV != 'production'`.
  - `npm test`: Runs integration tests against the dedicated test database (`venturematch_test`). Cleans `venturematch_test` before and after test suites. Includes a safety check that **throws a fatal error** if `DATABASE_URL` does not contain `_test`.

---

### 6. Start Development Server

```powershell
npm run dev
```
The server will start on `http://localhost:4000`.

---

## Running Integration & Unit Tests

Tests run using Jest and Supertest against a dedicated test database (`venturematch_test`). The test runner includes a safety guard that **refuses to run** if `DATABASE_URL` does not contain `_test`.

### 1. Setup Test Database (One-time setup)
```powershell
$env:DATABASE_URL="mysql://venturematch:venturematch_pass@localhost:3306/venturematch_test"
npx prisma db push --accept-data-loss
```

### 2. Execute Tests
```powershell
npm test
```

---

## Verification & Testing Commands

### Health Check (PowerShell)
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/v1/health" -Method Get
```

### Register New User
```powershell
$registerBody = @{
    email = "newuser@example.com"
    password = "Password123!"
    role = "BOTH"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/api/v1/auth/register" -Method Post -ContentType "application/json" -Body $registerBody
```

### Express Interest in a Requirement
```powershell
$headers = @{
    Authorization = "Bearer $($res.tokens.accessToken)"
}
Invoke-RestMethod -Uri "http://localhost:4000/api/v1/requirements/<requirement-id>/interest" -Method Post -Headers $headers -ContentType "application/json" -Body "{}"
```

### Share Contact Information
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/v1/connections/<connection-id>/share-contact" -Method Post -Headers $headers
```
