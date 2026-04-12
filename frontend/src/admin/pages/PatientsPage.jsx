import { useEffect, useState } from "react";
import { apiFetch } from "../../API/http";
import AdminTableShell from "../components/AdminTableShell";
import AdminLoadingState from "../components/AdminLoadingState";

export default function PatientsPage() {
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [notice, setNotice] = useState({ type: "", text: "" });

  async function loadPatients(searchValue = "") {
    setLoading(true);
    try {
      const data = await apiFetch(`/admin/patients?q=${encodeURIComponent(searchValue)}`);
      setPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      setNotice({ type: "error", text: err.message || "Failed to load patients" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatients();
  }, []);

  async function viewPatient(patientId) {
    setDetailsLoading(true);
    try {
      const data = await apiFetch(`/admin/patients/${patientId}`);
      setSelectedPatient(data);
    } catch (err) {
      setNotice({ type: "error", text: err.message || "Failed to load patient details" });
    } finally {
      setDetailsLoading(false);
    }
  }

  return (
    <section style={{ display: "grid", gap: 14 }}>
      {notice.text ? <p className={`admin-banner ${notice.type}`}>{notice.text}</p> : null}

      <div className="admin-card">
        <div className="admin-row">
          <input
            className="admin-input"
            placeholder="Search by name, email, phone"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ minWidth: 320 }}
          />
          <button type="button" className="admin-btn primary" onClick={() => loadPatients(query)}>Search</button>
          <button type="button" className="admin-btn secondary" onClick={() => { setQuery(""); loadPatients(""); }}>Reset</button>
        </div>
      </div>

      <AdminTableShell
        columns={["Patient", "Email", "Phone", "Created", "Actions"]}
        isLoading={loading}
        isEmpty={!loading && patients.length === 0}
        emptyTitle="No patients found"
        emptyDescription="Try a different search keyword."
      >
        {patients.map((patient) => (
          <tr key={patient.id}>
            <td>{patient.firstName} {patient.lastName}</td>
            <td>{patient.email}</td>
            <td>{patient.phone || "-"}</td>
            <td>{patient.createdAt ? String(patient.createdAt).slice(0, 10) : "-"}</td>
            <td>
              <button type="button" className="admin-btn secondary" onClick={() => viewPatient(patient.id)}>
                View Details
              </button>
            </td>
          </tr>
        ))}
      </AdminTableShell>

      <div className="admin-card">
        <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: "1.1rem" }}>Patient Details</h3>
        {detailsLoading ? (
          <AdminLoadingState label="Loading patient details..." />
        ) : selectedPatient ? (
          <div style={{ display: "grid", gap: 8 }}>
            <p style={{ margin: 0 }}><strong>Name:</strong> {selectedPatient.patient.firstName} {selectedPatient.patient.lastName}</p>
            <p style={{ margin: 0 }}><strong>Email:</strong> {selectedPatient.patient.email}</p>
            <p style={{ margin: 0 }}><strong>Phone:</strong> {selectedPatient.patient.phone || "-"}</p>
            <p style={{ margin: 0 }}><strong>Appointments:</strong> {selectedPatient.appointments?.length || 0}</p>

            <div className="admin-table-wrap" style={{ marginTop: 8 }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Doctor</th>
                    <th>Status</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedPatient.appointments || []).slice(0, 8).map((appointment) => (
                    <tr key={appointment.id}>
                      <td>{appointment.appointmentDate} {appointment.appointmentTime}</td>
                      <td>{appointment.doctorId?.firstName} {appointment.doctorId?.lastName}</td>
                      <td><span className={`admin-chip ${appointment.status}`}>{appointment.status}</span></td>
                      <td>{appointment.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="admin-muted" style={{ margin: 0 }}>Select a patient to view details.</p>
        )}
      </div>
    </section>
  );
}
