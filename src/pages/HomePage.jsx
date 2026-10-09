import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, BarChart3, Shield, Zap, TrendingUp, PieChart,
  Wallet, CheckCircle, Star, ChevronDown, ChevronRight,
  Sparkles, Receipt, Users, Globe, Lock, Smartphone,
  ArrowUpRight, Play, Menu, X
} from 'lucide-react';

// ─── Animated Counter ────────────────────────────────────
const AnimatedCounter = ({ end, suffix = '', prefix = '', duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, end, duration]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString('id-ID')}{suffix}
    </span>
  );
};

// ─── Floating Orb Background ─────────────────────────────
const FloatingOrbs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] animate-pulse" />
    <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-violet-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
    <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '4s' }} />
  </div>
);

// ─── Section Wrapper ────────────────────────────────────
const Section = ({ children, className = '', id }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.section>
  );
};

// ─── FAQ Accordion Item ──────────────────────────────────
const FAQItem = ({ q, a, isOpen, onClick }) => (
  <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.03] backdrop-blur-sm hover:border-white/20 transition-colors">
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-6 text-left cursor-pointer"
    >
      <span className="text-white font-semibold text-base pr-4">{q}</span>
      <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p className="px-6 pb-6 text-gray-400 leading-relaxed text-sm">{a}</p>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);


