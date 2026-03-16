const Review = require("../models/Review");
const Appointment = require("../models/Appointment");

const getMyDoctorReviews = async (req, res) => {
  try {
    const doctorId = req.user.userId || req.user.id;

    const reviews = await Review.find({ doctor_id: doctorId })
      .populate("patient_id", "firstName lastName name")
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    console.error("Error fetching doctor reviews:", error);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
};

const createReview = async (req, res) => {
  try {
    const patientId = req.user.userId || req.user.id;

    if (req.user.role !== "patient") {
      return res.status(403).json({ message: "Only patients can leave reviews" });
    }

    const { doctor_id, appointment_id, rating, comment } = req.body;

    if (!doctor_id || !appointment_id || !rating) {
      return res.status(400).json({
        message: "Doctor, appointment, and rating are required",
      });
    }

    const appointment = await Appointment.findById(appointment_id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const appointmentPatientId = appointment.patient_id || appointment.patientId;
    const appointmentDoctorId = appointment.doctor_id || appointment.doctorId;

    if (!appointmentPatientId) {
      return res.status(400).json({
        message: "Appointment patient was not found",
      });
    }

    if (!appointmentDoctorId) {
      return res.status(400).json({
        message: "Appointment doctor was not found",
      });
    }

    if (String(appointmentPatientId) !== String(patientId)) {
      return res.status(403).json({
        message: "You can only review your own appointments",
      });
    }

    if (String(appointmentDoctorId) !== String(doctor_id)) {
      return res.status(400).json({
        message: "Doctor does not match this appointment",
      });
    }

    const existingReview = await Review.findOne({ appointment_id });

    if (existingReview) {
      return res.status(400).json({
        message: "You already reviewed this appointment",
      });
    }

    const review = await Review.create({
      doctor_id,
      patient_id: patientId,
      appointment_id,
      rating,
      comment,
    });

    res.status(201).json({
      message: "Review submitted successfully",
      review,
    });
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ message: "Failed to submit review" });
  }
};

module.exports = {
  getMyDoctorReviews,
  createReview,
};