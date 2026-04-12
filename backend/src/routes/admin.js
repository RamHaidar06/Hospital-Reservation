const express = require("express");
const bcrypt = require("bcrypt");

const auth = require("../middleware/auth");
const { query } = require("../db");
const { mapUserRow, attachAppointmentUsers } = require("../utils/dbMappers");

const router = express.Router();
const TODAY_ISO = () => new Date().toISOString().slice(0, 10);

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  return next();
}

async function ensureSystemSettingsTable() {
  await query(
    `create table if not exists system_settings (
      key text primary key,
      value text not null default '',
      updated_at timestamptz default now()
    )`
  );
}

async function loadSystemSettings() {
  await ensureSystemSettingsTable();

  const result = await query("select key, value from system_settings");
  const map = Object.fromEntries(result.rows.map((row) => [row.key, row.value]));

  return {
    clinicName: map.clinicName || process.env.CLINIC_NAME || "MediCare",
    supportEmail: map.supportEmail || process.env.SUPPORT_EMAIL || "support@medicare.local",
    allowNewRegistrations: (map.allowNewRegistrations || "true") === "true",
    defaultAppointmentDuration: Number(map.defaultAppointmentDuration || "30"),
  };
}

router.use(auth, requireAdmin);

router.get("/dashboard", async (req, res) => {
  try {
    const today = TODAY_ISO();
    const [doctors, patients, appointments, todayAppointments, cancelledAppointments] = await Promise.all([
      query("select count(*)::int as count from users where role = 'doctor'"),
      query("select count(*)::int as count from users where role = 'patient'"),
      query("select count(*)::int as count from appointments"),
      query("select count(*)::int as count from appointments where appointment_date = $1", [today]),
      query("select count(*)::int as count from appointments where status = 'cancelled'"),
    ]);

    res.json({
      totalDoctors: doctors.rows[0]?.count || 0,
      totalPatients: patients.rows[0]?.count || 0,
      totalAppointments: appointments.rows[0]?.count || 0,
      todaysAppointments: todayAppointments.rows[0]?.count || 0,
      cancelledAppointments: cancelledAppointments.rows[0]?.count || 0,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/doctors", async (req, res) => {
  try {
    const result = await query(
      `select * from users
       where role = 'doctor'
       order by
         case approval_status when 'pending' then 0 when 'rejected' then 1 else 2 end,
         created_at desc`
    );

    res.json(result.rows.map(mapUserRow));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/doctors", async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      specialty,
      licenseNumber,
      yearsExperience,
      bio,
      workingDays,
      startTime,
      endTime,
    } = req.body;

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ message: "Email, first name and last name are required" });
    }

    const existing = await query("select id from users where email = $1 limit 1", [String(email).trim().toLowerCase()]);
    if (existing.rows[0]) {
      return res.status(409).json({ message: "A user with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(String(password || "Doctor@123"), 10);

    const result = await query(
      `insert into users (
         role, email, password_hash, first_name, last_name,
         specialty, license_number, years_experience, bio, is_active, approval_status,
         working_days, start_time, end_time
       ) values (
         'doctor', $1, $2, $3, $4,
         $5, $6, $7, $8, $9, $10,
         $11, $12, $13
       )
       returning *`,
      [
        String(email).trim().toLowerCase(),
        passwordHash,
        firstName || "",
        lastName || "",
        specialty || "General Medicine",
        licenseNumber || "",
        Number.isFinite(+yearsExperience) ? +yearsExperience : 0,
        bio || "",
        true,
        "approved",
        workingDays || "monday,tuesday,wednesday,thursday,friday",
        startTime || "09:00",
        endTime || "17:00",
      ]
    );

    res.status(201).json(mapUserRow(result.rows[0]));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.patch("/doctors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {
      first_name: req.body.firstName,
      last_name: req.body.lastName,
      email: req.body.email ? String(req.body.email).trim().toLowerCase() : undefined,
      specialty: req.body.specialty,
      license_number: req.body.licenseNumber,
      years_experience: req.body.yearsExperience !== undefined ? Number(req.body.yearsExperience || 0) : undefined,
      bio: req.body.bio,
      working_days: req.body.workingDays,
      start_time: req.body.startTime,
      end_time: req.body.endTime,
    };

    const pairs = Object.entries(updates).filter(([, value]) => value !== undefined);
    if (!pairs.length) {
      const current = await query("select * from users where id = $1 and role = 'doctor' limit 1", [id]);
      if (!current.rows[0]) return res.status(404).json({ message: "Doctor not found" });
      return res.json(mapUserRow(current.rows[0]));
    }

    const setClause = pairs.map(([key], index) => `${key} = $${index + 2}`).join(", ");
    const params = [id, ...pairs.map(([, value]) => value)];

    const result = await query(
      `update users
       set ${setClause}, updated_at = now()
       where id = $1 and role = 'doctor'
       returning *`,
      params
    );

    if (!result.rows[0]) return res.status(404).json({ message: "Doctor not found" });
    res.json(mapUserRow(result.rows[0]));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.patch("/doctors/:id/activation", async (req, res) => {
  try {
    const { id } = req.params;
    const isActive = req.body.isActive;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be boolean" });
    }

    const result = await query(
      `update users
       set is_active = $2, updated_at = now()
       where id = $1 and role = 'doctor'
       returning *`,
      [id, isActive]
    );

    if (!result.rows[0]) return res.status(404).json({ message: "Doctor not found" });
    res.json({ message: isActive ? "Doctor account activated" : "Doctor account deactivated", doctor: mapUserRow(result.rows[0]) });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.patch("/doctors/:id/approval", async (req, res) => {
  try {
    const { id } = req.params;
    const approvalStatus = String(req.body.approvalStatus || "").toLowerCase();

    if (!["approved", "rejected", "pending"].includes(approvalStatus)) {
      return res.status(400).json({ message: "approvalStatus must be pending, approved, or rejected" });
    }

    const result = await query(
      `update users
       set approval_status = $2, updated_at = now()
       where id = $1 and role = 'doctor'
       returning *`,
      [id, approvalStatus]
    );

    if (!result.rows[0]) return res.status(404).json({ message: "Doctor not found" });
    res.json({ message: `Doctor marked as ${approvalStatus}`, doctor: mapUserRow(result.rows[0]) });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.delete("/doctors/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const appts = await query(
      "select count(*)::int as count from appointments where doctor_id = $1 and status <> 'cancelled'",
      [id]
    );

    if ((appts.rows[0]?.count || 0) > 0) {
      return res.status(409).json({ message: "Cannot delete a doctor with active appointments" });
    }

    const result = await query("delete from users where id = $1 and role = 'doctor' returning id", [id]);
    if (!result.rows[0]) return res.status(404).json({ message: "Doctor not found" });

    res.json({ message: "Doctor deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/patients", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();

    const result = await query(
      `select *
       from users
       where role = 'patient'
         and (
           $1 = ''
           or lower(first_name) like $2
           or lower(last_name) like $2
           or lower(email) like $2
           or phone like $2
         )
       order by created_at desc`,
      [q, `%${q}%`]
    );

    res.json(result.rows.map(mapUserRow));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/patients/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await query("select * from users where id = $1 and role = 'patient' limit 1", [id]);
    if (!user.rows[0]) return res.status(404).json({ message: "Patient not found" });

    const appointments = await query(
      `select a.*,
              d.first_name as doctor_first_name,
              d.last_name as doctor_last_name,
              d.email as doctor_email,
              d.specialty as doctor_specialty,
              d.years_experience as doctor_years_experience
       from appointments a
       left join users d on d.id = a.doctor_id
       where a.patient_id = $1
       order by a.appointment_date desc, a.appointment_time desc
       limit 30`,
      [id]
    );

    res.json({
      patient: mapUserRow(user.rows[0]),
      appointments: appointments.rows.map((row) =>
        attachAppointmentUsers({
          ...row,
          patient_id: id,
          patient_first_name: user.rows[0].first_name,
          patient_last_name: user.rows[0].last_name,
          patient_email: user.rows[0].email,
        })
      ),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/appointments", async (req, res) => {
  try {
    const status = String(req.query.status || "").trim().toLowerCase();
    const date = String(req.query.date || "").trim();
    const doctorId = String(req.query.doctorId || "").trim();

    const result = await query(
      `select a.*,
              p.first_name as patient_first_name, p.last_name as patient_last_name, p.email as patient_email,
              d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.email as doctor_email,
              d.specialty as doctor_specialty, d.years_experience as doctor_years_experience
       from appointments a
       left join users p on p.id = a.patient_id
       left join users d on d.id = a.doctor_id
       where ($1 = '' or a.status = $1)
         and ($2 = '' or a.appointment_date = $2)
         and ($3 = '' or a.doctor_id::text = $3)
       order by a.appointment_date desc, a.appointment_time desc`,
      [status, date, doctorId]
    );

    res.json(result.rows.map(attachAppointmentUsers));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.patch("/appointments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {
      status: req.body.status,
      appointment_date: req.body.appointmentDate,
      appointment_time: req.body.appointmentTime,
      doctor_id: req.body.doctorId,
      reason: req.body.reason,
      notes: req.body.notes,
    };

    const pairs = Object.entries(updates).filter(([, value]) => value !== undefined);
    if (!pairs.length) {
      return res.status(400).json({ message: "No update fields provided" });
    }

    const setClause = pairs.map(([key], index) => `${key} = $${index + 2}`).join(", ");
    const params = [id, ...pairs.map(([, value]) => value)];

    const result = await query(
      `update appointments
       set ${setClause}, updated_at = now()
       where id = $1
       returning *`,
      params
    );

    if (!result.rows[0]) return res.status(404).json({ message: "Appointment not found" });

    const expanded = await query(
      `select a.*,
              p.first_name as patient_first_name, p.last_name as patient_last_name, p.email as patient_email,
              d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.email as doctor_email,
              d.specialty as doctor_specialty, d.years_experience as doctor_years_experience
       from appointments a
       left join users p on p.id = a.patient_id
       left join users d on d.id = a.doctor_id
       where a.id = $1
       limit 1`,
      [id]
    );

    res.json({ message: "Appointment updated", appointment: attachAppointmentUsers(expanded.rows[0]) });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.patch("/appointments/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `update appointments
       set status = 'cancelled', updated_at = now()
       where id = $1
       returning id`,
      [id]
    );

    if (!result.rows[0]) return res.status(404).json({ message: "Appointment not found" });
    res.json({ message: "Appointment cancelled" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/settings", async (req, res) => {
  try {
    const adminResult = await query("select * from users where id = $1 and role = 'admin' limit 1", [req.user.userId]);
    const settings = await loadSystemSettings();

    if (!adminResult.rows[0]) {
      return res.status(404).json({ message: "Admin profile not found" });
    }

    res.json({ profile: mapUserRow(adminResult.rows[0]), settings });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.patch("/settings/profile", async (req, res) => {
  try {
    const updates = {
      first_name: req.body.firstName,
      last_name: req.body.lastName,
      phone: req.body.phone,
      address: req.body.address,
    };

    const pairs = Object.entries(updates).filter(([, value]) => value !== undefined);
    if (!pairs.length) {
      const current = await query("select * from users where id = $1 and role = 'admin' limit 1", [req.user.userId]);
      if (!current.rows[0]) return res.status(404).json({ message: "Admin profile not found" });
      return res.json(mapUserRow(current.rows[0]));
    }

    const setClause = pairs.map(([key], index) => `${key} = $${index + 2}`).join(", ");
    const params = [req.user.userId, ...pairs.map(([, value]) => value)];

    const result = await query(
      `update users
       set ${setClause}, updated_at = now()
       where id = $1 and role = 'admin'
       returning *`,
      params
    );

    if (!result.rows[0]) return res.status(404).json({ message: "Admin profile not found" });
    res.json(mapUserRow(result.rows[0]));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.patch("/settings/system", async (req, res) => {
  try {
    await ensureSystemSettingsTable();

    const input = {
      clinicName: req.body.clinicName,
      supportEmail: req.body.supportEmail,
      allowNewRegistrations: req.body.allowNewRegistrations,
      defaultAppointmentDuration: req.body.defaultAppointmentDuration,
    };

    const entries = Object.entries(input).filter(([, value]) => value !== undefined);
    for (const [key, value] of entries) {
      await query(
        `insert into system_settings (key, value, updated_at)
         values ($1, $2, now())
         on conflict (key)
         do update set value = excluded.value, updated_at = now()`,
        [key, String(value)]
      );
    }

    const settings = await loadSystemSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
