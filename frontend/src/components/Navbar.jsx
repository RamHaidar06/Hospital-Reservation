export default function Navbar() {
  return (
    <nav className="sticky top-0 z-40 backdrop-blur-md bg-[rgba(10,14,39,0.7)] border-b border-cyan-900">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-teal-400 rounded-xl flex items-center justify-center text-[#0a0e27] font-bold text-2xl shadow-lg">
            🚀
          </div>
          <div>
            <p className="font-bold text-white text-lg">MediCare</p>
            <p className="text-cyan-400 text-xs">AI-Powered Healthcare</p>
          </div>
        </div>
      </div>
    </nav>
  );
}