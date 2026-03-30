# Hospital Reservation App - New Features Implementation Guide

This document provides a complete overview of three major features implemented in the existing Hospital Reservation web app:
1. **Python AI Chatbot** for guided appointment booking
2. **Improved Get Started Button** with smooth scrolling
3. **OTP Verification** for secure login

## Quick Start

### 1. Start the Python Chatbot Service

```bash
cd backend/chatbot_service
pip install -r requirements.txt
python app.py
```

The service runs on `http://127.0.0.1:5000`

### 2. Set Environment Variables

Add to your backend `.env`:
```
CHATBOT_SERVICE_URL=http://127.0.0.1:5000
# Email configuration for OTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM=noreply@healthcare.com
```

### 3. Run Node Backend & Frontend

```bash
# Terminal 1: Node backend
cd backend
npm install
npm start

# Terminal 2: Frontend (Vite)
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`

---

## Feature 1: Python AI Chatbot

### Overview

Patients can chat with an AI assistant to book, reschedule, or cancel appointments step-by-step without navigating complex menus.

### How It Works

```
Patient Flow:
1. Click chatbot button (bottom-right of screen)
2. Select "Book an appointment"
3. Describe health need → AI suggests ranked doctors
4. Select doctor → AI shows available time slots
5. Select date/time → AI confirms appointment
6. Confirm → Appointment created via API
```

### Files Created/Modified

#### Backend
- **`backend/chatbot_service/app.py`** (NEW)
  - Flask microservice
  - Doctor ranking algorithm
  - Slot availability calculation
  - Symptom-to-specialty mapping

- **`backend/chatbot_service/requirements.txt`** (NEW)
  - Flask 2.3.3, Flask-CORS 4.0.0, Werkzeug 2.3.7

- **`backend/chatbot_service/README.md`** (NEW)
  - Detailed API documentation
  - Setup guide
  - Troubleshooting

- **`backend/src/controllers/chatbotController.js`** (NEW)
  - Node proxy for Python service
  - Fetches doctors from MongoDB
  - Calls Python endpoints
  - Integrates with existing appointment APIs

- **`backend/src/server.js`** (MODIFIED)
  - Added chatbot routes
  - Configured proxy to Python service

#### Frontend
- **`frontend/src/hooks/useAppointmentChatbot.js`** (NEW)
  - Conversation state management
  - Booking/reschedule/cancel flows
  - Message history tracking
  - Integration with backend APIs
  - 780+ lines

- **`frontend/src/components/AppointmentChatbot.jsx`** (NEW)
  - Floating chatbot widget UI
  - Message display with styling
  - Quick reply buttons
  - Text input with send button
  - Loading states

### Key Features

✅ **Step-by-Step Guided Booking**
- Patient describes symptoms → AI suggests doctors
- Select doctor → View availability
- Select date/time → Confirm details
- Book appointment

✅ **Doctor Ranking**
- Specialty match (+5 pts)
- Inferred specialty (+3 pts)
- Name keyword match (+2 pts)
- Date availability (+1 pt)

✅ **Available Slot Generation**
- Respects doctor working days
- 30-minute slots
- Excludes booked times
- No past appointments

✅ **Conversation Flows**
- Book appointment
- Reschedule appointment
- Cancel appointment
- Quick reply buttons for easy selection

### Testing the Chatbot

1. **Log in as a patient**
2. **Click the 💬 button** (bottom-right)
3. **Select "Book an appointment"**
4. **Type a symptom** like "chest pain" or "headache"
5. **Watch doctor suggestions appear** ranked by relevance
6. **Select a doctor** → See available times
7. **Select date** → Slots generate automatically
8. **Confirm** → Appointment created

---

## Feature 2: Improved Get Started Button

### Overview

The landing page "Get Started" button is now more visually appealing and functionally smooth.

### Improvements

✅ **Enhanced Button Styling**
- Gradient background (cyan → teal)
- Glow shadow effect
- Smooth hover animation (lift + glow)
- Modern border radius

✅ **Smooth Scroll Behavior**
- Clicking "Get Started" scrolls to signup section
- No page reload
- Smooth easing animation

✅ **Signup Section Added**
- Two side-by-side cards after main hero
- "For Patients" card with patient signup button
- "For Doctors" card with doctor signup button
- Hover effects on both cards
- Responsive grid layout

### Files Modified

- **`frontend/src/pages/LandingPage.jsx`** (MODIFIED)
  - Enhanced Get Started button with gradient and effects
  - Added `scrollToAuth()` function
  - New `landing-auth-section` with auth cards
  - Smooth scroll integration

### Visual Changes

**Before**: Simple button → Simple modal

**After**: 
```
[Get Started Button] (gradient, glow, hover lift)
    ↓ (smooth scroll)
Auth Section:
┌─────────────────────────────┐
│  👤 For Patients            │  👨‍⚕️ For Doctors
│  Book appointments          │  Manage practice
│  [Sign Up / Login]          │  [Sign Up / Login]
└─────────────────────────────┘
```

