"""
Python Flask service for Hospital AI Chatbot
Handles doctor suggestions, appointment slot calculations, and conversation logic
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import re

app = Flask(__name__)
CORS(app)

# ============================================================
# SYMPTOM TO SPECIALTY MAPPING
# ============================================================
SYMPTOM_SPECIALTY_MAP = {
    # Cardiology
    "chest": "Cardiology", "heart": "Cardiology", "cardiac": "Cardiology",
    "palpitation": "Cardiology", "arrhythmia": "Cardiology", "hypertension": "Cardiology",
    
    # Neurology
    "headache": "Neurology", "migraine": "Neurology", "dizziness": "Neurology",
    "seizure": "Neurology", "stroke": "Neurology", "parkinson": "Neurology",
    "vertigo": "Neurology", "neuropathy": "Neurology",
    
    # Orthopedics
    "bone": "Orthopedics", "fracture": "Orthopedics", "joint": "Orthopedics",
    "arthritis": "Orthopedics", "knee": "Orthopedics", "spine": "Orthopedics",
    "back pain": "Orthopedics", "shoulder": "Orthopedics",
    
    # Dermatology
    "skin": "Dermatology", "rash": "Dermatology", "acne": "Dermatology",
    "eczema": "Dermatology", "psoriasis": "Dermatology", "mole": "Dermatology",
    
    # Gastroenterology
    "stomach": "Gastroenterology", "digestive": "Gastroenterology", "acid": "Gastroenterology",
    "gerd": "Gastroenterology", "ibs": "Gastroenterology", "ulcer": "Gastroenterology",
    "nausea": "Gastroenterology", "diarrhea": "Gastroenterology",
    
    # Pulmonology
    "lung": "Pulmonology", "asthma": "Pulmonology", "cough": "Pulmonology",
    "breathing": "Pulmonology", "respiratory": "Pulmonology", "bronchitis": "Pulmonology",
    
    # Endocrinology
    "diabetes": "Endocrinology", "thyroid": "Endocrinology", "hormone": "Endocrinology",
    "metabolic": "Endocrinology",
    
    # Psychiatry
    "depression": "Psychiatry", "anxiety": "Psychiatry", "mental": "Psychiatry",
    "stress": "Psychiatry", "bipolar": "Psychiatry", "ocd": "Psychiatry",
    
    # Ophthalmology
    "eye": "Ophthalmology", "vision": "Ophthalmology", "glaucoma": "Ophthalmology",
    "cataract": "Ophthalmology", "sight": "Ophthalmology",
}

# ============================================================
# UTILITY FUNCTIONS
# ============================================================

def tokenize(text):
    """Tokenize and normalize text."""
    if not text:
        return []
    text = text.lower()
    # Remove special chars but keep spaces and alphanumeric
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    return [t for t in text.split() if t]

def infer_specialties_from_need(text):
    """Infer medical specialties from user input."""
    if not text:
        return set()
    
    tokens = tokenize(text)
    inferred = set()
    
    for token in tokens:
        if token in SYMPTOM_SPECIALTY_MAP:
            inferred.add(SYMPTOM_SPECIALTY_MAP[token])
    
    return inferred

def to_minute_of_day(time_str):
    """Convert HH:MM to minutes since midnight."""
    try:
        h, m = map(int, time_str.split(":"))
        return h * 60 + m
    except:
        return 0

def is_valid_date(date_str):
    """Check if date string is valid YYYY-MM-DD."""
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return True
    except:
        return False

def build_doctor_slots_for_date(doctor, target_date, booked_times=None):
    """
    Generate 30-minute appointment slots for a doctor on a given date.
    Respects working days, working hours, and booked appointments.
    
    Args:
        doctor: dict with fields {workingDays, startTime, endTime}
        target_date: str in YYYY-MM-DD format
        booked_times: list of booked time strings e.g. ["09:00", "09:30"]
    
    Returns:
        list of available time strings e.g. ["09:30", "10:00", ...]
    """
    if booked_times is None:
        booked_times = []
    
    # Validate date
    if not is_valid_date(target_date):
        return []
    
    # Check working day
    appointment_date = datetime.strptime(target_date, "%Y-%m-%d")
    day_name = appointment_date.strftime("%A").lower()
    working_days = doctor.get("workingDays", "").lower().split(",")
    working_days = [d.strip() for d in working_days]
    
    if day_name not in working_days:
        return []
    
    # Check if date is in past (don't allow past appointments)
    today = datetime.now().date()
    if appointment_date.date() < today:
        return []
    
    # Parse working hours
    start_time = doctor.get("startTime", "09:00")
    end_time = doctor.get("endTime", "17:00")
    
    start_min = to_minute_of_day(start_time)
    end_min = to_minute_of_day(end_time)
    
    # Generate 30-minute slots
    slots = []
    current = start_min
    while current < end_min:
        hours = current // 60
        minutes = current % 60
        slot_time = f"{hours:02d}:{minutes:02d}"
        
        # Only add if not booked
        if slot_time not in booked_times:
            slots.append(slot_time)
        
        current += 30  # 30-minute slots
    
    return slots

def score_doctor(doctor, query_text, booked_appointments):
    """
    Score and rank a doctor based on relevance to query.
    
    Score factors:
    - Specialty match: +5
    - Inferred specialty match: +3
    - Name keyword match: +2 per match
    - Has available slot: +1
    
    Returns:
        (score, inferred_specialty) tuple
    """
    score = 0
    inferred_specialty = None
    
    # Factor 1: Direct specialty match
    doctor_specialty = doctor.get("specialty", "").lower()
    inferred = infer_specialties_from_need(query_text)
    
    if doctor_specialty in inferred:
        score += 5
        inferred_specialty = doctor_specialty
    elif inferred:
        # Partial match: got some specialty inference
        score += 3
        inferred_specialty = list(inferred)[0]
    
    # Factor 2: Name keyword match
    doctor_name = (doctor.get("firstName", "") + " " + doctor.get("lastName", "")).lower()
    tokens = tokenize(query_text)
    for token in tokens:
        if token in doctor_name:
            score += 2
    
    return score, inferred_specialty

# ============================================================
# FLASK ROUTES
# ============================================================

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "ok"}), 200

@app.route("/suggest-doctors", methods=["POST"])
def suggest_doctors():
    """
    Suggest doctors based on user need/query.
    
    Expected body:
    {
        "doctors": [{doctor objects}],
        "query": "what i need",
        "need": "specialty or symptom",
        "date": "YYYY-MM-DD" (optional)
    }
    
    Returns:
        {
            "suggestions": [
                {
                    "doctorId": "...",
                    "firstName": "...",
                    "lastName": "...",
                    "specialty": "...",
                    "score": N,
                    "reasoning": "..."
                },
                ...
            ]
        }
    """
    try:
        data = request.json or {}
        doctors = data.get("doctors", [])
        query = data.get("query", "") or data.get("need", "")
        target_date = data.get("date", "")
        
        if not doctors:
            return jsonify({"suggestions": []}), 200
        
        # Score each doctor
        ranked = []
        for doc in doctors:
            doc_id = doc.get("_id") or doc.get("id")
            score, inferred = score_doctor(doc, query, [])
            
            ranked.append({
                "doctorId": str(doc_id),
                "firstName": doc.get("firstName", ""),
                "lastName": doc.get("lastName", ""),
                "specialty": doc.get("specialty", ""),
                "yearsExperience": doc.get("yearsExperience", 0),
                "score": score,
                "inferredSpecialty": inferred,
                "reasoning": f"Specialty: {inferred or 'General'}" if score > 0 else "General match"
            })
        
        # Sort by score descending
        ranked.sort(key=lambda x: x["score"], reverse=True)
        
        # Return top 5
        return jsonify({"suggestions": ranked[:5]}), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/doctor-slots", methods=["POST"])
def doctor_slots():
    """
    Get available appointment slots for a doctor on a specific date.
    
    Expected body:
    {
        "doctor": {doctor object},
        "date": "YYYY-MM-DD",
        "bookedTimes": ["09:00", "09:30", ...]  (optional)
    }
    
    Returns:
        {
            "availableSlots": ["10:00", "10:30", ...],
            "message": "..."
        }
    """
    try:
        data = request.json or {}
        doctor = data.get("doctor", {})
        date = data.get("date", "")
        booked_times = data.get("bookedTimes", [])
        
        if not doctor or not date:
            return jsonify({"availableSlots": [], "message": "Missing doctor or date"}), 400
        
        slots = build_doctor_slots_for_date(doctor, date, booked_times)
        
        if not slots:
            return jsonify({
                "availableSlots": [],
                "message": "No available slots on this date. Doctor may not be working."
            }), 200
        
        return jsonify({
            "availableSlots": slots,
            "message": f"Found {len(slots)} available slots"
        }), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
