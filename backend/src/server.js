require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const apptRoutes = require("./routes/appointments");
const usersRoutes = require("./routes/users");
const reviewRoutes = require("./routes/reviewRoutes");

const { startReminderScheduler } = require("./scheduler/reminderScheduler");

const app = express();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
  })
  .then(() => {
    console.log("MongoDB connected");
    startReminderScheduler();
  })
  .catch((e) => console.error("MongoDB error:", e));

app.use("/api/auth", authRoutes);
app.use("/api/appointments", apptRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/reviews", reviewRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running on port", process.env.PORT || 3000);
});