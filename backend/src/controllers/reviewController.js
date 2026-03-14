const Review = require("../models/Review");

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

    const { doctor_id, rating, comment } = req.body;

    if (!doctor_id || !rating) {
      return res.status(400).json({ message: "Doctor and rating are required" });
    }

    const existingReview = await Review.findOne({
      doctor_id,
      patient_id: patientId,
    });

    if (existingReview) {
      return res.status(400).json({ message: "You already reviewed this doctor" });
    }

    const review = await Review.create({
      doctor_id,
      patient_id: patientId,
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
