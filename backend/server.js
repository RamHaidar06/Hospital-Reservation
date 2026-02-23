require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const apptRoutes = require("./routes/appointments");
const usersRoutes = require("./routes/users"); // we will add this

const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((e) => console.error("MongoDB error:", e));

app.use("/api/auth", authRoutes);
app.use("/api/appointments", apptRoutes);
app.use("/api/users", usersRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(process.env.PORT || 3000, () => console.log("Server running"));