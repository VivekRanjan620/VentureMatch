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

# Seed database with 5 sample users and requirements
npm run prisma:seed
```

---

### 5. Start Development Server

```powershell
npm run dev
```
The server will start on `http://localhost:4000`.

---

## Running Integration Tests

Integration tests run using Jest and Supertest against a dedicated test database (`venturematch_test`). The test runner includes a safety guard that **refuses to run** if `DATABASE_URL` does not contain `_test`.

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

### Login (Seeded User)
```powershell
$loginBody = @{
    email = "alex.founder@example.com"
    password = "Password123!"
} | ConvertTo-Json

$res = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$res
```

### Get Current User Profile & Completeness (`/me`)
```powershell
$headers = @{
    Authorization = "Bearer $($res.tokens.accessToken)"
}
Invoke-RestMethod -Uri "http://localhost:4000/api/v1/me" -Method Get -Headers $headers
```

### Update Profile (`PUT /me`)
```powershell
$profileBody = @{
    name = "Alex Rivera"
    city = "San Francisco, CA"
    industry = "Artificial Intelligence"
    skills = @("PRODUCT", "TECH")
    experienceYears = 8
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/api/v1/me" -Method Put -Headers $headers -ContentType "application/json" -Body $profileBody
```

### Update Commitment (`PUT /me/commitment`)
```powershell
$commitmentBody = @{
    hoursPerWeek = 40
    availability = "FULL"
    minMonths = 12
    canInvestAmount = 25000
    equityExpectation = 50
    compensationPref = "EQUITY"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/api/v1/me/commitment" -Method Put -Headers $headers -ContentType "application/json" -Body $commitmentBody
```

### Link LinkedIn Stub (`POST /me/verification/linkedin`)
```powershell
$linkedinBody = @{
    linkedinUrl = "https://linkedin.com/in/alexrivera"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/api/v1/me/verification/linkedin" -Method Post -Headers $headers -ContentType "application/json" -Body $linkedinBody
```
