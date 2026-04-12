import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../API/http";
import AdminTableShell from "../components/AdminTableShell";
import AdminConfirmModal from "../components/AdminConfirmModal";

const DEFAULT_FILTERS = { date: "", status: "", doctorId: "" };

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [pendingCancel, setPendingCancel] = useState(null);
  const [flashedAppointmentId, setFlashedAppointmentId] = useState("");

  async function loadDoctors() {
    try {
      const data = await apiFetch("/admin/doctors");
      setDoctors(Array.isArray(data) ? data : []);
    } catch {
      setDoctors([]);
    }
  }

  async function loadAppointments(nextFilters = filters) {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (nextFilters.date) query.set("date", nextFilters.date);
      if (nextFilters.status) query.set("status", nextFilters.status);
      if (nextFilters.doctorId) query.set("doctorId", nextFilters.doctorId);

      const data = await apiFetch(`/admin/appointments?${query.toString()}`);
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      setNotice({ type: "error", text: err.message || "Failed to load appointments" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDoctors();
    loadAppointments(DEFAULT_FILTERS);
  }, []);

  useEffect(() => {
    if (!flashedAppointmentId) return;
    const timer = setTimeout(() => setFlashedAppointmentId(""), 1300);
    return () => clearTimeout(timer);
  }, [flashedAppointmentId]);

  async function updateAppointment(id, payload, successText) {
    try {
      if (payload.cancelOnly) {
        await apiFetch(`/admin/appointments/${id}/cancel`, { method: "PATCH" });
      } else {
        await apiFetch(`/admin/appointments/${id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
      setNotice({ type: "success", text: successText });
      setFlashedAppointmentId(id);
      loadAppointments();
    } catch (err) {
      setNotice({ type: "error", text: err.message || "Appointment action failed" });
    }
  }

  const columns = useMemo(() => ["Date", "Patient", "Doctor", "Status", "Reason", "Actions"], []);

  return (
    <section style={{ display: "grid", gap: 14 }}>
      {notice.text ? <p className={`admin-banner ${notice.type}`}>{notice.text}</p> : null}

      <div className="admin-card">
        <div className="admin-row">
          <input type="date" className="admin-input" value={filters.date} onChange={(e) => setFilters((p) => ({ ...p, date: e.target.value }))} />
          <select className="admin-select" value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select className="admin-select" value={filters.doctorId} onChange={(e) => setFilters((p) => ({ ...p, doctorId: e.target.value }))}>
            <option value="">All Doctors</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                Dr. {doctor.firstName} {doctor.lastName}
              </option>
            ))}
          </select>
          <button type="button" className="admin-btn primary" onClick={() => loadAppointments(filters)}>Apply Filters</button>
          <button
            type="button"
            className="admin-btn secondary"
            onClick={() => {
              setFilters(DEFAULT_FILTERS);
              loadAppointments(DEFAULT_FILTERS);
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <AdminTableShell
        columns={columns}
        isLoading={loading}
        isEmpty={!loading && appointments.length === 0}
        emptyTitle="No appointments"
        emptyDescription="No appointment records match the selected filters."
      >
        {appointments.map((appointment) => (
          <tr key={appointment.id} className={flashedAppointmentId === appointment.id ? "admin-row-flash" : ""}>
            <td>{appointment.appointmentDate} {appointment.appointmentTime}</td>
            <td>{appointment.patientId?.firstName} {appointment.patientId?.lastName}</td>
            <td>{appointment.doctorId?.firstName} {appointment.doctorId?.lastName}</td>
            <td><span className={`admin-chip ${appointment.status}`}>{appointment.status}</span></td>
            <td>{appointment.reason}</td>
            <td>
              <div className="admin-row">
                <button type="button" className="admin-btn secondary" onClick={() => updateAppointment(appointment.id, { status: "confirmed" }, "Appointment confirmed")}>Confirm</button>
                <button type="button" className="admin-btn secondary" onClick={() => updateAppointment(appointment.id, { status: "completed" }, "Appointment marked as completed")}>Complete</button>
                <button
                  type="button"
                  className="admin-btn danger"
                  onClick={() => setPendingCancel(appointment)}
                >
                  Cancel
                </button>
              </div>
            </td>
          </tr>
        ))}
      </AdminTableShell>

      <AdminConfirmModal
        open={Boolean(pendingCancel)}
        title="Cancel Appointment"
        message={pendingCancel ? `Cancel appointment for ${pendingCancel.patientId?.firstName || "patient"} on ${pendingCancel.appointmentDate}?` : ""}
        confirmLabel="Cancel Appointment"
        onCancel={() => setPendingCancel(null)}
        onConfirm={async () => {
          if (!pendingCancel) return;
          const id = pendingCancel.id;
          setPendingCancel(null);
          await updateAppointment(id, { cancelOnly: true }, "Appointment cancelled");
        }}
      />
    </section>
  );
}
