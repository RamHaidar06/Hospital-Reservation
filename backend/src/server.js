require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { query } = require("./db");
const authRoutes = require("./routes/auth");
const apptRoutes = require("./routes/appointments");
const usersRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");
const reviewRoutes = require("./routes/reviewRoutes");
const { startReminderScheduler } = require("./scheduler/reminderScheduler");
const chatbotController = require("./controllers/chatbotController");
const auth = require("./middleware/auth");

const app = express();

async function ensureUserModerationColumns() {
  await query("alter table users add column if not exists is_active boolean not null default true");
  await query("alter table users add column if not exists approval_status text not null default 'approved'");
  await query(
    `do $$
     begin
       if not exists (
         select 1
         from pg_constraint
         where conname = 'users_approval_status_check'
       ) then
         alter table users
         add constraint users_approval_status_check
         check (approval_status in ('pending','approved','rejected'));
       end if;
     end
     $$`
  );
}

async function ensurePasswordResetTable() {
  await query(
    `create table if not exists password_reset_tokens (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      token_hash text not null,
      expires_at timestamptz not null,
      used_at timestamptz,
      created_at timestamptz not null default now()
    )`
  );
  await query("create index if not exists idx_password_reset_tokens_hash on password_reset_tokens(token_hash)");
  await query("create index if not exists idx_password_reset_tokens_user_id on password_reset_tokens(user_id)");
}

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/appointments", apptRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reviews", reviewRoutes);

app.post("/api/chatbot/suggest-doctors", chatbotController.suggestDoctors);
app.get("/api/chatbot/doctors/:doctorId", chatbotController.getDoctorDetails);
app.post("/api/chatbot/doctors/:doctorId/available-slots", chatbotController.getAvailableSlots);
app.get("/api/chatbot/my-appointments", auth, chatbotController.getMyAppointments);
app.post("/api/chat", auth, chatbotController.chatWithGemini);

app.get("/api/health", (req, res) => res.json({ ok: true }));

async function startServer() {
  try {
    await ensureUserModerationColumns();
    await ensurePasswordResetTable();
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
