import { useEffect, useState } from "react";
import { apiFetch } from "../../API/http";
import AdminLoadingState from "../components/AdminLoadingState";
import AdminStatCard from "../components/AdminStatCard";

function MiniSparkline({ values, stroke = "#1b67c7" }) {
  const width = 220;
  const height = 60;
  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1 || 1)) * (width - 12) + 6;
      const y = height - (value / max) * (height - 10) - 5;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="admin-sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden>
      <polyline fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError("");
        const response = await apiFetch("/admin/dashboard");
        if (!cancelled) setData(response);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load dashboard");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data && !error) return <AdminLoadingState label="Loading dashboard metrics..." />;

  return (
    <section style={{ display: "grid", gap: 14 }}>
      {error ? <p className="admin-banner error">{error}</p> : null}

      {data ? (
        <>
          <div className="admin-grid-cards">
            <AdminStatCard label="Total Doctors" value={data.totalDoctors ?? 0} />
            <AdminStatCard label="Total Patients" value={data.totalPatients ?? 0} />
            <AdminStatCard label="Total Appointments" value={data.totalAppointments ?? 0} />
            <AdminStatCard label="Today's Appointments" value={data.todaysAppointments ?? 0} />
            <AdminStatCard label="Cancelled Appointments" value={data.cancelledAppointments ?? 0} />
          </div>

          <div className="admin-card" style={{ display: "grid", gap: 10 }}>
            <h2 className="admin-section-title">System Snapshot</h2>
            <p className="admin-kpi-sub">Use this panel for a quick health check before moderating users or schedules.</p>
            <div className="admin-row">
              <span className="admin-chip approved">Doctors: {data.totalDoctors ?? 0}</span>
              <span className="admin-chip completed">Appointments: {data.totalAppointments ?? 0}</span>
              <span className="admin-chip pending">Today: {data.todaysAppointments ?? 0}</span>
              <span className="admin-chip rejected">Cancelled: {data.cancelledAppointments ?? 0}</span>
            </div>

            <div className="admin-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", width: "100%" }}>
              <div>
                <p className="admin-kpi-sub" style={{ marginBottom: 6 }}>Operations Trend</p>
                <MiniSparkline
                  values={[
                    data.totalDoctors ?? 0,
                    data.totalPatients ?? 0,
                    data.totalAppointments ?? 0,
                    data.todaysAppointments ?? 0,
                    data.cancelledAppointments ?? 0,
                  ]}
                />
              </div>
              <div>
                <p className="admin-kpi-sub" style={{ marginBottom: 6 }}>Risk Trend</p>
                <MiniSparkline
                  stroke="#c77709"
                  values={[
                    Math.max((data.totalAppointments ?? 0) - (data.cancelledAppointments ?? 0), 0),
                    data.cancelledAppointments ?? 0,
                    data.todaysAppointments ?? 0,
                    Math.max((data.totalPatients ?? 0) - (data.totalDoctors ?? 0), 0),
                    data.totalDoctors ?? 0,
                  ]}
                />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
