require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { query } = require("./db");
const authRoutes = require("./routes/auth");
const apptRoutes = require("./routes/appointments");
const usersRoutes = require("./routes/users");
const reviewRoutes = require("./routes/reviewRoutes");
const { startReminderScheduler } = require("./scheduler/reminderScheduler");
const chatbotController = require("./controllers/chatbotController");
const auth = require("./middleware/auth");

const app = express();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/appointments", apptRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/reviews", reviewRoutes);

app.get("/api/chatbot/health", chatbotController.healthCheck);
app.post("/api/chatbot/suggest-doctors", chatbotController.suggestDoctors);
app.get("/api/chatbot/doctors/:doctorId", chatbotController.getDoctorDetails);
app.post("/api/chatbot/doctors/:doctorId/available-slots", chatbotController.getAvailableSlots);
app.get("/api/chatbot/my-appointments", auth, chatbotController.getMyAppointments);

app.get("/api/health", (req, res) => res.json({ ok: true }));

async function startServer() {
  try {
    await query("select 1");
    console.log("Postgres connected");
    startReminderScheduler();
  } catch (error) {
    console.error("Database error:", error);
  }

  app.listen(process.env.PORT || 3000, () => {
    console.log("Server running on port", process.env.PORT || 3000);
  });
}

startServer();
