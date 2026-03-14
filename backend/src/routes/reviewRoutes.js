const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { getMyDoctorReviews, createReview } = require("../controllers/reviewController");

router.get("/doctor/reviews", authMiddleware, getMyDoctorReviews);
router.post("/reviews", authMiddleware, createReview);

module.exports = router;
