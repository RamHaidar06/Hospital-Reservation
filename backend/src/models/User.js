const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["patient", "doctor"], required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },

    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },

    // patient optional
    phone: { type: String, default: "" },
    dateOfBirth: { type: String, default: "" },
    address: { type: String, default: "" },

    // doctor optional
    specialty: { type: String, default: "" },
    licenseNumber: { type: String, default: "" },
    yearsExperience: { type: Number, default: 0 },
    bio: { type: String, default: "" },
    workingDays: { type: String, default: "monday,tuesday,wednesday,thursday,friday" },
    startTime: { type: String, default: "09:00" },
    endTime: { type: String, default: "17:00" },
  },
  { timestamps: true }

  
  
);

module.exports = mongoose.model("User", UserSchema);

