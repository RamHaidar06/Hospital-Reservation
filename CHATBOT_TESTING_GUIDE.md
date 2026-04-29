# Chatbot Fix & Testing Guide

## Issues Fixed

### ✅ Issue 1: Date Parsing
**Problem**: Bot couldn't recognize "April 30 at 12:00 pm" format  
**Fix**: Enhanced `parseNaturalDate()` to handle month+day patterns  
**Status**: FIXED

### ✅ Issue 2: Premature Booking (Symptom Misclassification)
**Problem**: Bot jumped straight to booking when user described symptoms  
**Fix**: 
- Updated Gemini instructions to route symptom descriptions to `doctor_info` intent
- Removed auto-extraction of medical keywords as booking reasons
- Made `isBookingDetailsFollowUp()` stricter

**Status**: FIXED

### ✅ Issue 3: Fallback Behavior Logging
**Problem**: Unclear when/why bot falls back to local extraction  
**Fix**: Added diagnostic logging to see:
- When Gemini client initializes
- When fallback happens and why
- What intent was detected and which engine (Gemini vs Local)

**Status**: IMPLEMENTED

---

## How To Test

### 1. **Check Gemini Health** (No auth required)
```bash
curl http://localhost:3000/api/chatbot/health
```

Expected response:
```json
{
  "geminiApiKey": "✅ Configured",
  "geminiClient": "✅ Initialized",
  "geminiTest": "✅ Working",
  "geminiModel": "gemini-2.5-flash"
}
```

If you see ❌ on any field, Gemini isn't working properly.

---

### 2. **Test Chatbot Endpoint** (Requires JWT auth)
First, get a JWT token by logging in:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@test.com", "password":"password123"}'
```

Then use the token for chatbot tests:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "my blood pressure is high",
    "history": []
  }'
```

---

### 3. **Test Scenarios** (Use above curl with different messages)

#### Scenario A: Symptom Description (Should recommend doctor, NOT jump to booking)
```json
{
  "message": "my blood pressure is increasing and my heart is hurting",
  "history": []
}
```

✅ **Expected**: Intent = `doctor_info`, bot recommends cardiologist  
❌ **Bad**: Intent = `book`, bot asks for booking date immediately

---

#### Scenario B: Date Parsing
```json
{
  "message": "April 30 at 12:00 pm",
  "history": [
    {"role": "assistant", "text": "Which doctor would you like to book with?"},
    {"role": "user", "text": "cardiologist"},
    {"role": "assistant", "text": "Dr. Ahmed Smith. What date would you like?"}
  ]
}
```

✅ **Expected**: Date parsed to `2026-04-30`, time to `12:00`  
❌ **Bad**: "Please provide a future date" error

---

#### Scenario C: Complete Booking Flow
```json
{
  "message": "I want to book an appointment",
  "history": []
}
```
Then in next request:
```json
{
  "message": "with a cardiologist",
  "history": [
    {"role": "assistant", "text": "Which doctor or specialty would you like to book with?"},
    {"role": "user", "text": "I want to book an appointment"}
  ]
}
```

✅ **Expected**: Bot recommends cardiology doctors  
❌ **Bad**: Generic response like "I'm here to help"

---

### 4. **Check Backend Logs**
When running the server, look for these log patterns:

**✅ Good Logs**:
```
✅ Gemini API client initialized successfully
📊 [Intent] "doctor_info" | Engine: "gemini" | Message: "my blood pressure is..."
🤖 Attempting Gemini extraction...
```

**❌ Bad Logs**:
```
⚠️  GEMINI_API_KEY not configured - chatbot will use local fallback only
📊 [Intent] "book" | Engine: "local" | Message: "my blood pressure..."
💬 Using LOCAL fallback (Gemini not available)
⚠️  Gemini API error (falling back to local): 401 API key invalid
```

---

## Fallback Behavior

The chatbot uses this hierarchy:
1. **Gemini API** (if configured & working)
2. **Local fallback** (basic pattern matching)

### When it falls back:
- ❌ Gemini API key not configured
- ❌ Gemini client initialization failed
- ❌ Gemini API call throws error (quota, auth, timeout, etc.)

### Signs of fallback:
- Generic canned responses
- Poor context understanding
- No intelligent recommendations
- Same response patterns

---

## Files Modified

1. **chatbotController.js**
   - Enhanced date parsing: `parseNaturalDate()` now handles "April 30" format
   - Fixed intent extraction: `isBookingDetailsFollowUp()` more strict
   - Removed medical keyword auto-extraction in `extractBookingReasonFromMessage()`
   - Updated Gemini prompt: Symptoms → `doctor_info`, not `book`
   - Added diagnostic logging with emojis
   - Added `healthCheck()` endpoint

2. **server.js**
   - Added GET `/api/chatbot/health` endpoint

---

## Next Steps

1. Run backend: `npm start` or `npm run dev`
2. Check health: `curl http://localhost:3000/api/chatbot/health`
3. Get auth token
4. Run test scenarios above
5. Watch server logs for diagnostic output

If Gemini health check fails, verify:
- ✅ GEMINI_API_KEY is set in .env
- ✅ API key is valid (check Google AI Studio)
- ✅ Network connection available
- ✅ API quota not exceeded
