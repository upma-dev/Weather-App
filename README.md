# ⛅ WeatherApp — Full Stack (React + Node + MongoDB)

## Features
- ✅ User Registration with email OTP verification
- ✅ Login with **2FA** (6-digit OTP to email after password check)
- ✅ Forgot Password via OTP → Reset Password
- ✅ OTPs stored **hashed** in MongoDB (bcrypt), expire in 10 min
- ✅ Real-time weather + 24hr forecast via OpenWeatherMap API
- ✅ JWT-protected routes
- ✅ Beautiful dark glassmorphism UI

---

## 📁 Project Structure

```
weather-app/
├── backend/
│   ├── models/
│   │   ├── User.js          ← User schema (hashed password, isVerified)
│   │   └── OTP.js           ← OTP schema (hashed code, expiry, purpose, used)
│   ├── routes/
│   │   ├── auth.js          ← register/login/verify/forgot/reset endpoints
│   │   └── weather.js       ← weather + forecast endpoints
│   ├── middleware/
│   │   └── auth.js          ← JWT protect middleware
│   ├── utils/
│   │   ├── mailer.js        ← Nodemailer (Gmail SMTP)
│   │   └── otpHelper.js     ← generate / hash / verify OTP
│   ├── server.js            ← Express + MongoDB entry
│   └── .env                 ← Config (you must fill this)
│
└── frontend/
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.js   ← Global auth state (token, user)
    │   ├── pages/
    │   │   ├── Register.js
    │   │   ├── Login.js
    │   │   ├── VerifyOTP.js     ← 6 individual OTP digit inputs + paste support
    │   │   ├── ForgotPassword.js
    │   │   ├── ResetPassword.js
    │   │   └── Dashboard.js     ← Weather UI
    │   ├── components/
    │   │   └── ProtectedRoute.js
    │   ├── utils/
    │   │   └── api.js           ← Axios API calls
    │   ├── App.js               ← React Router setup
    │   └── index.css            ← Global styles (dark glassmorphism)
    └── public/
        └── index.html
```

---

## 🚀 Step-by-Step Setup

### Step 1: Install MongoDB
- Download from https://www.mongodb.com/try/download/community
- Start it: `mongod --dbpath /data/db`
- Or use **MongoDB Atlas** (cloud, free tier) → get a connection string

### Step 2: Get OpenWeatherMap API Key
1. Go to https://openweathermap.org/
2. Sign up → API keys tab → copy your key
3. Free tier gives 60 calls/min ✅

### Step 3: Get Gmail App Password (for sending OTPs)
1. Go to your Google Account → Security
2. Enable **2-Step Verification**
3. Search "App passwords" → create one for "Mail"
4. Copy the 16-character password

### Step 4: Configure `.env`
Open `backend/.env` and fill in:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/weatherapp
JWT_SECRET=any_long_random_string_here
EMAIL_USER=yourgmail@gmail.com
EMAIL_PASS=your_16_char_app_password
WEATHER_API_KEY=your_openweathermap_key
CLIENT_URL=http://localhost:3000
```

### Step 5: Install & Run Backend
```bash
cd backend
npm install
npm run dev   # uses nodemon for auto-reload
```
Server starts at: http://localhost:5000

### Step 6: Install & Run Frontend
```bash
cd frontend
npm install
npm start
```
App opens at: http://localhost:3000

---

## 🔄 Auth Flow Explained

```
REGISTER:
  User fills form → POST /api/auth/register
  → User created (isVerified: false)
  → 6-digit OTP generated, HASHED & saved to MongoDB
  → OTP emailed to user
  → User enters OTP → POST /api/auth/verify-otp
  → OTP verified, user.isVerified = true, JWT returned

LOGIN (2FA):
  User enters email+password → POST /api/auth/login
  → Credentials verified → 6-digit 2FA OTP emailed
  → User enters OTP → POST /api/auth/login-verify
  → JWT returned ✅

FORGOT PASSWORD:
  Enter email → POST /api/auth/forgot-password
  → Reset OTP emailed
  → Enter OTP → /verify-otp page → /reset-password page
  → POST /api/auth/reset-password with email + otp + newPassword
  → Password updated ✅
```

---

## 🎨 Customization Guide

### Change colors (frontend/src/index.css):
```css
:root {
  --blue: #3b82f6;   /* primary blue */
  --cyan: #06b6d4;   /* gradient accent */
  --bg: #060b14;     /* page background */
}
```

### Change OTP expiry (backend/routes/auth.js):
```js
const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // change 10 to any minutes
```

### Add more weather cities / geolocation:
In `Dashboard.js`, call `getWeather({ lat, lon })` using `navigator.geolocation.getCurrentPosition()`

---

## 🧪 API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/auth/register | ❌ | Register + send OTP |
| POST | /api/auth/verify-otp | ❌ | Verify registration OTP |
| POST | /api/auth/resend-otp | ❌ | Resend OTP |
| POST | /api/auth/login | ❌ | Login step 1 (send 2FA OTP) |
| POST | /api/auth/login-verify | ❌ | Login step 2 (verify 2FA) |
| POST | /api/auth/forgot-password | ❌ | Send reset OTP |
| POST | /api/auth/reset-password | ❌ | Reset password |
| GET | /api/weather?city=Delhi | ✅ JWT | Current weather |
| GET | /api/weather/forecast?city=Delhi | ✅ JWT | 24hr forecast |

---

## 💡 Interview Tips

**Q: Why hash OTPs?**
A: Even if the DB is compromised, attackers can't use leaked OTPs. We use bcrypt same as passwords.

**Q: Why separate OTP collection?**
A: Allows TTL index for auto-cleanup, audit trail, multiple purposes (verify/reset).

**Q: How is 2FA implemented?**
A: After correct password, a new OTP is generated and emailed. The user can only get a JWT after verifying this OTP. This is TOTP via email.

**Q: How do you prevent OTP brute force?**
A: Add rate limiting (express-rate-limit package) + mark OTPs as used after one attempt.