---

## Feature 3: OTP Verification for Secure Login

### Overview

All users (patients AND doctors) must verify a one-time password (OTP) sent via email after entering correct credentials.

### Login Flow with OTP

```
User enters email + password
    ↓
Credentials validated
    ↓
OTP generated & sent via email (10-min expiry)
    ↓
User sees OTP verification form
    ↓
User enters 6-digit code
    ↓
OTP validated
    ↓
JWT token issued, user logged in
```

### Files Created/Modified

#### Backend
- **`backend/src/services/otpService.js`** (NEW)
  - OTP generation (random 6 digits)
  - OTP storage (in-memory, expandable to Redis)
  - Email sending via nodemailer
  - OTP validation with attempt tracking
  - Automatic expiration cleanup

- **`backend/src/routes/auth.js`** (MODIFIED)
  - `POST /api/auth/send-otp` - Send OTP to email
  - `POST /api/auth/verify-otp` - Verify OTP code
  - `POST /api/auth/login-with-otp` - Complete login flow
  - Integrated OTP service into existing auth flow

#### Frontend
- **`frontend/src/components/Auth/OTPVerification.jsx`** (NEW)
  - Full-screen OTP verification modal
  - 6-digit code input (numeric only)
  - Timer showing OTP expiration (10 minutes)
  - Attempt counter
  - Resend button (available after 5 min)
  - Error/success messages
  - Loading states

- **`frontend/src/hooks/useAuthHandlers.js`** (MODIFIED)
  - Updated login handlers to use OTP flow
  - New `handleOTPVerificationSuccess()` callback
  - State management for OTP verification
  - Integration with OTP verification component

- **`frontend/src/App.jsx`** (MODIFIED)
  - Added OTP state variables:
    - `awaitingOTP` - Show OTP form
    - `otpEmail` - User's email
    - `otpUserRole` - patient or doctor
    - `otpExpiresIn` - Seconds until OTP expires
  - OTP component rendering
  - Chatbot component integration

### Key Features

✅ **Secure OTP Generation**
- 6-digit random codes
- 10-minute expiration
- Automatic cleanup of expired OTPs

✅ **Email Integration**
- Sends OTP via configured SMTP
- Formatted HTML email
- Clear instructions

✅ **User-Friendly Verification**
- Numeric-only input field
- Real-time countdown timer
- Attempt counter (max 5)
- Resend button after 5 minutes
- Loading states

✅ **Error Handling**
- Invalid code messages
- Expired OTP detection
- Too many attempts handling
- Clear user feedback

### Configuration

**Required environment variables** in `.env`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Google App Password
MAIL_FROM=noreply@healthcare.com
```

### Testing OTP

1. **Register a new patient account**
2. **Enter email & password** → Click "Sign In"
3. **OTP sent to email** (in dev, see Node console)
4. **Enter 6-digit code** from email
5. **Code verified** → Logged in successfully

**Demo mode**: If SMTP not configured, OTP appears in Node backend console logs.

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         Frontend (React + Vite)         │
├─────────────────────────────────────────┤
│ • LandingPage (Get Started scroll)      │
│ • AppointmentChatbot (floating widget)  │
│ • OTPVerification (full-screen form)    │
│ • Auth flow (login + OTP integration)   │
└────────────────┬────────────────────────┘
                 │ API calls
                 ↓
┌─────────────────────────────────────────┐
│   Backend (Node.js + Express)           │
├─────────────────────────────────────────┤
│ • /api/auth/login-with-otp              │
│ • /api/auth/send-otp                    │
│ • /api/auth/verify-otp                  │
│ • /api/chatbot/* (proxy routes)         │
│ • OTP Service (generation, validation)  │
└────────┬──────────────────────────┬─────┘
         │                          │
         ↓                          ↓
    ┌─────────────┐          ┌──────────────────┐
    │  MongoDB    │          │  Python Service  │
    ├─────────────┤          ├──────────────────┤
    │ • Users     │          │ Flask Microapp   │
    │ • Appts     │          │ • Doctor ranking │
    │ • Reviews   │          │ • Slot calc      │
    └─────────────┘          └──────────────────┘
         │                          ↑
         │ Fetch doctors            │
         └──────────────────────────┘
```

---

## Detailed File Changes Summary

### Created Files (12 new files)

1. **`backend/chatbot_service/app.py`** - Flask chatbot service
2. **`backend/chatbot_service/requirements.txt`** - Python dependencies
3. **`backend/chatbot_service/README.md`** - Chatbot documentation
4. **`backend/src/controllers/chatbotController.js`** - Node proxy controller
5. **`backend/src/services/otpService.js`** - OTP generation/validation
6. **`frontend/src/hooks/useAppointmentChatbot.js`** - Chatbot state hook
7. **`frontend/src/components/AppointmentChatbot.jsx`** - Chatbot UI
8. **`frontend/src/components/Auth/OTPVerification.jsx`** - OTP form component