// ═══════════════════════════════════════════════════════════
// ███  HOMEPAGE COMPONENT
// ═══════════════════════════════════════════════════════════
const HomePage = () => {
  const [openFAQ, setOpenFAQ] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const faqs = [
    { q: 'Apakah FinTrack gratis digunakan?', a: 'Ya! Kami menyediakan paket gratis dengan fitur dasar pencatatan keuangan. Untuk fitur lebih lengkap seperti OCR struk, multi-currency, dan laporan advanced, Anda bisa upgrade ke paket Premium.' },
    { q: 'Data saya aman atau tidak?', a: 'Sangat aman. Kami menggunakan Supabase dengan enkripsi end-to-end dan Row Level Security (RLS). Hanya Anda yang bisa mengakses data keuangan Anda sendiri.' },
    { q: 'Bisa diakses di HP?', a: 'Tentu! FinTrack adalah Progressive Web App (PWA) yang responsif. Anda bisa membukanya di browser HP dan bahkan menginstalnya seperti aplikasi native.' },
    { q: 'Bagaimana cara upgrade ke Premium?', a: 'Klik tombol "Lihat Paket Premium" lalu pilih paket yang sesuai. Pembayaran bisa via QRIS, transfer bank, atau e-wallet. Aktivasi instan setelah pembayaran terverifikasi.' },
    { q: 'Apakah bisa export data ke Excel?', a: 'Ya, fitur export ke Excel (.xlsx) tersedia untuk semua pengguna. Pengguna Premium mendapat template laporan yang lebih lengkap dan profesional.' },
  ];

  const features = [
    { icon: BarChart3, title: 'Dashboard Real-time', desc: 'Pantau arus kas dengan grafik interaktif yang terupdate secara real-time.', color: 'from-blue-500 to-cyan-500' },
    { icon: Receipt, title: 'OCR Struk Otomatis', desc: 'Foto struk belanja, AI kami akan mengekstrak data transaksi secara otomatis.', color: 'from-violet-500 to-purple-500', premium: true },
    { icon: PieChart, title: 'Analisis Kategori', desc: 'Lihat distribusi pengeluaran per kategori dengan visualisasi yang informatif.', color: 'from-emerald-500 to-teal-500' },
    { icon: Shield, title: 'Keamanan Terjamin', desc: 'Enkripsi data & Row Level Security memastikan privasi keuangan Anda.', color: 'from-orange-500 to-amber-500' },
    { icon: Smartphone, title: 'PWA Mobile-Ready', desc: 'Akses dari mana saja, kapan saja. Install langsung di layar HP Anda.', color: 'from-pink-500 to-rose-500' },
    { icon: TrendingUp, title: 'Laporan & Export', desc: 'Export laporan keuangan ke Excel dengan format profesional siap cetak.', color: 'from-indigo-500 to-blue-500' },
  ];

  const testimonials = [
    { name: 'Andi Pratama', role: 'Freelancer', text: 'FinTrack membantu saya melacak semua pemasukan dari berbagai klien. Dashboard-nya sangat intuitif!', rating: 5 },
    { name: 'Sari Dewi', role: 'Mahasiswa', text: 'Sebagai mahasiswa, saya perlu tahu kemana uang saya pergi. Fitur kategori pengeluaran sangat membantu!', rating: 5 },
    { name: 'Budi Santoso', role: 'UMKM Owner', text: 'Paket premium worth it banget. OCR struk menghemat waktu input data harian bisnis saya.', rating: 5 },
  ];

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans overflow-x-hidden">

      {/* ─── NAVBAR ──────────────────────────────────────── */}
      <nav className={`fixed w-full z-50 transition-all duration-500 ${scrolled ? 'bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06] shadow-2xl shadow-black/20' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 lg:h-20 items-center">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-violet-500 rounded-xl blur-md opacity-60 group-hover:opacity-100 transition-opacity" />
                <img
                  src="/logo.jpg"
                  alt="FinTrack Logo"
                  width="40"
                  height="40"
                  className="relative w-10 h-10 rounded-xl object-cover ring-1 ring-white/20"
                />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
                FinTrack
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollTo('features')} className="text-gray-400 hover:text-white text-sm font-medium transition-colors cursor-pointer">Fitur</button>
              <button onClick={() => scrollTo('pricing')} className="text-gray-400 hover:text-white text-sm font-medium transition-colors cursor-pointer">Harga</button>
              <button onClick={() => scrollTo('testimonials')} className="text-gray-400 hover:text-white text-sm font-medium transition-colors cursor-pointer">Testimoni</button>
              <button onClick={() => scrollTo('faq')} className="text-gray-400 hover:text-white text-sm font-medium transition-colors cursor-pointer">FAQ</button>
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/login"
                className="text-gray-300 hover:text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-white/[0.06] transition-all"
              >
                Masuk
              </Link>
              <Link
                to="/register"
                className="group relative text-sm font-semibold text-white px-5 py-2.5 rounded-xl overflow-hidden transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-violet-600 transition-opacity" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative flex items-center gap-1.5">
                  Daftar Gratis
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white transition cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/[0.06]"
            >
              <div className="px-4 py-6 space-y-3">
                <button onClick={() => scrollTo('features')} className="block w-full text-left px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer">Fitur</button>
                <button onClick={() => scrollTo('pricing')} className="block w-full text-left px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer">Harga</button>
                <button onClick={() => scrollTo('testimonials')} className="block w-full text-left px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer">Testimoni</button>
                <button onClick={() => scrollTo('faq')} className="block w-full text-left px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer">FAQ</button>
                <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
                  <Link to="/login" className="block text-center px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition">Masuk</Link>
                  <Link to="/register" className="block text-center px-4 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold rounded-xl">Daftar Gratis</Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>


      {/* ─── HERO SECTION ────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-20 pb-32">
        <FloatingOrbs />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs font-semibold text-blue-300 tracking-wide uppercase backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
                Platform Keuangan Pribadi #1
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mt-8 mb-6 leading-[1.1]"
            >
              Kelola Keuangan
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400">
                Lebih Cerdas.
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              Catat pemasukan & pengeluaran, analisis pola belanja, dan ambil keputusan
              finansial yang lebih baik — semua dalam satu platform yang elegan.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45 }}
              className="flex flex-col sm:flex-row justify-center gap-4"
            >
              <Link
                to="/register"
                className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-bold overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-violet-600" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                {/* Shine */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative text-white">Mulai Gratis Sekarang</span>
                <ArrowRight className="relative w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/login"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold border border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.06] hover:border-white/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Masuk ke Akun
                <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="mt-12 flex flex-wrap items-center justify-center gap-6 text-gray-500 text-xs"
            >
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-500/70" />
                <span>Enkripsi End-to-End</span>
              </div>
              <div className="w-px h-4 bg-white/10 hidden sm:block" />
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500/70" />
                <span>Setup 30 Detik</span>
              </div>
              <div className="w-px h-4 bg-white/10 hidden sm:block" />
              <div className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-500/70" />
                <span>Akses Dari Mana Saja</span>
              </div>
            </motion.div>
          </div>

          {/* Dashboard Preview Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.6 }}
            className="mt-20 max-w-5xl mx-auto relative"
          >
            {/* Glow behind */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-violet-500/20 to-purple-500/20 rounded-3xl blur-3xl" />

            <div className="relative rounded-2xl border border-white/10 bg-[#12121a]/80 backdrop-blur-xl overflow-hidden shadow-2xl">
              {/* Browser bar */}
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 ml-4">
                  <div className="max-w-xs mx-auto bg-white/[0.06] rounded-lg px-4 py-1.5 text-xs text-gray-500 text-center">
                    app.fintrack.id/dashboard
                  </div>
                </div>
              </div>

              {/* Mock Dashboard Content */}
              <div className="p-6 md:p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Saldo', value: 'Rp 12.450.000', color: 'text-white', bg: 'from-blue-600/20 to-violet-600/20' },
                    { label: 'Pemasukan', value: 'Rp 8.200.000', color: 'text-emerald-400', bg: 'from-emerald-600/10 to-emerald-600/5' },
                    { label: 'Pengeluaran', value: 'Rp 3.750.000', color: 'text-rose-400', bg: 'from-rose-600/10 to-rose-600/5' },
                    { label: 'Tabungan', value: 'Rp 4.450.000', color: 'text-amber-400', bg: 'from-amber-600/10 to-amber-600/5' },
                  ].map((card, i) => (
                    <div key={i} className={`bg-gradient-to-br ${card.bg} border border-white/[0.06] rounded-xl p-4`}>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{card.label}</p>
                      <p className={`text-sm md:text-base font-bold ${card.color} truncate`}>{card.value}</p>
                    </div>
                  ))}
                </div>

                {/* Mock Chart Area */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 h-48 md:h-56 flex items-end gap-1.5">
                  {[35, 55, 40, 70, 50, 80, 65, 90, 75, 60, 85, 95].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.8, delay: 0.8 + i * 0.05 }}
                      className="flex-1 bg-gradient-to-t from-blue-600 to-violet-500 rounded-t-md opacity-80 hover:opacity-100 transition-opacity relative group cursor-pointer"
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm text-[9px] text-white px-2 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                        {['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][i]}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>


      {/* ─── STATS COUNTER ───────────────────────────────── */}
      <Section className="py-20 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {[
              { value: 1200, suffix: '+', label: 'Pengguna Aktif', icon: Users },
              { value: 50000, suffix: '+', label: 'Transaksi Tercatat', icon: Receipt },
              { value: 99, suffix: '%', label: 'Uptime Server', icon: Zap },
              { value: 4.9, suffix: '/5', label: 'Rating Pengguna', icon: Star },
            ].map((stat, i) => (
              <div key={i} className="text-center group">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-4 group-hover:bg-white/[0.08] transition">
                  <stat.icon className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-3xl md:text-4xl font-extrabold text-white mb-1">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-gray-500 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>


      {/* ─── FEATURES SECTION ────────────────────────────── */}
      <Section id="features" className="py-24 md:py-32 relative">
        <FloatingOrbs />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section Header */}
          <div className="text-center mb-16 md:mb-20">
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-wider uppercase mb-6">
              Fitur Unggulan
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              Semua yang Anda butuhkan
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">dalam satu platform.</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Dari pencatatan sederhana hingga analisis mendalam — FinTrack dirancang untuk membantu Anda menguasai keuangan.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative p-7 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] hover:-translate-y-1"
              >
                {feat.premium && (
                  <span className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Premium
                  </span>
                )}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feat.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                  <feat.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>


      {/* ─── HOW IT WORKS ────────────────────────────────── */}
      <Section className="py-24 md:py-32 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wider uppercase mb-6">
              Cara Kerja
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              Mulai dalam <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">3 langkah</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-16 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {[
              { step: '01', title: 'Daftar Akun', desc: 'Buat akun gratis hanya dengan email dan password. Tidak perlu kartu kredit.', icon: Users },
              { step: '02', title: 'Catat Transaksi', desc: 'Input pemasukan & pengeluaran secara manual atau otomatis via OCR struk.', icon: Wallet },
              { step: '03', title: 'Analisis & Grow', desc: 'Pantau grafik, identifikasi pola, dan buat keputusan keuangan yang lebih cerdas.', icon: TrendingUp },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center relative"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] mb-6 relative">
                  <item.icon className="w-7 h-7 text-emerald-400" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-[10px] font-bold flex items-center justify-center text-white shadow-lg">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>


      {/* ─── PRICING PREVIEW ─────────────────────────────── */}
      <Section id="pricing" className="py-24 md:py-32 relative">
        <FloatingOrbs />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold tracking-wider uppercase mb-6">
              Paket & Harga
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              Pilih paket yang <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-purple-400">sesuai Anda</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Mulai gratis, upgrade kapan saja sesuai kebutuhan Anda.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="p-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm hover:border-white/[0.15] transition-all">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gray-500/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Gratis</h3>
                  <p className="text-xs text-gray-500">Untuk pemula</p>
                </div>
              </div>

              <div className="mb-8">
                <span className="text-4xl font-extrabold text-white">Rp 0</span>
                <span className="text-gray-500 text-sm ml-1">/selamanya</span>
              </div>

              <ul className="space-y-3 mb-8">
                {[
                  'Pencatatan pemasukan & pengeluaran',
                  'Dashboard real-time',
                  'Grafik arus kas bulanan',
                  'Export data ke Excel',
                  'Kategori otomatis',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                to="/register"
                className="block w-full text-center py-3.5 rounded-xl border border-white/10 text-white font-semibold hover:bg-white/[0.06] transition-all"
              >
                Mulai Gratis
              </Link>
            </div>

            {/* Premium Plan */}
            <div className="relative p-8 rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/[0.08] to-blue-500/[0.08] backdrop-blur-sm hover:border-violet-500/50 transition-all">
              {/* Popular badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-4 py-1 rounded-full bg-gradient-to-r from-violet-600 to-blue-600 text-white text-xs font-bold shadow-lg shadow-violet-500/20">
                  ⚡ Paling Populer
                </span>
              </div>

              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Premium</h3>
                  <p className="text-xs text-violet-300">Fitur lengkap</p>
                </div>
              </div>

              <div className="mb-8">
                <span className="text-4xl font-extrabold text-white">Rp 29K</span>
                <span className="text-gray-400 text-sm ml-1">/bulan</span>
              </div>

              <ul className="space-y-3 mb-8">
                {[
                  'Semua fitur gratis',
                  'OCR scan struk otomatis (AI)',
                  'Laporan keuangan premium',
                  'Multi-currency support',
                  'Prioritas support',
                  'Template export profesional',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-200">
                    <CheckCircle className="w-4 h-4 text-violet-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                to="/pricing"
                className="group block w-full text-center py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-bold hover:from-violet-500 hover:to-blue-500 transition-all shadow-lg shadow-violet-500/20"
              >
                <span className="flex items-center justify-center gap-2">
                  Lihat Paket Premium
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </Section>


      {/* ─── TESTIMONIALS ────────────────────────────────── */}
      <Section id="testimonials" className="py-24 md:py-32 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-wider uppercase mb-6">
              Testimoni
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              Dipercaya oleh <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400">banyak pengguna</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="p-7 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm hover:border-white/[0.12] hover:bg-white/[0.04] transition-all"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                <p className="text-gray-300 text-sm leading-relaxed mb-6 italic">
                  "{t.text}"
                </p>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    <p className="text-gray-500 text-xs">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>


      {/* ─── FAQ SECTION ──────────────────────────────────── */}
      <Section id="faq" className="py-24 md:py-32 border-t border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold tracking-wider uppercase mb-6">
              FAQ
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              Pertanyaan <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">yang sering diajukan</span>
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FAQItem
                key={i}
                q={faq.q}
                a={faq.a}
                isOpen={openFAQ === i}
                onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </Section>


      {/* ─── FINAL CTA ───────────────────────────────────── */}
      <Section className="py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative p-12 md:p-20 rounded-3xl overflow-hidden">
            {/* BG Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-violet-600/20 to-purple-600/20 border border-white/[0.08] rounded-3xl" />
            <div className="absolute inset-0 backdrop-blur-sm rounded-3xl" />

            {/* Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-blue-500/20 rounded-full blur-[80px]" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
                Siap mengelola keuangan
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">dengan lebih baik?</span>
              </h2>
              <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
                Bergabung bersama ribuan pengguna yang sudah mempercayakan pencatatan keuangan mereka di FinTrack.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  to="/register"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-bold text-base transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-blue-500/20"
                >
                  Daftar Gratis Sekarang
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/pricing"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border border-white/10 text-gray-300 hover:text-white font-semibold hover:bg-white/[0.06] transition-all hover:scale-[1.02]"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Lihat Paket Premium
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Section>


      {/* ─── FOOTER ──────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.jpg" alt="FinTrack" className="w-8 h-8 rounded-lg object-cover" />
                <span className="text-lg font-bold text-white">FinTrack</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                Platform manajemen keuangan pribadi yang cerdas, aman, dan transparan.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Produk</h4>
              <ul className="space-y-2.5">
                <li><button onClick={() => scrollTo('features')} className="text-gray-500 hover:text-gray-300 text-sm transition cursor-pointer">Fitur</button></li>
                <li><Link to="/pricing" className="text-gray-500 hover:text-gray-300 text-sm transition">Harga</Link></li>
                <li><button onClick={() => scrollTo('faq')} className="text-gray-500 hover:text-gray-300 text-sm transition cursor-pointer">FAQ</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Akun</h4>
              <ul className="space-y-2.5">
                <li><Link to="/login" className="text-gray-500 hover:text-gray-300 text-sm transition">Masuk</Link></li>
                <li><Link to="/register" className="text-gray-500 hover:text-gray-300 text-sm transition">Daftar</Link></li>
                <li><Link to="/admin" className="text-gray-500 hover:text-gray-300 text-sm transition">Dashboard</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Keamanan</h4>
              <ul className="space-y-2.5">
                <li className="flex items-center gap-2 text-gray-500 text-sm">
                  <Lock className="w-3.5 h-3.5 text-emerald-500/60" />
                  End-to-End Encryption
                </li>
                <li className="flex items-center gap-2 text-gray-500 text-sm">
                  <Shield className="w-3.5 h-3.5 text-emerald-500/60" />
                  Row Level Security
                </li>
                <li className="flex items-center gap-2 text-gray-500 text-sm">
                  <Globe className="w-3.5 h-3.5 text-blue-500/60" />
                  Hosted on Vercel
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="pt-8 border-t border-white/[0.06] flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 text-xs">
              &copy; {new Date().getFullYear()} FinTrack. Dibuat untuk manajemen keuangan yang lebih baik.
            </p>
            <p className="text-gray-700 text-[10px] uppercase tracking-wider">
              Powered by React + Supabase + Vercel
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
