# Doctor Approval Workflow - Implementation Guide

## Overview
Doctors must receive admin approval before appearing on the public doctors list and accepting patient appointments.

---

## How It Works

### 1. **Doctor Registration**
When a doctor signs up through the app:
- Status: `approval_status = "pending"` ✓
- They can log in but **cannot see patients or book appointments**
- Message displayed: *"Your doctor account is pending admin approval."*

### 2. **Admin Approval Interface**
Navigate to **Admin Panel → Doctors**

#### Filter Options:
- **Approval Status**: All / Pending / Approved / Rejected
- **Account Status**: All / Active / Inactive
- **Search**: By name, email, or specialty

#### Actions Available per Doctor:
- ✅ **Approve** - Doctor becomes visible to patients
- ❌ **Reject** - Doctor account rejected (can reapply)
- 🔒 **Activate/Deactivate** - Toggle account access
- 📝 **Edit** - Update doctor information
- 🗑️ **Delete** - Remove doctor (must have no active appointments)

### 3. **Patient Perspective**
After approval:
- Doctor appears in the "Book Appointment" page
- Patients can view doctor profile (specialty, experience, bio)
- Patients can book available time slots

### 4. **Approval Status Visibility**
Admin panel shows doctors sorted by:
1. **Pending** (top priority)
2. **Rejected**
3. **Approved**

Each doctor row displays:
- Name, Specialty, Email, Experience
- **Approval Status Chip** (pending/approved/rejected)
- **Account Status** (Active/Inactive)

---

## Database Schema

### User Table - Relevant Fields:
```sql
approval_status  VARCHAR   -- 'pending', 'approved', 'rejected'
is_active        BOOLEAN   -- Account active status
role             VARCHAR   -- 'doctor', 'patient', 'admin'
```

---

## API Endpoints

### For Admin (Protected Route):

**Get all doctors (including pending):**
```
GET /admin/doctors
Returns: All doctors sorted by approval status
```

**Approve a doctor:**
```
PATCH /admin/doctors/:doctorId/approval
Body: { "approvalStatus": "approved" }
```

**Reject a doctor:**
```
PATCH /admin/doctors/:doctorId/approval
Body: { "approvalStatus": "rejected" }
```

**Activate/Deactivate:**
```
PATCH /admin/doctors/:doctorId/activation
Body: { "isActive": true/false }
```

### For Patients (Public Route):

**Get approved doctors only:**
```
GET /api/doctors
Returns: Only doctors where approval_status = 'approved' AND is_active = true
```

---

## Current Status
✅ **Fully Implemented and Working**
- Registration → Pending approval
- Admin interface → Approve/Reject buttons
- Public listing → Only approved doctors visible
- Appointment booking → Validates approval status

---

## Testing the Workflow

1. **Register as Doctor** (Web/App)
   - Account created with `approval_status = "pending"`
   - Doctor sees: "Your doctor account is pending admin approval"
   - Doctor cannot book or view appointments

2. **Admin Visits Doctor Management**
   - Go to: Admin Panel → Doctors
   - Filter: Set "Pending" to see pending doctors
   - Click: "Approve" button

3. **Doctor Logs In Again**
   - Now has full access
   - Appears in patient doctor list
   - Can accept appointments

4. **Alternative: Reject**
   - Admin clicks "Reject"
   - Doctor account status changes to rejected
   - Doctor cannot access system

---

## Important Notes

- Doctors created directly in admin panel are **auto-approved** (for admin convenience)
- Doctors from public signup must be **manually approved** by admin
- Admins can approve/reject multiple times if needed
- Deactivating differs from rejection:
  - **Rejected**: Must be re-approved
  - **Deactivated**: Can be reactivated immediately
