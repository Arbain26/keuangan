import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, BarChart3, Shield, Zap, TrendingUp, PieChart,
  Wallet, CheckCircle, Star, ChevronDown, ChevronRight,
  Sparkles, Receipt, Users, Globe, Lock, Smartphone,
  Menu, X
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

// ─── Section Wrapper ────────────────────────────────────
const Section = ({ children, className = '', id }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 35 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.section>
  );
};

// ─── FAQ Accordion Item ──────────────────────────────────
const FAQItem = ({ q, a, isOpen, onClick }) => (
  <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:border-gray-300 transition-colors">
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-6 text-left cursor-pointer focus:outline-none"
    >
      <span className="text-gray-900 font-semibold text-base pr-4">{q}</span>
      <ChevronDown className={`w-5 h-5 text-gray-500 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <p className="px-6 pb-6 text-gray-600 leading-relaxed text-sm border-t border-gray-100 pt-3">{a}</p>
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
    { icon: BarChart3, title: 'Dashboard Real-time', desc: 'Pantau arus kas dengan grafik interaktif yang terupdate secara real-time.', color: 'from-blue-500 to-indigo-600' },
    { icon: Receipt, title: 'OCR Struk Otomatis', desc: 'Foto struk belanja, AI kami akan mengekstrak data transaksi secara otomatis.', color: 'from-violet-500 to-purple-600', premium: true },
    { icon: PieChart, title: 'Analisis Kategori', desc: 'Lihat distribusi pengeluaran per kategori dengan visualisasi yang informatif.', color: 'from-emerald-500 to-teal-600' },
    { icon: Shield, title: 'Keamanan Terjamin', desc: 'Enkripsi data & Row Level Security memastikan privasi keuangan Anda aman.', color: 'from-amber-500 to-orange-600' },
    { icon: Smartphone, title: 'PWA Mobile-Ready', desc: 'Akses dari mana saja, kapan saja. Install langsung di layar utama smartphone Anda.', color: 'from-rose-500 to-pink-600' },
    { icon: TrendingUp, title: 'Laporan & Export', desc: 'Export laporan keuangan ke Excel dengan format rapi dan siap cetak.', color: 'from-blue-600 to-cyan-600' },
  ];

  const testimonials = [
    { name: 'Andi Pratama', role: 'Freelancer', text: 'FinTrack membantu saya melacak semua pemasukan dari berbagai klien dengan sangat mudah. Tampilannya bersih dan mudah digunakan!', rating: 5 },
    { name: 'Sari Dewi', role: 'Mahasiswa', text: 'Sebagai mahasiswa, saya jadi tahu pasti ke mana perginya uang saku bulanan saya. Fitur kategorinya sangat rapi!', rating: 5 },
    { name: 'Budi Santoso', role: 'Pemilik UMKM', text: 'Paket premium sangat membantu. OCR struk belanjaan menghemat waktu pembukuan harian usaha saya.', rating: 5 },
  ];

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">

      {/* ─── NAVBAR ──────────────────────────────────────── */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-xs' : 'bg-white/80 backdrop-blur-sm border-b border-gray-100'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 lg:h-20 items-center">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/logo.jpg"
                alt="FinTrack Logo"
                width="40"
                height="40"
                className="w-10 h-10 rounded-xl object-cover ring-1 ring-gray-200 shadow-xs group-hover:scale-105 transition-transform"
              />
              <span className="text-xl font-bold tracking-tight text-gray-900">
                FinTrack
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollTo('features')} className="text-gray-600 hover:text-blue-600 text-sm font-medium transition-colors cursor-pointer">Fitur</button>
              <button onClick={() => scrollTo('how-it-works')} className="text-gray-600 hover:text-blue-600 text-sm font-medium transition-colors cursor-pointer">Cara Kerja</button>
              <button onClick={() => scrollTo('pricing')} className="text-gray-600 hover:text-blue-600 text-sm font-medium transition-colors cursor-pointer">Harga</button>
              <button onClick={() => scrollTo('testimonials')} className="text-gray-600 hover:text-blue-600 text-sm font-medium transition-colors cursor-pointer">Testimoni</button>
              <button onClick={() => scrollTo('faq')} className="text-gray-600 hover:text-blue-600 text-sm font-medium transition-colors cursor-pointer">FAQ</button>
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/login"
                className="text-gray-700 hover:text-gray-900 text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-100 transition-all"
              >
                Masuk
              </Link>
              <Link
                to="/register"
                className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition-all inline-flex items-center gap-1.5 active:scale-98"
              >
                Daftar Gratis
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition cursor-pointer"
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
              className="md:hidden bg-white border-t border-gray-200 shadow-lg"
            >
              <div className="px-4 py-6 space-y-2">
                <button onClick={() => scrollTo('features')} className="block w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-50 rounded-lg transition font-medium">Fitur</button>
                <button onClick={() => scrollTo('how-it-works')} className="block w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-50 rounded-lg transition font-medium">Cara Kerja</button>
                <button onClick={() => scrollTo('pricing')} className="block w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-50 rounded-lg transition font-medium">Harga</button>
                <button onClick={() => scrollTo('testimonials')} className="block w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-50 rounded-lg transition font-medium">Testimoni</button>
                <button onClick={() => scrollTo('faq')} className="block w-full text-left px-4 py-2.5 text-gray-700 hover:bg-gray-50 rounded-lg transition font-medium">FAQ</button>
                <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
                  <Link to="/login" className="block text-center px-4 py-2.5 text-gray-700 hover:bg-gray-50 rounded-lg font-medium border border-gray-200">Masuk</Link>
                  <Link to="/register" className="block text-center px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-sm">Daftar Gratis</Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>


      {/* ─── HERO SECTION ────────────────────────────────── */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-b from-blue-50/40 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="text-center max-w-3xl mx-auto">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-xs font-semibold text-blue-700 tracking-wide uppercase shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
                </span>
                Aplikasi Catatan Keuangan Pribadi & Usaha
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 mt-6 mb-6 leading-[1.15]"
            >
              Kelola Keuangan Harian
              <br />
              <span className="text-blue-600">
                Lebih Rapi & Praktis.
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              Catat pemasukan, pengeluaran, pantau anggaran dan lihat grafik arus kas secara otomatis. Sederhana, aman, dan mudah digunakan.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4"
            >
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 hover:shadow-lg transition-all active:scale-98"
              >
                <span>Mulai Sekarang — Gratis</span>
                <ArrowRight className="w-5 h-5" />
              </Link>

              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-semibold border border-gray-300 text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-all active:scale-98"
              >
                Masuk ke Akun
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="mt-12 flex flex-wrap items-center justify-center gap-6 text-gray-600 text-xs sm:text-sm font-medium"
            >
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Enkripsi Aman</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 hidden sm:block" />
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Tanpa Ribet</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 hidden sm:block" />
              <div className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>Akses dari HP & Laptop</span>
              </div>
            </motion.div>
          </div>

          {/* Dashboard Preview Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-16 max-w-5xl mx-auto"
          >
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-xl shadow-gray-200/50">
              {/* Browser bar */}
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-200 bg-gray-50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 ml-4">
                  <div className="max-w-xs mx-auto bg-white border border-gray-200 rounded-md px-4 py-1 text-xs text-gray-500 text-center font-mono">
                    fintrack.id/dashboard
                  </div>
                </div>
              </div>

              {/* Mock Dashboard Content */}
              <div className="p-6 md:p-8 bg-white">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Total Saldo', value: 'Rp 14.250.000', color: 'text-blue-700', bg: 'bg-blue-50/60 border-blue-100' },
                    { label: 'Pemasukan Bulan Ini', value: 'Rp 9.500.000', color: 'text-emerald-700', bg: 'bg-emerald-50/60 border-emerald-100' },
                    { label: 'Pengeluaran', value: 'Rp 4.120.000', color: 'text-rose-700', bg: 'bg-rose-50/60 border-rose-100' },
                    { label: 'Tabungan Disimpan', value: 'Rp 5.380.000', color: 'text-amber-700', bg: 'bg-amber-50/60 border-amber-100' },
                  ].map((card, i) => (
                    <div key={i} className={`${card.bg} border rounded-xl p-4 transition-all hover:shadow-xs`}>
                      <p className="text-xs text-gray-600 font-medium mb-1">{card.label}</p>
                      <p className={`text-base md:text-lg font-bold ${card.color} truncate`}>{card.value}</p>
                    </div>
                  ))}
                </div>

                {/* Mock Chart Area */}
                <div className="bg-gray-50/60 border border-gray-100 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Grafik Arus Kas 2026</span>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Terkini</span>
                  </div>
                  <div className="h-44 md:h-52 flex items-end gap-2 pt-2">
                    {[35, 55, 40, 70, 50, 80, 65, 90, 75, 60, 85, 95].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: 0.6, delay: 0.6 + i * 0.04 }}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 rounded-t-md transition-colors relative group cursor-pointer"
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-[10px] text-white px-2 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none shadow-sm">
                          {['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][i]}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>


      {/* ─── STATS COUNTER ───────────────────────────────── */}
      <Section className="py-16 border-y border-gray-100 bg-gray-50/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {[
              { value: 1200, suffix: '+', label: 'Pengguna Aktif', icon: Users },
              { value: 50000, suffix: '+', label: 'Transaksi Tercatat', icon: Receipt },
              { value: 99, suffix: '%', label: 'Tingkat Kepuasan', icon: Zap },
              { value: 4.9, suffix: '/5', label: 'Rating Ulasan', icon: Star },
            ].map((stat, i) => (
              <div key={i} className="text-center group">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 mb-3 group-hover:bg-blue-100/70 transition">
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-1">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </div>
                <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>


      {/* ─── FEATURES SECTION ────────────────────────────── */}
      <Section id="features" className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold tracking-wider uppercase mb-4">
              Fitur Lengkap
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              Semua Kebutuhan Finansial Anda
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-base sm:text-lg">
              Dari pencatatan harian yang sederhana hingga laporan grafik terperinci, semua tersaji dalam tampilan yang bersih dan mudah dipahami.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group relative p-7 rounded-2xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 hover:-translate-y-1"
              >
                {feat.premium && (
                  <span className="absolute top-5 right-5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Premium
                  </span>
                )}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feat.color} flex items-center justify-center mb-5 shadow-sm text-white group-hover:scale-105 transition-transform`}>
                  <feat.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feat.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>


      {/* ─── HOW IT WORKS ────────────────────────────────── */}
      <Section id="how-it-works" className="py-20 md:py-28 border-t border-gray-100 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold tracking-wider uppercase mb-4">
              Mudah & Cepat
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              Mulai dalam 3 Langkah Sederhana
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto text-base">
              Hanya butuh 1 menit untuk mendaftar dan mulai menata keuangan Anda.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {[
              { step: '01', title: 'Buat Akun Gratis', desc: 'Daftar dengan cepat menggunakan email Anda tanpa perlu kartu kredit.', icon: Users },
              { step: '02', title: 'Catat Arus Kas', desc: 'Masukkan pemasukan dan pengeluaran harian atau scan struk secara otomatis.', icon: Wallet },
              { step: '03', title: 'Pantau Perkembangan', desc: 'Lihat grafik pengeluaran, evaluasi pola belanja, dan capai target keuangan Anda.', icon: TrendingUp },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-xs hover:shadow-md transition-all relative"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 mb-6 relative">
                  <item.icon className="w-7 h-7" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-600 text-[10px] font-bold flex items-center justify-center text-white shadow-sm">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed max-w-xs mx-auto">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>


      {/* ─── PRICING PREVIEW ─────────────────────────────── */}
      <Section id="pricing" className="py-20 md:py-28 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold tracking-wider uppercase mb-4">
              Pilihan Paket
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              Pilih Paket Sesuai Kebutuhan
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto text-base">
              Gunakan paket gratis selamanya atau upgrade ke Premium untuk fitur otomatisasi tingkat lanjut.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="p-8 rounded-2xl border border-gray-200 bg-white shadow-xs hover:border-gray-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Paket Gratis</h3>
                    <p className="text-xs text-gray-500">Cocok untuk pencatatan mandiri</p>
                  </div>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-gray-900">Rp 0</span>
                  <span className="text-gray-500 text-sm ml-1.5">/selamanya</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {[
                    'Pencatatan pemasukan & pengeluaran',
                    'Dashboard ringkasan real-time',
                    'Grafik arus kas bulanan',
                    'Export data transaksi ke Excel',
                    'Kategori pengeluaran kustom',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                to="/register"
                className="block w-full text-center py-3.5 rounded-xl border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50 transition-all"
              >
                Mulai Gratis
              </Link>
            </div>

            {/* Premium Plan */}
            <div className="relative p-8 rounded-2xl border-2 border-blue-600 bg-gradient-to-b from-blue-50/50 via-white to-white shadow-lg shadow-blue-500/10 flex flex-col justify-between">
              {/* Popular badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="px-4 py-1 rounded-full bg-blue-600 text-white text-xs font-bold shadow-sm">
                  ⚡ Paling Populer
                </span>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Paket Premium</h3>
                    <p className="text-xs text-blue-600 font-medium">Fitur otomatisasi komplit</p>
                  </div>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-gray-900">Rp 29.000</span>
                  <span className="text-gray-500 text-sm ml-1.5">/bulan</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {[
                    'Semua fitur pada paket gratis',
                    'Scan struk otomatis dengan AI (OCR)',
                    'Laporan analisis keuangan mendalam',
                    'Multi-currency mata uang asing',
                    'Template laporan bisnis siap cetak',
                    'Prioritas layanan bantuan',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-gray-800">
                      <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                to="/pricing"
                className="block w-full text-center py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md shadow-blue-500/20"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  Lihat Detail Paket Premium
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </Section>


      {/* ─── TESTIMONIALS ────────────────────────────────── */}
      <Section id="testimonials" className="py-20 md:py-28 border-t border-gray-100 bg-gray-50/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold tracking-wider uppercase mb-4">
              Ulasan Pengguna
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              Apa Kata Pengguna FinTrack?
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-7 rounded-2xl border border-gray-200 bg-white shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  <p className="text-gray-700 text-sm leading-relaxed mb-6 italic">
                    "{t.text}"
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-gray-900 font-semibold text-sm">{t.name}</p>
                    <p className="text-gray-500 text-xs">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>


      {/* ─── FAQ SECTION ──────────────────────────────────── */}
      <Section id="faq" className="py-20 md:py-28 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold tracking-wider uppercase mb-4">
              Tanya Jawab
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              Pertanyaan yang Sering Diajukan
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
      <Section className="py-20 md:py-24 bg-gray-50/60 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="p-10 md:p-16 rounded-3xl border border-gray-200 bg-white shadow-md">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              Siap Menata Keuangan Anda Sekarang?
            </h2>
            <p className="text-gray-600 text-base md:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
              Bergabunglah bersama pengguna FinTrack lainnya untuk mencatat dan mengontrol pengeluaran dengan lebih teratur.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base transition-all shadow-md shadow-blue-500/20 active:scale-98"
              >
                Daftar Akun Gratis
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-gray-300 text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-semibold transition-all active:scale-98"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                Lihat Paket Premium
              </Link>
            </div>
          </div>
        </div>
      </Section>


      {/* ─── FOOTER ──────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <img src="/logo.jpg" alt="FinTrack" className="w-8 h-8 rounded-lg object-cover ring-1 ring-gray-200" />
                <span className="text-lg font-bold text-gray-900">FinTrack</span>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Aplikasi pencatatan keuangan pribadi dan usaha yang mudah, rapi, dan aman.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-gray-900 font-semibold text-sm mb-4">Navigasi</h4>
              <ul className="space-y-2.5">
                <li><button onClick={() => scrollTo('features')} className="text-gray-600 hover:text-blue-600 text-sm transition cursor-pointer">Fitur</button></li>
                <li><button onClick={() => scrollTo('how-it-works')} className="text-gray-600 hover:text-blue-600 text-sm transition cursor-pointer">Cara Kerja</button></li>
                <li><Link to="/pricing" className="text-gray-600 hover:text-blue-600 text-sm transition">Harga</Link></li>
                <li><button onClick={() => scrollTo('faq')} className="text-gray-600 hover:text-blue-600 text-sm transition cursor-pointer">FAQ</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-gray-900 font-semibold text-sm mb-4">Akun & Akses</h4>
              <ul className="space-y-2.5">
                <li><Link to="/login" className="text-gray-600 hover:text-blue-600 text-sm transition">Masuk ke Akun</Link></li>
                <li><Link to="/register" className="text-gray-600 hover:text-blue-600 text-sm transition">Daftar Akun Baru</Link></li>
                <li><Link to="/admin" className="text-gray-600 hover:text-blue-600 text-sm transition">Dashboard Transaksi</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-gray-900 font-semibold text-sm mb-4">Keamanan Data</h4>
              <ul className="space-y-2.5">
                <li className="flex items-center gap-2 text-gray-600 text-sm">
                  <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                  Enkripsi End-to-End
                </li>
                <li className="flex items-center gap-2 text-gray-600 text-sm">
                  <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                  Supabase Row Level Security
                </li>
                <li className="flex items-center gap-2 text-gray-600 text-sm">
                  <Globe className="w-4 h-4 text-blue-600 shrink-0" />
                  Cloud Hosting Terjamin
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="pt-8 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500">
            <p>
              &copy; {new Date().getFullYear()} FinTrack. Hak cipta dilindungi undang-undang.
            </p>
            <p className="font-mono text-gray-400">
              React &bull; Supabase &bull; Tailwind CSS
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
