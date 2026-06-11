import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Users, QrCode, Bell, CheckCircle, Star } from "lucide-react";

const skills = [
  { icon: "💼", name: "Product Management" },
  { icon: "🎬", name: "Cinematography" },
  { icon: "💻", name: "IT" },
  { icon: "👗", name: "Fashion Designer" },
  { icon: "✂️", name: "Barbing" },
  { icon: "💇", name: "Hair Dressers" },
  { icon: "👱", name: "Wig Making" },
  { icon: "🍽️", name: "Catering" },
];

const features = [
  {
    icon: BookOpen,
    title: "8 Vocational Skills",
    description: "Learn practical skills across catering, fashion, tech, and more every Saturday.",
  },
  {
    icon: QrCode,
    title: "QR Check-In",
    description: "Scan your personal QR code for seamless attendance tracking at each session.",
  },
  {
    icon: ArrowRight,
    title: "Easy Transfers",
    description: "Request to transfer between skill classes — admins approve in one click.",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Get WhatsApp and email reminders before every Saturday session.",
  },
  {
    icon: Users,
    title: "Community Directory",
    description: "Connect with fellow YSA members across all 7 wards of Ojodu Stake.",
  },
  {
    icon: Star,
    title: "Progress Tracking",
    description: "Track your attendance and celebrate your growth in your chosen skill.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-[#0F172A] text-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center text-[#0F172A] font-bold text-xs">YSA</div>
            <span className="font-semibold text-sm">YSA Skills Hub</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-white/70 hover:text-white transition-colors">Sign In</Link>
            <Link
              to="/signup"
              className="bg-amber-400 text-[#0F172A] text-sm font-semibold px-4 py-2 rounded-lg hover:bg-amber-300 transition-colors"
            >
              Join Now
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[#0F172A] text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <CheckCircle className="w-3.5 h-3.5" />
            Ojodu Stake YSA Gathering Place
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
            Grow Your Skills<br />
            <span className="text-amber-400">Every Saturday</span>
          </h1>
          <p className="text-lg text-white/70 mb-8 max-w-2xl mx-auto">
            Join hundreds of young adults building marketable vocational skills under experienced instructors — with seamless attendance, QR check-in, and community connection.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/signup"
              className="flex items-center gap-2 bg-amber-400 text-[#0F172A] font-semibold px-6 py-3 rounded-xl hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 border border-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/10 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Skills Grid */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-[#0F172A] mb-2">8 Vocational Skills</h2>
          <p className="text-slate-500 text-center mb-10">Choose your path and start learning with industry professionals</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {skills.map((skill) => (
              <div key={skill.name} className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-5 text-center hover:border-amber-400/50 hover:shadow-md transition-all">
                <div className="text-3xl mb-3">{skill.icon}</div>
                <p className="font-semibold text-sm text-[#0F172A]">{skill.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-[#0F172A] mb-2">Everything You Need</h2>
          <p className="text-slate-500 text-center mb-10">A complete platform for managing your Saturday skills journey</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-all">
                <div className="w-10 h-10 bg-amber-400/10 rounded-lg flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className="font-semibold text-[#0F172A] mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0F172A] text-white py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Join?</h2>
          <p className="text-white/70 mb-8">Register today and start your skill-building journey this Saturday.</p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 bg-amber-400 text-[#0F172A] font-semibold px-8 py-3 rounded-xl hover:bg-amber-300 transition-colors"
          >
            Create Your Account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0F172A] border-t border-white/10 text-white/40 text-xs py-6 px-4 text-center">
        <p>© {new Date().getFullYear()} YSA Skills Hub — Ojodu Stake, The Church of Jesus Christ of Latter-day Saints</p>
      </footer>
    </div>
  );
}
