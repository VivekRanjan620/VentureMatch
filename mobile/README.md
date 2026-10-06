# VentureMatch Mobile App (Expo & React Native)

React Native mobile client for VentureMatch built with Expo, Expo Router, TypeScript, Zustand, and TanStack Query.

---

## Setup & Prerequisites

1. Ensure Node.js (v18+) is installed.
2. Install dependencies:
   ```bash
   cd mobile
   npm install
   ```

---

## Environment Configuration

Environment variables are managed via `mobile/.env`. Refer to `.env.example` for defaults:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000/api/v1
```

### Development API Base URLs
- **Android Emulator**: `http://10.0.2.2:4000/api/v1` (Default)
- **iOS Simulator**: `http://localhost:4000/api/v1`
- **Physical Device (LAN)**: `http://<YOUR_LOCAL_MACHINE_IP>:4000/api/v1` (e.g. `http://192.168.1.100:4000/api/v1`)

### Cleartext Traffic
Cleartext HTTP (`http://`) traffic is allowed on Android **only in development builds** (`APP_ENV === 'development'`) via dynamic `usesCleartextTraffic` in `app.config.ts`. Production builds strictly require HTTPS.

---

## Running the Application

Start the Expo development server:

```bash
npm start
```

Press `a` to open in an Android Emulator or scan the QR code with Expo Go.

---

## Verification & Quality Checks

Run the following commands inside `/mobile` to verify code quality and type correctness:

```bash
# TypeScript type check
npx tsc --noEmit

# ESLint check
npm run lint
```

---

## Note on Push Notifications (Step 11 Preview)
- Push notifications rely on Expo Notifications.
- For push notification testing on physical devices, an Expo development build or production build is required as Expo Go does not support custom remote push credentials.
