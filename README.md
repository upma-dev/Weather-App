# WeatherApp

Full-stack weather dashboard with **email OTP registration**, **2FA login**, and **OpenWeatherMap** data. Built for a portfolio / interview demo: clear UX, city-local times, and a layout that works from **large desktops down to small phones**.

---

## Tech stack

| Layer | Stack |
|--------|--------|
| Frontend | React 18, React Router 6, Axios, Create React App |
| Backend | Node.js, Express 4, Mongoose 8 |
| Data | MongoDB (Atlas or local), JWT sessions |
| External APIs | OpenWeatherMap 2.5, Gmail (Nodemailer) for OTP email |

---

## Features

### Authentication

- Register with name, email, password → **6-digit OTP** to email → verify to activate account.
- Login: password check → **second OTP** (2FA) to email → verify to receive JWT.
- Forgot password → reset OTP → new password.
- OTPs stored **hashed** (bcrypt), expire in **10 minutes**, single-use.
- Clear API messages (e.g. already registered, account not found, wrong password).

### Weather dashboard (`/dashboard`)

- **City-local time and date** using OpenWeatherMap’s `timezone` offset (not the browser’s timezone).
- **Day / night** styling from sunrise and sunset at that location.
- **Current conditions**, feels-like, min/max, humidity, wind, pressure, clouds, visibility.
- **5-day outlook** (local calendar days) with high/low and rain chance when available.
- **3-hour forecast** strip with horizontal scroll on narrow screens.
- **Search by city**, **geolocation**, **recent cities** (localStorage), **°C / °F**, **refresh**.
- **Responsive UI**: stacked header and search on small screens, fluid typography (`clamp`), 2-column stats grid on phones, touch-friendly forecast scrolling.

### Developer experience

- CRA **dev proxy** to the API (`frontend/package.json` → `"proxy": "http://localhost:5000"`).
- Frontend **`/api`** base URL so cookies/CORS stay simple in development.
- Optional **`frontend/.env.development`** with `WDS_SOCKET_PORT=0` to reduce HMR WebSocket warnings on some Windows setups.

---

## Project structure

```
weather-app/
├── backend/
│   ├── models/          User.js, OTP.js
│   ├── routes/          auth.js, weather.js
│   ├── middleware/      auth.js (JWT verify helper)
│   ├── utils/           mailer.js, otpHelper.js
│   ├── server.js        Express, MongoDB connect, index sync
│   └── .env             Secrets (not committed)
│
└── frontend/
    ├── public/          index.html, favicon.svg
    ├── src/
    │   ├── hooks/       useBreakpoint.js
    │   ├── pages/       Login, Register, VerifyOTP, Dashboard, …
    │   ├── components/  ProtectedRoute.js
    │   ├── context/     AuthContext.js
    │   ├── utils/       api.js
    │   ├── App.js
    │   └── index.css
    └── package.json
```

---

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **MongoDB** URI (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- **OpenWeatherMap** [API key](https://openweathermap.org/api) (free tier is enough for demos)
- **Gmail app password** (with 2-Step Verification enabled on the Google account)

---

## Environment variables

Create **`backend/.env`** (see also comments in that file):

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | optional | API port (default **5000**) |
| `MONGO_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Long random string for signing JWTs |
| `EMAIL_USER` | yes* | Gmail address used to send OTPs |
| `EMAIL_PASS` | yes* | Gmail **app password** (spaces are stripped automatically) |
| `WEATHER_API_KEY` | yes | OpenWeatherMap API key |
| `CLIENT_URL` | yes | Frontend origin for CORS, e.g. `http://localhost:3000` |

\*Without valid email credentials, register/login can still create users but **OTP email** may fail; fix SMTP before demoing 2FA.

Example:

```env
PORT=5000
MONGO_URI=mongodb+srv://USER:PASS@cluster.example.mongodb.net/weatherapp
JWT_SECRET=change_this_to_a_long_random_string
EMAIL_USER=you@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx
WEATHER_API_KEY=your_openweathermap_key
CLIENT_URL=http://localhost:3000
```

---

## How to run locally

You need **two terminals**: API on **5000**, React on **3000**.

### 1. Backend

```bash
cd weather-app/backend
npm install
npm start
# or: npm run dev   (nodemon)
```

Wait for: `MongoDB connected` and `Server running on http://localhost:5000`.

If you see **port already in use**, stop the other process on 5000 or change `PORT` in `.env`.

### 2. Frontend

```bash
cd weather-app/frontend
npm install
npm start
```

Open **http://localhost:3000**. The dev server proxies `/api/*` to the backend.

### 3. First-time database note

If an old project left a **unique `username`** index on `users`, the server runs **`User.syncIndexes()`** on startup to drop indexes that no longer exist on the Mongoose schema. Restart the backend once after pulling changes if registration failed with duplicate `username: null`.

---

## API overview

Base URL in dev (via proxy): **`/api`**.

### Auth (JSON body, no Bearer required)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create user, send verify OTP |
| POST | `/api/auth/verify-otp` | Verify email after registration |
| POST | `/api/auth/resend-otp` | Resend OTP (`purpose`: `verify` or `reset`) |
| POST | `/api/auth/login` | Password OK → send 2FA OTP |
| POST | `/api/auth/login-verify` | Verify 2FA → JWT + user |
| POST | `/api/auth/forgot-password` | Send reset OTP |
| POST | `/api/auth/reset-password` | New password with reset OTP |

### Weather (query params)

| Method | Path | Query | Description |
|--------|------|--------|-------------|
| GET | `/api/weather` | `city=name` **or** `lat` & `lon` | Current weather JSON |
| GET | `/api/weather/forecast` | same | 3-hour steps (`cnt` up to 40) |

Weather routes are **public** on the server; the SPA still stores a JWT after login for session UX.

### Health

`GET /api/health` → `{ success: true, message: "…" }`

---

## Responsive breakpoints (frontend)

Logic uses **`useBreakpoint`** (`src/hooks/useBreakpoint.js`) with resize listener:

| Flag | Width | Typical layout changes |
|------|-------|-------------------------|
| `isXs` | &lt; 400px | Tighter grids, smaller forecast cells |
| `isSm` | &lt; 640px | Stacked search + full-width buttons; swipe hint for forecast |
| `isMd` | &lt; 768px | Stacked dashboard header; centered hero weather block |
| `isLg` | &lt; 1024px | (reserved for future sidebars) |

Global **`index.css`** tweaks OTP digit size and card padding under **480px**. Viewport meta includes **`viewport-fit=cover`** for notched phones.

---

## Production build

```bash
cd weather-app/frontend
npm run build
```

Serve the `build/` folder from any static host. Point API requests to your deployed backend URL (update Axios `baseURL` or use env-based `REACT_APP_API_URL` if you add one).

---


