import { useEffect, useState } from 'react';
import { fetchTransactions } from '../lib/api';
import { calculateStats, parseSafeDate } from '../utils/calculations';
import { formatCurrency } from '../utils/format';
import { Link } from 'react-router-dom';
import { LogIn, TrendingUp, ShieldCheck, BarChart3, ArrowDown, AlertTriangle, Quote, PieChart, PiggyBank, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const PublicDashboard = () => {
    const [stats, setStats] = useState({
        weeklyExpense: 0,
        monthlyExpense: 0,
        yearlyExpense: 0,
        weeklyIncome: 0,
        monthlyIncome: 0,
        yearlyIncome: 0,
        monthlyChartDataExpense: Array(12).fill(0),
        monthlyChartDataIncome: Array(12).fill(0)
    });
    const [transactions, setTransactions] = useState([]); // Store raw list
    const [loading, setLoading] = useState(true);
    const [activePeriod, setActivePeriod] = useState('all'); // all | week | month | year
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const data = await fetchTransactions();
            setTransactions(data);

            // Determine if we should use custom date range or standard period for stats
            let refDate = new Date(selectedYear, selectedMonth, 1);

            // If custom range is active, we might want to adjust how stats are shown
            // For now, let's keep stats tied to period/month selecting for clarity
            // and have the list/history respond to both.

            const calculatedCurrentStats = calculateStats(data, refDate);
            setStats(calculatedCurrentStats);
            setLoading(false);
        };

        loadData();
    }, [selectedMonth, selectedYear]);

    const chartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
            {
                label: 'Pemasukan (Income)',
                data: stats.monthlyChartDataIncome,
                backgroundColor: 'rgba(34, 197, 94, 0.7)', // Green-500
                hoverBackgroundColor: 'rgba(34, 197, 94, 1)',
                borderRadius: 4,
            },
            {
                label: 'Pengeluaran (Expense)',
                data: stats.monthlyChartDataExpense,
                backgroundColor: 'rgba(239, 68, 68, 0.7)', // Red-500
                hoverBackgroundColor: 'rgba(239, 68, 68, 1)',
                borderRadius: 4,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                align: 'end',
            },
            title: {
                display: false,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: '#f3f4f6'
                },
                ticks: {
                    callback: (value) => 'Rp ' + (value / 1000) + 'k'
                }
            },
            x: {
                grid: {
                    display: false
                }
            }
        }
    };

    const scrollToStats = () => {
        document.getElementById('stats-section').scrollIntoView({ behavior: 'smooth' });
    };

    // Helper to determine financial health
    const getFinancialHealth = (income, expense) => {
        if (income === 0) return { status: 'neutral', message: '' };
        const ratio = expense / income;
        if (ratio > 1) return { status: 'critical', message: 'Pengeluaran melebihi pemasukan! (Defisit)' };
        if (ratio > 0.8) return { status: 'warning', message: 'Pengeluaran hampir mendekati pemasukan (Boros)' };
        return { status: 'healthy', message: 'Keuangan sehat' };
    };

    const weeklyHealth = getFinancialHealth(stats.weeklyIncome, stats.weeklyExpense);
    const monthlyHealth = getFinancialHealth(stats.monthlyIncome, stats.monthlyExpense);

    // Filter Logic for Transaction List
    const filteredTransactions = transactions.filter(t => {
        const tDate = parseSafeDate(t.date);
        const tMonth = tDate.getMonth();
        const tYear = tDate.getFullYear();
        const now = new Date();

        if (activePeriod === 'week') {
            const startOfWeek = new Date(now);
            const day = now.getDay() || 7;
            startOfWeek.setDate(now.getDate() - day + 1);
            startOfWeek.setHours(0, 0, 0, 0);
            return tDate >= startOfWeek;
        } else if (activePeriod === 'month') {
            return tMonth === selectedMonth && tYear === selectedYear;
        } else if (activePeriod === 'year') {
            return tYear === selectedYear;
        }
        return true;
    });

    // Total stats for the public dashboard (all-time totals)
    const publicIncome = transactions.filter(t => t.type === 'pemasukan').reduce((acc, t) => acc + Number(t.amount), 0);
    const publicExpense = transactions.filter(t => t.type === 'pengeluaran').reduce((acc, t) => acc + Number(t.amount), 0);
    const publicBalance = publicIncome - publicExpense;

    // Category breakdown calculation for Doughnut Chart based on filtered transactions
    const expenseByCategory = {};
    filteredTransactions.forEach(t => {
        if (t.type === 'pengeluaran') {
            const category = (t.category || 'Lainnya').toLowerCase();
            expenseByCategory[category] = (expenseByCategory[category] || 0) + Number(t.amount);
        }
    });

    const doughnutLabels = Object.keys(expenseByCategory);
    const doughnutData = Object.values(expenseByCategory);

    const categoryChartData = {
        labels: doughnutLabels.length > 0 ? doughnutLabels : ['Tidak Ada Pengeluaran'],
        datasets: [
            {
                data: doughnutData.length > 0 ? doughnutData : [1],
                backgroundColor: doughnutData.length > 0 ? [
                    'rgba(59, 130, 246, 0.7)',   // Blue-500
                    'rgba(245, 158, 11, 0.7)',   // Amber-500
                    'rgba(16, 185, 129, 0.7)',   // Emerald-500
                    'rgba(139, 92, 246, 0.7)',   // Purple-500
                    'rgba(236, 72, 153, 0.7)',   // Pink-500
                    'rgba(239, 68, 68, 0.7)',    // Red-500
                    'rgba(6, 182, 212, 0.7)',    // Cyan-500
                    'rgba(107, 114, 128, 0.7)',  // Gray-500
                ] : ['rgba(229, 231, 235, 0.5)'],
                borderColor: doughnutData.length > 0 ? [
                    '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#ef4444', '#06b6d4', '#6b7280'
                ] : ['#e5e7eb'],
                borderWidth: 1,
            }
        ]
    };

    const categoryChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    boxWidth: 10,
                    font: { size: 10 }
                }
            },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        if (doughnutData.length === 0) return 'Belum ada pengeluaran';
                        const value = context.raw;
                        const total = doughnutData.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                    }
                }
            }
        }
    };

    // Animation Variants
    const fadeInUp = {
        hidden: { opacity: 0, y: 60 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans">
            {/* Navbar */}
            <nav className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-2">
                            <motion.div
                                initial={{ rotate: -180, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                transition={{ duration: 0.8 }}
                                className="bg-blue-600 p-1.5 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-white" />
                            </motion.div>
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
                                FinTrack
                            </h1>
                        </div>
                        <div className="flex items-center gap-6">
                            <button onClick={scrollToStats} className="text-gray-600 hover:text-blue-600 text-sm font-medium transition cursor-pointer">
                                Data Publik
                            </button>
                            <Link
                                to="/login"
                                className="flex items-center gap-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 px-4 py-2 rounded-full transition shadow-lg shadow-gray-200"
                            >
                                <LogIn className="w-4 h-4" />
                                Login
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-blue-50/50 to-white">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                    >
                        <span className="inline-block py-1 px-3 rounded-full bg-blue-100 text-blue-700 text-xs font-bold tracking-wide uppercase mb-6">
                            Transparansi Keuangan
                        </span>
                        <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
                            Kelola Keuangan dengan{" "}
                            <span className="hidden sm:inline"><br /></span>
                            <span className="text-blue-600">Lebih Cerdas & Terbuka.</span>
                        </h2>
                        <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Platform manajemen keuangan pribadi yang didesain untuk mencatat pemasukan
                            dan pengeluaran secara terstruktur, transparan, dan mudah dipahami melalui visualisasi data.
                        </p>
                        <div className="flex justify-center gap-4">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={scrollToStats}
                                className="group bg-blue-600 text-white px-8 py-3.5 rounded-full font-semibold hover:bg-blue-700 transition flex items-center gap-2 shadow-xl shadow-blue-200"
                            >
                                Lihat Statistik
                                <ArrowDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Quote Section */}
            <motion.section
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="bg-[#1e293b] text-white py-12 px-4 relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-32 h-32 bg-lime-400 rounded-full blur-[80px] opacity-20"></div>
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[80px] opacity-20"></div>
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <Quote className="w-12 h-12 text-lime-400 mx-auto mb-6 opacity-80" />
                    <blockquote className="text-xl md:text-2xl font-serif italic leading-relaxed text-gray-200 mb-6">
                        "Jangan menabung apa yang tersisa setelah membelanjakan, tetapi belanjakan apa yang tersisa setelah menabung."
                    </blockquote>
                    <cite className="text-lime-400 font-bold tracking-wide uppercase text-sm">— Warren Buffett</cite>
                </div>
            </motion.section>

            {/* About / Features Section */}
            <section className="py-20 px-4 border-t border-gray-100">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={staggerContainer}
                    className="max-w-7xl mx-auto"
                >
                    <div className="grid md:grid-cols-3 gap-12">
                        <motion.div variants={fadeInUp} className="text-center p-6 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-xl transition duration-300">
                            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Data Terjamin</h3>
                            <p className="text-gray-500 leading-relaxed">Seluruh data transaksi dicatat dengan aman dan hanya admin yang dapat mengubahnya.</p>
                        </motion.div>
                        <motion.div variants={fadeInUp} className="text-center p-6 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-xl transition duration-300">
                            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <BarChart3 className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Visualisasi Interaktif</h3>
                            <p className="text-gray-500 leading-relaxed">Grafik dinamis memudahkan Anda melihat tren keuangan mingguan hingga tahunan.</p>
                        </motion.div>
                        <motion.div variants={fadeInUp} className="text-center p-6 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-xl transition duration-300">
                            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Pantau Progress</h3>
                            <p className="text-gray-500 leading-relaxed">Monitoring cashflow secara real-time untuk keputusan finansial yang lebih baik.</p>
                        </motion.div>
                    </div>
                </motion.div>
            </section>


            {/* Financial Education Section */}
            <section className="py-20 px-4 bg-white border-t border-gray-100">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={staggerContainer}
                    className="max-w-7xl mx-auto"
                >
                    <div className="text-center mb-16">
                        <motion.span variants={fadeInUp} className="text-blue-600 font-bold tracking-wider text-xs uppercase bg-blue-50 px-3 py-1 rounded-full">Edukasi</motion.span>
                        <motion.h2 variants={fadeInUp} className="text-3xl font-bold text-gray-900 mt-3 mb-4">Tips Keuangan Cerdas</motion.h2>
                        <motion.p variants={fadeInUp} className="text-gray-500 max-w-2xl mx-auto">Kelola uang Anda dengan bijak menggunakan prinsip-prinsip dasar keuangan yang telah terbukti ini.</motion.p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Tip 1 */}
                        <motion.div variants={fadeInUp} className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-blue-100 hover:shadow-lg transition group">
                            <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <PieChart className="w-7 h-7 text-indigo-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-3">Metode 50/30/20</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Alokasikan pendapatan Anda: <span className="font-bold text-gray-700">50%</span> untuk Kebutuhan (Needs), <span className="font-bold text-gray-700">30%</span> untuk Keinginan (Wants), dan <span className="font-bold text-gray-700">20%</span> untuk Tabungan & Investasi.
                            </p>
                        </motion.div>

                        {/* Tip 2 */}
                        <motion.div variants={fadeInUp} className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-blue-100 hover:shadow-lg transition group">
                            <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <PiggyBank className="w-7 h-7 text-emerald-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-3">Dana Darurat</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Siapkan dana cair setara <span className="font-bold text-gray-700">3-6 bulan</span> pengeluaran rutin. Ini adalah jaring pengaman Anda saat terjadi hal tak terduga seperti sakit atau PHK.
                            </p>
                        </motion.div>

                        {/* Tip 3 */}
                        <motion.div variants={fadeInUp} className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-blue-100 hover:shadow-lg transition group">
                            <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Lightbulb className="w-7 h-7 text-amber-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-3">Investasi Leher ke Atas</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Investasi terbaik adalah pada diri sendiri. Tingkatkan <span className="font-bold text-gray-700">skill dan pengetahuan</span> Anda untuk meningkatkan potensi penghasilan di masa depan.
                            </p>
                        </motion.div>
                    </div>
                </motion.div>
            </section>

            {/* Stats Section */}
            <section id="stats-section" className="py-24 px-4 bg-gray-50">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeInUp}
                    className="max-w-7xl mx-auto"
                >
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Ringkasan Keuangan</h2>
                        <p className="text-gray-500">Data berikut diambil secara real-time dari database.</p>
                    </div>

                    <div className="flex flex-col gap-6 mb-10">
                        {/* Quick Period Filter Buttons */}
                        <div className="flex flex-wrap justify-center gap-2">
                            {[
                                { id: 'all', label: 'Semua' },
                                { id: 'week', label: 'Minggu Ini' },
                                { id: 'month', label: 'Bulan Ini' },
                                { id: 'year', label: 'Tahun Ini' }
                            ].map((period) => (
                                <button
                                    key={period.id}
                                    onClick={() => {
                                        setActivePeriod(period.id);
                                        if (period.id === 'month' || period.id === 'all') {
                                            setSelectedMonth(new Date().getMonth());
                                            setSelectedYear(new Date().getFullYear());
                                        }
                                    }}
                                    className={`px-4 py-2 text-sm font-bold rounded-full transition-all border ${activePeriod === period.id
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                                        }`}
                                >
                                    {period.label}
                                </button>
                            ))}
                        </div>

                        {/* Custom Month/Year Dropdowns - Re-added for convenience */}
                        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 bg-white p-6 rounded-2xl border-2 border-blue-50 shadow-sm max-w-xl mx-auto w-full">
                            <div className="flex items-center gap-2 mb-2 sm:mb-0">
                                <span className="text-blue-600 font-bold text-xs uppercase tracking-wider">Cari Per Bulan:</span>
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Bulan</label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => {
                                        setSelectedMonth(parseInt(e.target.value));
                                        setActivePeriod('month');
                                    }}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer hover:border-blue-300"
                                >
                                    {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((month, idx) => (
                                        <option key={idx} value={idx}>{month}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Tahun</label>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => {
                                        setSelectedYear(parseInt(e.target.value));
                                        setActivePeriod('year');
                                    }}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer hover:border-blue-300"
                                >
                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">

                        {/* WARNING BANNERS */}
                        {(weeklyHealth.status !== 'healthy' && weeklyHealth.status !== 'neutral') && (
                            <div className={`sm:col-span-2 lg:col-span-4 p-4 rounded-xl flex items-center gap-3 ${weeklyHealth.status === 'critical' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-yellow-100 text-yellow-800 border border-yellow-200'}`}>
                                <AlertTriangle className="w-6 h-6 shrink-0" />
                                <div>
                                    <p className="font-bold">Peringatan Keuangan Mingguan:</p>
                                    <p className="text-sm">{weeklyHealth.message}</p>
                                </div>
                            </div>
                        )}
                        {(monthlyHealth.status !== 'healthy' && monthlyHealth.status !== 'neutral') && (
                            <div className={`sm:col-span-2 lg:col-span-4 p-4 rounded-xl flex items-center gap-3 ${monthlyHealth.status === 'critical' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-yellow-100 text-yellow-800 border border-yellow-200'}`}>
                                <AlertTriangle className="w-6 h-6 shrink-0" />
                                <div>
                                    <p className="font-bold">Peringatan Keuangan Bulanan:</p>
                                    <p className="text-sm">{monthlyHealth.message}</p>
                                </div>
                            </div>
                        )}

                        {/* Card 0: Saldo Bersih */}
                        <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-8 rounded-2xl shadow-md hover:shadow-lg transition relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                            <div className="absolute -right-6 -bottom-6 opacity-10">
                                <PiggyBank className="w-32 h-32 text-white" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest mb-1">Total Saldo Bersih</p>
                                <h3 className="text-2xl md:text-3xl font-black tracking-tight mt-1 truncate">
                                    {loading ? '...' : formatCurrency(publicBalance)}
                                </h3>
                            </div>
                            <div className="space-y-1.5 border-t border-white/20 pt-3 mt-4">
                                <div className="flex justify-between text-xs text-blue-100">
                                    <span>Pemasukan:</span>
                                    <span className="font-bold text-green-300">{loading ? '...' : formatCurrency(publicIncome)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-blue-100">
                                    <span>Pengeluaran:</span>
                                    <span className="font-bold text-red-300">{loading ? '...' : formatCurrency(publicExpense)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Card 1: Weekly */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                            <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-4">Mingguan</p>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-green-600 font-bold uppercase">Pemasukan</p>
                                    <h3 className="text-xl font-bold text-gray-900">
                                        {loading ? '...' : formatCurrency(stats.weeklyIncome)}
                                    </h3>
                                </div>
                                <div className="border-t pt-2">
                                    <p className="text-xs text-red-600 font-bold uppercase">Pengeluaran</p>
                                    <h3 className="text-xl font-bold text-gray-900">
                                        {loading ? '...' : formatCurrency(stats.weeklyExpense)}
                                    </h3>
                                </div>
                            </div>
                            <div className="mt-4 text-gray-400 text-xs">
                                7 hari terakhir
                            </div>
                        </div>

                        {/* Card 2: Monthly */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <BarChart3 className="w-24 h-24" />
                            </div>
                            <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-4">Bulanan</p>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-green-600 font-bold uppercase">Pemasukan</p>
                                    <h3 className="text-2xl font-bold text-green-600">
                                        {loading ? '...' : formatCurrency(stats.monthlyIncome)}
                                    </h3>
                                </div>
                                <div className="border-t pt-2">
                                    <p className="text-xs text-red-600 font-bold uppercase">Pengeluaran</p>
                                    <h3 className="text-2xl font-bold text-red-600">
                                        {loading ? '...' : formatCurrency(stats.monthlyExpense)}
                                    </h3>
                                </div>
                            </div>
                            <div className="mt-4 text-gray-400 text-xs">
                                {activePeriod === 'month' ? `Bulan ${['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][selectedMonth]} ${selectedYear}` : 'Bulan ini'}
                            </div>
                        </div>

                        {/* Card 3: Yearly */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                            <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-4">Tahunan</p>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-green-600 font-bold uppercase">Pemasukan</p>
                                    <h3 className="text-xl font-bold text-gray-900">
                                        {loading ? '...' : formatCurrency(stats.yearlyIncome)}
                                    </h3>
                                </div>
                                <div className="border-t pt-2">
                                    <p className="text-xs text-red-600 font-bold uppercase">Pengeluaran</p>
                                    <h3 className="text-xl font-bold text-gray-900">
                                        {loading ? '...' : formatCurrency(stats.yearlyExpense)}
                                    </h3>
                                </div>
                            </div>
                            <div className="mt-4 text-gray-400 text-xs">
                                {activePeriod === 'year' ? `Tahun ${selectedYear}` : 'Tahun berjalan'}
                            </div>
                        </div>

                    </div>

                    {/* Chart Section Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Bar Chart (Income vs Expense) */}
                        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
                            <div className="flex justify-between items-end mb-8">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Grafik Arus Kas</h3>
                                    <p className="text-gray-500 text-sm mt-1">Perbandingan Pemasukan & Pengeluaran Bulanan</p>
                                </div>
                            </div>
                            <div className="h-80 w-full">
                                {loading ? (
                                    <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl">Memuat Grafik...</div>
                                ) : (
                                    <Bar options={chartOptions} data={chartData} />
                                )}
                            </div>
                        </div>

                        {/* Doughnut Chart (Expense Category Breakdown) */}
                        <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
                            <div className="mb-8">
                                <h3 className="text-xl font-bold text-gray-900">Distribusi Pengeluaran</h3>
                                <p className="text-gray-500 text-sm mt-1">Berdasarkan kategori pengeluaran</p>
                            </div>
                            <div className="h-64 w-full flex items-center justify-center">
                                {loading ? (
                                    <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl">Memuat Grafik...</div>
                                ) : (
                                    <Doughnut options={categoryChartOptions} data={categoryChartData} />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Recent Transactions Section */}
                    <div className="mt-12 bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="p-8 border-b border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900">Riwayat Transaksi Terbaru</h3>
                            <p className="text-gray-500 text-sm mt-1">Daftar pemasukan dan pengeluaran tercatat</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-8 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal</th>
                                        <th className="px-8 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kategori</th>
                                        <th className="px-8 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Jumlah</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {loading ? (
                                        <tr><td colSpan="3" className="px-8 py-8 text-center text-gray-500">Memuat data...</td></tr>
                                    ) : filteredTransactions.slice(0, 10).map((t) => ( // Show only top 10 from filtered
                                        <tr key={t.id} className="hover:bg-gray-50/50 transition">
                                            <td className="px-8 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </td>
                                            <td className="px-8 py-4">
                                                <div className="text-sm font-medium text-gray-900">{t.category?.toLowerCase()}</div>
                                                <div className="text-xs text-gray-400">{t.description}</div>
                                            </td>
                                            <td className={`px-8 py-4 whitespace-nowrap text-right text-sm font-bold ${t.type === 'pemasukan' ? 'text-green-600' : 'text-red-500'}`}>
                                                {t.type === 'pemasukan' ? '+' : '-'} {formatCurrency(t.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                    {!loading && filteredTransactions.length === 0 && (
                                        <tr><td colSpan="3" className="px-8 py-8 text-center text-gray-500 italic">Belum ada transaksi tercatat untuk periode ini.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {!loading && filteredTransactions.length > 10 && (
                            <div className="p-4 bg-gray-50 text-center text-xs text-gray-400">
                                Menampilkan 10 transaksi terbaru untuk periode terpilih
                            </div>
                        )}
                    </div>
                </motion.div>
            </section>
            <footer className="bg-white border-t py-12 text-center text-gray-400 text-sm">
                <p>&copy; {new Date().getFullYear()} FinTrack. Dibuat untuk manajemen keuangan yang lebih baik.</p>
            </footer>
        </div >
    );
};

export default PublicDashboard;
