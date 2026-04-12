const express = require("express");

const auth = require("../middleware/auth");
const { query } = require("../db");
const { mapUserRow } = require("../utils/dbMappers");

const router = express.Router();

router.get("/doctors", async (req, res) => {
  try {
    const doctorsResult = await query(
      `select *
       from users
       where role = 'doctor' and is_active = true and approval_status = 'approved'
       order by created_at desc`
    );

    const reviewsResult = await query(
      `select r.*, p.first_name as patient_first_name, p.last_name as patient_last_name
       from reviews r
       join users p on p.id = r.patient_id
       order by r.created_at desc`
    );

    const ratingsByDoctor = new Map();
    const reviewsByDoctor = new Map();

    for (const review of reviewsResult.rows) {
      const doctorId = String(review.doctor_id);
      const ratingBucket = ratingsByDoctor.get(doctorId) || { total: 0, count: 0 };
      ratingBucket.total += Number(review.rating || 0);
      ratingBucket.count += 1;
      ratingsByDoctor.set(doctorId, ratingBucket);

      const hideFromPublic = Boolean(review.hide_from_public ?? review.hide_patient_name);
      const patientName = hideFromPublic
        ? "Anonymous Patient"
        : [review.patient_first_name, review.patient_last_name].filter(Boolean).join(" ").trim() || "Anonymous Patient";

      if (!reviewsByDoctor.has(doctorId)) {
        reviewsByDoctor.set(doctorId, []);
      }

      reviewsByDoctor.get(doctorId).push({
        id: review.id,
        rating: Number(review.rating),
        comment: review.comment || "",
        patientName,
        hideFromPublic,
        hideFromDoctor: Boolean(review.hide_from_doctor),
        createdAt: review.created_at,
      });
    }

    res.json(
      doctorsResult.rows.map((doctor) => {
        const summary = ratingsByDoctor.get(String(doctor.id)) || { total: 0, count: 0 };
        return {
          ...mapUserRow(doctor),
          averageRating: summary.count ? Number((summary.total / summary.count).toFixed(1)) : 0,
          reviewCount: summary.count,
          publicReviews: reviewsByDoctor.get(String(doctor.id)) || [],
        };
      })
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    const result = await query("select * from users where id = $1 limit 1", [req.user.userId]);
    if (!result.rows[0]) return res.status(404).json({ message: "User not found" });
    res.json(mapUserRow(result.rows[0]));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
