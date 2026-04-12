import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../API/http";
import AdminTableShell from "../components/AdminTableShell";
import AdminConfirmModal from "../components/AdminConfirmModal";

const EMPTY_FORM = {
  email: "",
  firstName: "",
  lastName: "",
  specialty: "",
  licenseNumber: "",
  yearsExperience: 0,
  bio: "",
};

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [search, setSearch] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", message: "", action: null, tone: "danger", label: "Confirm" });
  const [flashedDoctorId, setFlashedDoctorId] = useState("");

  async function loadDoctors() {
    setLoading(true);
    try {
      const data = await apiFetch("/admin/doctors");
      setDoctors(Array.isArray(data) ? data : []);
    } catch (err) {
      setNotice({ type: "error", text: err.message || "Failed to fetch doctors" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    if (!flashedDoctorId) return;
    const timer = setTimeout(() => setFlashedDoctorId(""), 1300);
    return () => clearTimeout(timer);
  }, [flashedDoctorId]);

  async function submitDoctor(e) {
    e.preventDefault();
    setNotice({ type: "", text: "" });

    const payload = {
      ...form,
      yearsExperience: Number(form.yearsExperience || 0),
    };

    try {
      if (editingId) {
        await apiFetch(`/admin/doctors/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setNotice({ type: "success", text: "Doctor updated successfully" });
      } else {
        await apiFetch("/admin/doctors", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice({ type: "success", text: "Doctor created successfully" });
      }

      setForm(EMPTY_FORM);
      setEditingId("");
      loadDoctors();
    } catch (err) {
      setNotice({ type: "error", text: err.message || "Doctor action failed" });
    }
  }

  function startEdit(doctor) {
    setEditingId(doctor.id);
    setForm({
      email: doctor.email || "",
      firstName: doctor.firstName || "",
      lastName: doctor.lastName || "",
      specialty: doctor.specialty || "",
      licenseNumber: doctor.licenseNumber || "",
      yearsExperience: doctor.yearsExperience || 0,
      bio: doctor.bio || "",
    });
  }

  async function deleteDoctor(doctor) {
    try {
      await apiFetch(`/admin/doctors/${doctor.id}`, { method: "DELETE" });
      setNotice({ type: "success", text: "Doctor deleted successfully" });
      setFlashedDoctorId(doctor.id);
      loadDoctors();
    } catch (err) {
      setNotice({ type: "error", text: err.message || "Failed to delete doctor" });
    }
  }

  async function changeApproval(doctor, approvalStatus) {
    try {
      await apiFetch(`/admin/doctors/${doctor.id}/approval`, {
        method: "PATCH",
        body: JSON.stringify({ approvalStatus }),
      });
      setNotice({ type: "success", text: `Doctor ${approvalStatus} successfully` });
      setFlashedDoctorId(doctor.id);
      loadDoctors();
    } catch (err) {
      setNotice({ type: "error", text: err.message || "Failed to update approval" });
    }
  }

  async function toggleActivation(doctor) {
    try {
      const next = !doctor.isActive;
      await apiFetch(`/admin/doctors/${doctor.id}/activation`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: next }),
      });
      setNotice({ type: "success", text: `Doctor ${next ? "activated" : "deactivated"} successfully` });
      setFlashedDoctorId(doctor.id);
      loadDoctors();
    } catch (err) {
      setNotice({ type: "error", text: err.message || "Failed to update account status" });
    }
  }

  function openConfirm({ title, message, action, label = "Confirm", tone = "danger" }) {
    setConfirmDialog({ open: true, title, message, action, label, tone });
  }

  function closeConfirm() {
    setConfirmDialog({ open: false, title: "", message: "", action: null, label: "Confirm", tone: "danger" });
  }

  async function handleConfirmAction() {
    const action = confirmDialog.action;
    closeConfirm();
    if (typeof action === "function") {
      await action();
    }
  }

  function renderApprovalChip(approvalStatus) {
    const status = String(approvalStatus || "pending").toLowerCase();
    return <span className={`admin-chip ${status}`}>{status}</span>;
  }

  const visibleDoctors = useMemo(() => {
    const q = search.trim().toLowerCase();

    return doctors.filter((doctor) => {
      const doctorName = `${doctor.firstName || ""} ${doctor.lastName || ""}`.toLowerCase();
      const matchesSearch =
        !q ||
        doctorName.includes(q) ||
        String(doctor.email || "").toLowerCase().includes(q) ||
        String(doctor.specialty || "").toLowerCase().includes(q);

      const status = String(doctor.approvalStatus || "pending").toLowerCase();
      const matchesApproval = approvalFilter === "all" || status === approvalFilter;
      const matchesAccount =
        accountFilter === "all" ||
        (accountFilter === "active" && doctor.isActive) ||
        (accountFilter === "inactive" && !doctor.isActive);

      return matchesSearch && matchesApproval && matchesAccount;
    });
  }, [doctors, search, approvalFilter, accountFilter]);

  const columns = useMemo(() => ["Doctor", "Specialty", "Email", "Experience", "Approval", "Account", "Actions"], []);

  return (
    <section style={{ display: "grid", gap: 14 }}>
      {notice.text ? <p className={`admin-banner ${notice.type}`}>{notice.text}</p> : null}

      <div className="admin-card" style={{ display: "grid", gap: 10 }}>
        <h2 className="admin-section-title">Doctor Moderation Filters</h2>
        <div className="admin-row">
          <input
            className="admin-input"
            style={{ minWidth: 280 }}
            placeholder="Search by name, email or specialty"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="admin-select" value={approvalFilter} onChange={(e) => setApprovalFilter(e.target.value)}>
            <option value="all">All Approval States</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select className="admin-select" value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
            <option value="all">All Account States</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            type="button"
            className="admin-btn secondary"
            onClick={() => {
              setSearch("");
              setApprovalFilter("all");
              setAccountFilter("all");
            }}
          >
            Clear
          </button>
        </div>
      </div>

      <form className="admin-card" onSubmit={submitDoctor}>
        <h2 className="admin-section-title">Create Or Update Doctor</h2>
        <div className="admin-row">
          <input className="admin-input" placeholder="First name" value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} required />
          <input className="admin-input" placeholder="Last name" value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} required />
          <input className="admin-input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
          <input className="admin-input" placeholder="Specialty" value={form.specialty} onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))} />
          <input className="admin-input" placeholder="License" value={form.licenseNumber} onChange={(e) => setForm((p) => ({ ...p, licenseNumber: e.target.value }))} />
          <input className="admin-input" type="number" min="0" placeholder="Years" value={form.yearsExperience} onChange={(e) => setForm((p) => ({ ...p, yearsExperience: e.target.value }))} />
        </div>
        <textarea className="admin-textarea" style={{ width: "100%", marginTop: 10 }} rows={3} placeholder="Short bio" value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} />
        <div className="admin-row" style={{ marginTop: 10 }}>
          <button className="admin-btn primary" type="submit">{editingId ? "Update Doctor" : "Add Doctor"}</button>
          {editingId ? <button className="admin-btn secondary" type="button" onClick={() => { setEditingId(""); setForm(EMPTY_FORM); }}>Cancel Edit</button> : null}
        </div>
      </form>

      <AdminTableShell
        columns={columns}
        isLoading={loading}
        isEmpty={!loading && visibleDoctors.length === 0}
        emptyTitle="No doctors match these filters"
        emptyDescription="Try changing search or moderation filters."
      >
        {visibleDoctors.map((doctor) => (
          <tr key={doctor.id} className={flashedDoctorId === doctor.id ? "admin-row-flash" : ""}>
            <td>{doctor.firstName} {doctor.lastName}</td>
            <td>{doctor.specialty || "-"}</td>
            <td>{doctor.email}</td>
            <td>{doctor.yearsExperience || 0} years</td>
            <td>{renderApprovalChip(doctor.approvalStatus)}</td>
            <td>{doctor.isActive ? "Active" : "Inactive"}</td>
            <td>
              <div className="admin-row">
                <button type="button" className="admin-btn secondary" onClick={() => startEdit(doctor)}>Edit</button>
                <button
                  type="button"
                  className="admin-btn secondary"
                  onClick={() => changeApproval(doctor, "approved")}
                  disabled={doctor.approvalStatus === "approved"}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="admin-btn danger"
                  onClick={() =>
                    openConfirm({
                      title: "Reject Doctor Account",
                      message: `Reject Dr. ${doctor.firstName} ${doctor.lastName}? They will not be able to log in until approved again.`,
                      action: () => changeApproval(doctor, "rejected"),
                      label: "Reject Doctor",
                    })
                  }
                  disabled={doctor.approvalStatus === "rejected"}
                >
                  Reject
                </button>
                <button
                  type="button"
                  className="admin-btn secondary"
                  onClick={() =>
                    openConfirm({
                      title: doctor.isActive ? "Deactivate Doctor Account" : "Reactivate Doctor Account",
                      message: doctor.isActive
                        ? `Deactivate Dr. ${doctor.firstName} ${doctor.lastName}? They will lose access immediately.`
                        : `Activate Dr. ${doctor.firstName} ${doctor.lastName}? They can log in again if approved.`,
                      action: () => toggleActivation(doctor),
                      label: doctor.isActive ? "Deactivate" : "Activate",
                    })
                  }
                >
                  {doctor.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  className="admin-btn danger"
                  onClick={() =>
                    openConfirm({
                      title: "Delete Doctor Account",
                      message: `Delete Dr. ${doctor.firstName} ${doctor.lastName}? This action cannot be undone.`,
                      action: () => deleteDoctor(doctor),
                      label: "Delete Doctor",
                    })
                  }
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        ))}
      </AdminTableShell>

      <AdminConfirmModal
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.label}
        tone={confirmDialog.tone}
        onCancel={closeConfirm}
        onConfirm={handleConfirmAction}
      />
    </section>
  );
}
