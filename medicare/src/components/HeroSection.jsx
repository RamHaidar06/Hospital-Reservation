export default function HeroSection({ scrollToAuth }) {
  return (
    <section className="py-24 px-6 relative z-10">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <div>
          <p className="text-cyan-400 uppercase tracking-widest font-semibold mb-4 text-sm">
            The Future of Healthcare
          </p>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-cyan-400 bg-clip-text text-transparent mb-6">
            Healthcare, Reinvented by AI
          </h1>
          <p className="text-gray-400 text-lg mb-8 leading-relaxed">
            Connect with verified doctors, manage your health with AI-powered insights, and receive personalized care—all in one intelligent platform.
          </p>
          <div className="flex gap-4 flex-wrap mb-12">
            <button onClick={scrollToAuth} className="btn-primary">Get Started Free</button>
            <button className="btn-secondary">Watch Demo</button>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-cyan-400 text-2xl font-bold">500K+</p>
              <p className="text-gray-400 text-sm">Active Users</p>
            </div>
            <div>
              <p className="text-cyan-400 text-2xl font-bold">2K+</p>
              <p className="text-gray-400 text-sm">Verified Doctors</p>
            </div>
            <div>
              <p className="text-cyan-400 text-2xl font-bold">99.9%</p>
              <p className="text-gray-400 text-sm">Uptime SLA</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}