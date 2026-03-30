const mongoose = require("mongoose");

const TrustedDeviceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["patient", "doctor"], required: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    userAgent: { type: String, default: "" },
    lastUsedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TrustedDevice", TrustedDeviceSchema);
