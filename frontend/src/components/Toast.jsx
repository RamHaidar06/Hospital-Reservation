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
            ? "0 0 30px rgba(239, 68, 68, 0.2)"
            : toast.type === "success"
            ? "0 0 30px rgba(34, 197, 94, 0.2)"
            : "0 0 30px rgba(0, 217, 255, 0.2)",
        background:
          toast.type === "error"
            ? "rgba(239, 68, 68, 0.2)"
            : toast.type === "success"
            ? "rgba(34, 197, 94, 0.2)"
            : "rgba(0, 217, 255, 0.2)",
        border:
          toast.type === "error"
            ? "1px solid rgba(239, 68, 68, 0.4)"
            : toast.type === "success"
            ? "1px solid rgba(34, 197, 94, 0.4)"
            : "1px solid rgba(0, 217, 255, 0.4)",
        color:
          toast.type === "error"
            ? "#fca5a5"
            : toast.type === "success"
            ? "#86efac"
            : "var(--cyan-bright)",
      }}
    >
      {toast.message}
    </div>
  );
}