# Python Chatbot Service Setup Guide

## Overview

The Python Chatbot Service is a Flask-based microservice that handles AI-assisted appointment booking, doctor suggestions, and availability calculations for the Hospital Reservation web app.

## Running the Chatbot Service

### Prerequisites

-Python 3.7+
- Flask 2.3.3
- Flask-CORS 4.0.0

### Installation

1. **Navigate to the chatbot service directory**:
   ```bash
   cd backend/chatbot_service
   ```

2. **Create and activate a virtual environment** (recommended):
   ```bash
   # On Windows
   python -m venv venv
   venv\Scripts\activate

   # On macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

### Running the Service

**Start the Flask server**:
```bash
python app.py
```

The service will start on `http://127.0.0.1:5000` by default.

### Configuration

Set `CHATBOT_SERVICE_URL` in your Node.js backend `.env` file:
```
CHATBOT_SERVICE_URL=http://127.0.0.1:5000
```

If the Node backend cannot reach the Python service, check:
- Flask service is running
- Port 5000 is not blocked by firewall
- Node backend env var is set correctly

## API Endpoints

### 1. Health Check
**GET** `/health`

Verify the service is running.

**Response**:
```json
{
  "status": "ok"
}
```

---

### 2. Suggest Doctors
**POST** `/suggest-doctors`

Returns ranked doctor suggestions based on user's health needs.

**Request Body**:
```json
{
  "doctors": [
    {
      "_id": "patient_id",
      "firstName": "John",
      "lastName": "Doe",
      "specialty": "Cardiology",
      "yearsExperience": 5
    }
  ],
  "query": "I have chest pain",
  "date": "2025-04-15"
}
```

**Response** (200 OK):
```json
{
  "suggestions": [
    {
      "doctorId": "doctor_id_1",
      "firstName": "John",
      "lastName": "Smith",
      "specialty": "Cardiology",
      "yearsExperience": 10,
      "score": 5,
      "inferredSpecialty": "Cardiology",
      "reasoning": "Specialty: Cardiology"
    }
  ]
}
```

---

### 3. Get Available Slots
**POST** `/doctor-slots`

Returns available appointment time slots for a doctor on a specific date.

**Request Body**:
```json
{
  "doctor": {
    "_id": "doctor_id",
    "firstName": "John",
    "lastName": "Smith",
    "workingDays": "monday,tuesday,wednesday,thursday,friday",
    "startTime": "09:00",
    "endTime": "17:00"
  },
  "date": "2025-04-15",
  "bookedTimes": ["09:00", "09:30", "14:00"]
}
```

**Response** (200 OK):
```json
{
  "availableSlots": [
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "14:30",
    "15:00"
  ],
  "message": "Found 6 available slots"
}
```

**Response** (200 OK - No Slots):
```json
{
  "availableSlots": [],
  "message": "No available slots on this date. Doctor may not be working."
}
```

---

## How It Works

### Doctor Ranking Algorithm

The service ranks doctors based on the patient's query using a multi-factor scoring system:

1. **Specialty Match** (+5 points): If doctor's specialty exactly matches inferred specialty
2. **Partial Specialty Match** (+3 points): If any specialty is inferred from the query
3. **Name Keyword Match** (+2 points per keyword): If patient mentions doctor's name
4. **Date Availability** (+1 point): If doctor has available slots on requested date

Example: If patient says "I need a cardiologist", doctors with Cardiology specialty get +5 points.

### Symptom-to-Specialty Mapping

The service includes a predefined symptom-to-specialty mapping:

- **Chest pain, Heart issues** → Cardiology
- **Headache, Migraine** → Neurology  
- **Bone, Joint pain** → Orthopedics
- **Skin rash, Acne** → Dermatology
- **Stomach issues, Acid reflux** → Gastroenterology
- And 50+ more symptom-specialty pairs

### Slot Generation

The service generates 30-minute appointment slots respecting:
- Doctor's working days (e.g., Monday-Friday)
- Working hours (e.g., 9:00 AM - 5:00 PM)
- Already booked appointments
- No past slots (prevents booking in the past)

---

## Troubleshooting

### Python Service Not Found (Node Backend)

If you see "Chatbot service unavailable" error:

1. **Check service is running**:
   ```bash
   curl http://127.0.0.1:5000/health
   ```

2. **Check environment variable**:
   ```bash
   echo $CHATBOT_SERVICE_URL  # On Windows: echo %CHATBOT_SERVICE_URL%
   ```

3. **Check firewall** - Ensure port 5000 is not blocked

4. **Check logs** - Look for errors in Flask console output

### OTP Not Sending

The Python service does NOT handle OTP - that's done by the Node backend. If OTP isn't sending:

1. Check SMTP configuration in Node `.env`:
   ```
   SMTP_HOST=your-smtp-host
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   MAIL_FROM=noreply@healthcare.com
   ```

2. Test SMTP connection from Node backend

### Doctors Not Being Suggested

1. Ensure doctors exist in MongoDB with `specialty` field set
2. Check the symptom keyword is in `SYMPTOM_SPECIALTY_MAP`
3. Add more keywords to the mapping in `app.py` if needed

---

## Development

### Adding New Specialty Mappings

Edit `SYMPTOM_SPECIALTY_MAP` in `app.py`:

```python
SYMPTOM_SPECIALTY_MAP = {
    "your_symptom": "Your Specialty",
    # Add more mappings
}
```

### Changing Slot Duration

Edit the slot generation loop in `build_doctor_slots_for_date()`:

```python
current += 30  # Change from 30 minutes to desired duration
```

### Testing Endpoints

Use curl or Postman to test endpoints:

```bash
# Test health check
curl http://127.0.0.1:5000/health

# Test doctor suggestions
curl -X POST http://127.0.0.1:5000/suggest-doctors \
  -H "Content-Type: application/json" \
  -d '{
    "doctors": [],
    "query": "chest pain"
  }'
```

---

## Notes

- The service is **stateless** - all data comes from MongoDB via the Node backend
- OTP verification is handled by the **Node backend**, not this service  
- The chatbot **conversation state** is managed by the frontend React hook
- This service only provides **ranking** and **slot calculation** logic

---

## Performance Tips

- For large doctor lists (100+), consider adding pagination
- Cache doctor lists in memory if data updates are infrequent
- Use Redis for distributed deployments

---

**For more information, see the main project README.md**