### Modified Files (4 files)

1. **`backend/src/server.js`**
   - Added chatbot routes
   - Imported chatbot controller

2. **`backend/src/routes/auth.js`**
   - Imported OTP service
   - Added 3 new OTP endpoints

3. **`frontend/src/App.jsx`**
   - Added OTP state
   - Imported OTP component + chatbot
   - Updated useAuthHandlers call
   - Render OTP + chatbot

4. **`frontend/src/pages/LandingPage.jsx`**
   - Enhanced Get Started button
   - Added scroll-to-auth function
   - New auth section with cards

5. **`frontend/src/hooks/useAuthHandlers.js`**
   - Updated login handlers for OTP
   - Added OTP completion handler
   - Integrated OTP service

---

## Running Everything Together

### Terminal 1: Python Chatbot Service
```bash
cd backend/chatbot_service
python app.py
# Runs on http://127.0.0.1:5000
```

### Terminal 2: Node Backend
```bash
cd backend
npm install
npm start
# Runs on http://localhost:3000
```

### Terminal 3: Frontend
```bash
cd frontend
npm install  
npm run dev
# Runs on http://localhost:5173
```

---

## Assumptions & Design Decisions

### 1. OTP Delivery
- **Email** (preferred): Uses SMTP configuration
- **SMS**: Structure supports it, but not implemented yet
- **Fallback**: In dev mode, OTP appears in Node console

### 2. Chatbot Conversation State
- Managed **client-side** in React hook
- Python service is **stateless** (only calculates)
- Allows offline conversation preview

### 3. Doctor Ranking
- **Rule-based** scoring (not ML/AI)
- Uses symptom keywords + specialty match
- Expandable by adding more keywords

### 4. Slot Generation
- **30-minute slots** (configurable)
- Respects doctor's working hours
- No past appointments allowed

### 5. OTP Storage
- **In-memory** Map (simple, suitable for demo)
- **Expandable** to Redis for production
- **Auto-cleanup** every 5 minutes

---

## Future Enhancements

### Chatbot
- [ ] Multi-language support
- [ ] Natural language processing (NLP)
- [ ] ML-based doctor matching
- [ ] Conversation persistence (save chat history)
- [ ] Integration with appointment reminders

### OTP
- [ ] SMS OTP support
- [ ] Biometric authentication
- [ ] Redis session store
- [ ] Rate limiting per IP
- [ ] Account lockout after failed attempts

### Landing Page
- [ ] Video tour
- [ ] Testimonials carousel
- [ ] Pricing plans section
- [ ] FAQ section
- [ ] Blog integration

---

## Troubleshooting

### Python Service Returns 404
- Flask service might not be running
- Check `http://127.0.0.1:5000/health`
- Ensure `CHATBOT_SERVICE_URL` env var is set in Node

### OTP Not Sending
- Check SMTP credentials in `.env`
- Enable "Less Secure App Access" for Gmail
- Use App Password instead of actual password
- Check Node console logs for SMTP errors

### Chatbot Shows Empty Suggestions
- Ensure doctors exist in MongoDB with `specialty` field
- Check if symptom exists in `SYMPTOM_SPECIALTY_MAP` in Python app
- Test Python service directly: `curl http://127.0.0.1:5000/health`

### Landing Page Get Started Not Scrolling
- Open browser DevTools console (F12)
- Check for JavaScript errors
- Ensure CSS is loaded (`App.css`)

---

## Performance Considerations

### Chatbot
- Doctor list fetched once per suggestion request
- Python service is lightweight (no DB)
- Add pagination for 100+ doctors

### OTP
- In-memory storage fine for <1000 concurrent users
- Migration to Redis recommended for scale

### Landing Page
- Scroll animation is CSS-based (performant)
- No heavy animations

---

## Security Notes

### OTP
- OTP expires after 10 minutes
- Max 5 verification attempts
- Attempt counter increments per wrong try
- Expired OTPs automatically cleaned up

### Chatbot
- All requests require authentication (patient user)
- Docker appointments use existing API auth
- No sensitive data in conversation

### Frontend
- Token stored in localStorage (XSS note: consider secure cookies for production)
- All API calls include Authorization header

---

## Support & Maintenance

### Monitoring
- Check Python Flask logs for chatbot errors
- Monitor SMTP delivery for OTP
- Track chatbot usage/conversation patterns

### Updates
- Keep Flask dependencies updated
- Regular security audits on OTP service
- Monitor doctor/appointment API changes

---

**End of Implementation Guide**

For detailed API references, see:
- [Chatbot Service README](backend/chatbot_service/README.md)
- [Backend API Routes](backend/src/routes/)
- [Frontend Components](frontend/src/components/)
- [Frontend Hooks](frontend/src/hooks/)
