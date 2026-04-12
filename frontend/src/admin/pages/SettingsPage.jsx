import { useEffect, useState } from "react";
import { apiFetch } from "../../API/http";

export default function SettingsPage() {
  const [profile, setProfile] = useState({ firstName: "", lastName: "", phone: "", address: "", email: "" });
  const [settings, setSettings] = useState({ clinicName: "", supportEmail: "", allowNewRegistrations: true, defaultAppointmentDuration: 30 });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState({ type: "", text: "" });

  async function loadSettings() {
    setLoading(true);
    try {
      const data = await apiFetch("/admin/settings");
      if (data?.profile) {
        setProfile({
          firstName: data.profile.firstName || "",
          lastName: data.profile.lastName || "",
          phone: data.profile.phone || "",
          address: data.profile.address || "",
          email: data.profile.email || "",
        });
      }
      if (data?.settings) {
        setSettings({
          clinicName: data.settings.clinicName || "",
          supportEmail: data.settings.supportEmail || "",
          allowNewRegistrations: !!data.settings.allowNewRegistrations,
          defaultAppointmentDuration: Number(data.settings.defaultAppointmentDuration || 30),
        });
      }
    } catch (err) {
      setNotice({ type: "error", text: err.message || "Failed to load settings" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function saveProfile() {
    try {
      const data = await apiFetch("/admin/settings/profile", {
        method: "PATCH",
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
          address: profile.address,
        }),
      });
      setProfile((prev) => ({ ...prev, email: data.email || prev.email }));
      setNotice({ type: "success", text: "Admin profile updated" });
    } catch (err) {
      setNotice({ type: "error", text: err.message || "Failed to update profile" });
    }
  }

  async function saveSystemSettings() {
    try {
      const data = await apiFetch("/admin/settings/system", {
        method: "PATCH",
        body: JSON.stringify(settings),
      });
      setSettings({
        clinicName: data.clinicName || "",
        supportEmail: data.supportEmail || "",
        allowNewRegistrations: !!data.allowNewRegistrations,
        defaultAppointmentDuration: Number(data.defaultAppointmentDuration || 30),
      });
      setNotice({ type: "success", text: "System settings saved" });
    } catch (err) {
      setNotice({ type: "error", text: err.message || "Failed to save settings" });
    }
  }

  if (loading) {
    return <div className="admin-card"><p className="admin-muted" style={{ margin: 0 }}>Loading settings...</p></div>;
  }

  return (
    <section style={{ display: "grid", gap: 14 }}>
      {notice.text ? <p className={`admin-banner ${notice.type}`}>{notice.text}</p> : null}

      <div className="admin-card" style={{ display: "grid", gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: "1.08rem" }}>Admin Profile</h3>
        <div className="admin-row">
          <input className="admin-input" placeholder="First name" value={profile.firstName} onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))} />
          <input className="admin-input" placeholder="Last name" value={profile.lastName} onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))} />
          <input className="admin-input" placeholder="Phone" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
          <input className="admin-input" placeholder="Address" value={profile.address} onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))} />
          <input className="admin-input" value={profile.email} disabled />
        </div>
        <div><button type="button" className="admin-btn primary" onClick={saveProfile}>Save Profile</button></div>
      </div>

      <div className="admin-card" style={{ display: "grid", gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: "1.08rem" }}>System Settings</h3>
        <div className="admin-row">
          <input className="admin-input" placeholder="Clinic name" value={settings.clinicName} onChange={(e) => setSettings((p) => ({ ...p, clinicName: e.target.value }))} />
          <input className="admin-input" placeholder="Support email" value={settings.supportEmail} onChange={(e) => setSettings((p) => ({ ...p, supportEmail: e.target.value }))} />
          <input
            className="admin-input"
            type="number"
            min="10"
            step="5"
            placeholder="Default appointment duration"
            value={settings.defaultAppointmentDuration}
            onChange={(e) => setSettings((p) => ({ ...p, defaultAppointmentDuration: Number(e.target.value || 30) }))}
          />
          <label className="admin-row" style={{ fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={settings.allowNewRegistrations}
              onChange={(e) => setSettings((p) => ({ ...p, allowNewRegistrations: e.target.checked }))}
            />
            Allow new registrations
          </label>
        </div>
        <div><button type="button" className="admin-btn primary" onClick={saveSystemSettings}>Save Settings</button></div>
      </div>
    </section>
  );
}
