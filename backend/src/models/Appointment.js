const mongoose = require("mongoose");

const AppointmentSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    doctorId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    appointmentDate: { type: String, required: true },
    appointmentTime: { type: String, required: true },

    reason: { type: String, required: true },
    notes:  { type: String, default: "" },

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },

    // Set once the 24-hour reminder has been sent — prevents duplicates
    reminderSentAt: { type: Date, default: null },

    // Visit Summary (doctor-only write, both roles read)
    visitSummary:          { type: String, default: "" },
    visitSummaryUpdatedAt: { type: Date,   default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Appointment", AppointmentSchema);
