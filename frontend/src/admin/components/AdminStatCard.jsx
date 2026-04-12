export default function AdminStatCard({ label, value }) {
  return (
    <article className="admin-card">
      <p className="admin-muted" style={{ margin: 0, fontWeight: 600 }}>{label}</p>
      <p className="admin-stat-value">{value}</p>
    </article>
  );
}
