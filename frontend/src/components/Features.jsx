export default function Features() {
  const features = [
    { icon: "👨‍⚕️", title: "Board-Certified Doctors", desc: "Connect with 2,000+ verified physicians across 30+ specialties, all credentialed and peer-reviewed." },
    { icon: "🤖", title: "AI Health Insights", desc: "Get personalized health recommendations powered by advanced machine learning algorithms." },
    { icon: "🔒", title: "Bank-Level Security", desc: "Enterprise-grade encryption and HIPAA compliance keep your medical data completely private." },
  ];

  return (
    <section id="features" className="py-20 px-6 relative z-10">
      <div className="max-w-6xl mx-auto text-center mb-16">
        <h2 className="text-4xl font-bold mb-4">Powerful Features</h2>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Experience cutting-edge healthcare technology designed for the modern patient
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {features.map((f, i) => (
          <div key={i} className="glass-card p-8 hover:-translate-y-2 transition-all duration-300">
            <div className="text-3xl mb-4">{f.icon}</div>
            <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
            <p className="text-gray-400 text-sm">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}