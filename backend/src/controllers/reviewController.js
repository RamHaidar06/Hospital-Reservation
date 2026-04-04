const { query } = require("../db");
const { mapReviewRow } = require("../utils/dbMappers");

function getPatientDisplayName(patient) {
  return [patient?.first_name, patient?.last_name].filter(Boolean).join(" ").trim() || "Anonymous Patient";
}

const getMyDoctorReviews = async (req, res) => {
  try {
    const doctorId = req.user.userId || req.user.id;

    const result = await query(
      `select r.*, p.first_name, p.last_name
       from reviews r
       left join users p on p.id = r.patient_id
       where r.doctor_id = $1
       order by r.created_at desc`,
      [doctorId]
    );

    res.status(200).json(
      result.rows.map((review) => {
        const hideFromDoctor = Boolean(review.hide_from_doctor);
        return {
          ...mapReviewRow(review),
          patientDisplayName: hideFromDoctor ? "Anonymous Patient" : getPatientDisplayName(review),
          patient_id: hideFromDoctor ? null : review.patient_id,
        };
      })
    );
  } catch (error) {
    console.error("Error fetching doctor reviews:", error);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
};

const getMyPatientReviews = async (req, res) => {
  try {
    const patientId = req.user.userId || req.user.id;

    const result = await query(
      `select r.*, d.first_name as doctor_first_name, d.last_name as doctor_last_name
       from reviews r
       left join users d on d.id = r.doctor_id
       where r.patient_id = $1
       order by r.created_at desc`,
      [patientId]
    );

    res.status(200).json(
      result.rows.map((review) => ({
        ...mapReviewRow(review),
        doctor_id: {
          id: review.doctor_id,
          firstName: review.doctor_first_name || "",
          lastName: review.doctor_last_name || "",
        },
      }))
    );
  } catch (error) {
    console.error("Error fetching patient reviews:", error);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
};

const createReview = async (req, res) => {
  try {
    const patientId = req.user.userId || req.user.id;

    if (req.user.role !== "patient") {
      return res.status(403).json({ message: "Only patients can leave reviews" });
    }

    const { doctor_id, appointment_id, rating, comment, hidePatientName, hideFromPublic, hideFromDoctor } = req.body;

    if (!doctor_id || !appointment_id || !rating) {
      return res.status(400).json({ message: "Doctor, appointment, and rating are required" });
    }

    const apptResult = await query("select * from appointments where id = $1 limit 1", [appointment_id]);
    const appointment = apptResult.rows[0];
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    if (appointment.status === "cancelled") return res.status(400).json({ message: "Cannot review a cancelled appointment" });
    if (appointment.status !== "completed") return res.status(400).json({ message: "You can review only completed appointments" });

    const appointmentAt = new Date(`${appointment.appointment_date}T${appointment.appointment_time}:00`);
    if (!Number.isNaN(appointmentAt.getTime()) && appointmentAt.getTime() > Date.now()) {
      return res.status(400).json({ message: "You can review only past appointments" });
    }

    if (String(appointment.patient_id) !== String(patientId)) {
      return res.status(403).json({ message: "You can only review your own appointments" });
    }

    if (String(appointment.doctor_id) !== String(doctor_id)) {
      return res.status(400).json({ message: "Doctor does not match this appointment" });
    }

    const existing = await query("select id from reviews where appointment_id = $1 limit 1", [appointment_id]);
    if (existing.rows[0]) {
      return res.status(400).json({ message: "You already reviewed this appointment" });
    }

    const result = await query(
      `insert into reviews (
        doctor_id, patient_id, appointment_id, rating, comment, hide_patient_name, hide_from_public, hide_from_doctor
      ) values ($1,$2,$3,$4,$5,$6,$7,$8)
      returning *`,
      [
        doctor_id,
        patientId,
        appointment_id,
        rating,
        comment || "",
        Boolean(hideFromPublic ?? hidePatientName),
        Boolean(hideFromPublic ?? hidePatientName),
        Boolean(hideFromDoctor),
      ]
    );

    res.status(201).json({
      message: "Review submitted successfully",
      review: mapReviewRow(result.rows[0]),
    });
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ message: "Failed to submit review" });
  }
};

const updateReviewVisibility = async (req, res) => {
  try {
    const patientId = req.user.userId || req.user.id;

    if (req.user.role !== "patient") {
      return res.status(403).json({ message: "Only patients can update review visibility" });
    }

    const { id } = req.params;
    const { hideFromPublic, hideFromDoctor } = req.body;

    const existing = await query("select * from reviews where id = $1 limit 1", [id]);
    const review = existing.rows[0];
    if (!review) return res.status(404).json({ message: "Review not found" });
    if (String(review.patient_id) !== String(patientId)) {
      return res.status(403).json({ message: "You can update only your own reviews" });
    }

    const result = await query(
      `update reviews
       set hide_from_public = $2, hide_patient_name = $2, hide_from_doctor = $3, updated_at = now()
       where id = $1
       returning *`,
      [id, Boolean(hideFromPublic), Boolean(hideFromDoctor)]
    );

    res.status(200).json({
      message: "Review visibility updated",
      review: mapReviewRow(result.rows[0]),
    });
  } catch (error) {
    console.error("Error updating review visibility:", error);
    res.status(500).json({ message: "Failed to update review visibility" });
  }
};

module.exports = {
  getMyDoctorReviews,
  getMyPatientReviews,
  createReview,
  updateReviewVisibility,
};
