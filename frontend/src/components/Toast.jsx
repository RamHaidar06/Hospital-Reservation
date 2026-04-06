export default function Toast({ toast }) {
  if (!toast.show) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 32,
        left: "50%",
        transform: "translateX(-50%)",
        padding: "14px 24px",
        borderRadius: 12,
        fontWeight: 500,
        zIndex: 99999,
        opacity: 1,
        transition: "opacity 0.3s ease",
        boxShadow:
          toast.type === "error"
            ? "0 0 30px rgba(239, 68, 68, 0.3)"
            : toast.type === "success"
            ? "0 0 30px rgba(34, 197, 94, 0.4)"
            : "0 0 30px rgba(0, 217, 255, 0.2)",
        background:
          toast.type === "error"
            ? "rgba(239, 68, 68, 0.15)"
            : toast.type === "success"
            ? "#dcfce7"
            : "rgba(0, 217, 255, 0.15)",
        border:
          toast.type === "error"
            ? "1px solid rgba(239, 68, 68, 0.5)"
            : toast.type === "success"
            ? "1px solid #22c55e"
            : "1px solid rgba(0, 217, 255, 0.4)",
        color:
          toast.type === "error"
            ? "#ef4444"
            : toast.type === "success"
            ? "#15803d"
            : "var(--cyan-bright)",
      }}
    >
      {toast.message}
    </div>
  );
}