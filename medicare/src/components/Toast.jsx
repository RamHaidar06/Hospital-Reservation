export default function Toast({ message }) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[rgba(0,217,255,0.2)] border border-[rgba(0,217,255,0.4)] text-cyan-400 px-6 py-3 rounded-lg shadow-lg transition-opacity">
      {message}
    </div>
  );
}