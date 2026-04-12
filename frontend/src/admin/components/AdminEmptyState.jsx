export default function AdminEmptyState({ title = "No data found", description = "Try changing filters or add new data." }) {
  return (
    <div className="admin-empty">
      <p style={{ margin: 0, fontWeight: 700 }}>{title}</p>
      <p className="admin-muted" style={{ margin: "8px 0 0" }}>{description}</p>
    </div>
  );
}
