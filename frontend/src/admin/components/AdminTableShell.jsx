import AdminEmptyState from "./AdminEmptyState";

export default function AdminTableShell({
  columns,
  children,
  isLoading,
  isEmpty,
  emptyTitle,
  emptyDescription,
}) {
  if (isLoading) {
    return (
      <div className="admin-card" style={{ textAlign: "center" }}>
        <p className="admin-muted" style={{ margin: 0 }}>Loading table data...</p>
      </div>
    );
  }

  if (isEmpty) {
    return <AdminEmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
