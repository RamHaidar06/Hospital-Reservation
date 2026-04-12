export default function AdminLoadingState({ label = "Loading..." }) {
  return (
    <div className="admin-card" style={{ display: "grid", placeItems: "center", minHeight: 180 }}>
      <p className="admin-muted" style={{ margin: 0 }}>{label}</p>
    </div>
  );
}
