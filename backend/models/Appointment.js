const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    appointmentDate: { type: String, required: true }, // "YYYY-MM-DD"
    appointmentTime: { type: String, required: true }, // "HH:MM"
    reason: { type: String, required: true },
    notes: String,
    status: { type: String, default: "confirmed" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Appointment", appointmentSchema);