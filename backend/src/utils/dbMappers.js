function mapUserRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    role: row.role,
    email: row.email,
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    phone: row.phone || "",
    dateOfBirth: row.date_of_birth || "",
    address: row.address || "",
    specialty: row.specialty || "",
    licenseNumber: row.license_number || "",
    yearsExperience: Number(row.years_experience || 0),
    bio: row.bio || "",
    isActive: row.is_active !== undefined ? Boolean(row.is_active) : true,
    approvalStatus: row.approval_status || "approved",
    workingDays: row.working_days || "",
    startTime: row.start_time || "",
    endTime: row.end_time || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAppointmentRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    patientId: row.patient_id,
    doctorId: row.doctor_id,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time,
    reason: row.reason,
    notes: row.notes || "",
    status: row.status,
    reminderSentAt: row.reminder_sent_at,
    visitSummary: row.visit_summary || "",
    visitSummaryUpdatedAt: row.visit_summary_updated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapReviewRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    doctor_id: row.doctor_id,
    patient_id: row.patient_id,
    appointment_id: row.appointment_id,
    rating: Number(row.rating),
    comment: row.comment || "",
    hidePatientName: Boolean(row.hide_patient_name),
    hideFromPublic: Boolean(row.hide_from_public),
    hideFromDoctor: Boolean(row.hide_from_doctor),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function attachAppointmentUsers(row) {
  return {
    ...mapAppointmentRow(row),
    patientId: row.patient_id
      ? {
          id: row.patient_id,
          firstName: row.patient_first_name || "",
          lastName: row.patient_last_name || "",
          email: row.patient_email || "",
        }
      : null,
    doctorId: row.doctor_id
      ? {
          id: row.doctor_id,
          firstName: row.doctor_first_name || "",
          lastName: row.doctor_last_name || "",
          email: row.doctor_email || "",
          specialty: row.doctor_specialty || "",
          yearsExperience: Number(row.doctor_years_experience || 0),
        }
      : null,
  };
}

module.exports = {
  mapUserRow,
  mapAppointmentRow,
  mapReviewRow,
  attachAppointmentUsers,
};
