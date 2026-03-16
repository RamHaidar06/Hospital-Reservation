const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");

const {
  getMyDoctorReviews,
  getMyPatientReviews,
  createReview,
} = require("../controllers/reviewController");

router.get("/doctor", authMiddleware, getMyDoctorReviews);
router.get("/patient", authMiddleware, getMyPatientReviews);
router.post("/", authMiddleware, createReview);

module.exports = router;