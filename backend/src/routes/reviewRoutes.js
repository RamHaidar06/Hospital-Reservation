const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");

const {
  getMyDoctorReviews,
  getMyPatientReviews,
  createReview,
  updateReviewVisibility,
} = require("../controllers/reviewController");

router.get("/doctor", authMiddleware, getMyDoctorReviews);
router.get("/patient", authMiddleware, getMyPatientReviews);
router.post("/", authMiddleware, createReview);
router.patch("/:id/visibility", authMiddleware, updateReviewVisibility);

module.exports = router;
