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

const getMyPatientReviews = async (req, res) => {
  try {
    const patientId = req.user.userId || req.user.id;

    const reviews = await Review.find({ patient_id: patientId })
      .populate("doctor_id", "firstName lastName name")
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
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

    if (appointment.status === "cancelled") {
      return res.status(400).json({ message: "Cannot review a cancelled appointment" });
    }

    if (appointment.status !== "completed") {
      return res.status(400).json({ message: "You can review only completed appointments" });
    }

    const appointmentDate = appointment.appointmentDate || appointment.appointment_date;
    const appointmentTime = appointment.appointmentTime || appointment.appointment_time;
    const appointmentAt = new Date(`${appointmentDate}T${appointmentTime}:00`);
    if (!Number.isNaN(appointmentAt.getTime()) && appointmentAt.getTime() > Date.now()) {
      return res.status(400).json({ message: "You can review only past appointments" });
    }

    const appointmentPatientId = appointment.patient_id || appointment.patientId;
    const appointmentDoctorId = appointment.doctor_id || appointment.doctorId;

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
  getMyPatientReviews,
  createReview,
};