import { useEffect, useState, useMemo } from 'react';
import { fetchTransactions } from '../lib/api';
import { calculateStats, parseSafeDate } from '../utils/calculations';
import { normalizeCategory } from '../utils/format';
import { Link } from 'react-router-dom';
import { LogIn, TrendingUp, ShieldCheck, BarChart3, ArrowDown, AlertTriangle, Quote, PieChart, PiggyBank, Lightbulb, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '../hooks/useLanguage';
import { usePageTitle } from '../hooks/usePageTitle';
import LanguageSwitcher from '../components/LanguageSwitcher';
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

const capitalizeText = (str) => {
    if (!str) return '';
    return str.split(' ').map(word => {
        if (!word) return '';
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
};

const MONTH_NAMES = {
    id: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const MONTH_SHORT = {
    id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

const PublicDashboard = () => {
    const { t, lang, formatCurrency, formatDate, formatCompact } = useLanguage();
    usePageTitle('public.title');

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
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activePeriod, setActivePeriod] = useState('all'); // all | week | month | year
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const data = await fetchTransactions();
            setTransactions(data || []);

            const refDate = new Date(selectedYear, selectedMonth, 1);
            const calculatedCurrentStats = calculateStats(data || [], refDate);
            setStats(calculatedCurrentStats);
            setLoading(false);
        };

        loadData();
    }, [selectedMonth, selectedYear]);

    const monthShortLabels = useMemo(() => MONTH_SHORT[lang] || MONTH_SHORT.id, [lang]);
    const monthFullLabels = useMemo(() => MONTH_NAMES[lang] || MONTH_NAMES.id, [lang]);

    const chartData = useMemo(() => ({
        labels: monthShortLabels,
        datasets: [
            {
                label: t('type.income'),
                data: stats.monthlyChartDataIncome,
                backgroundColor: 'rgba(34, 197, 94, 0.7)',
                hoverBackgroundColor: 'rgba(34, 197, 94, 1)',
                borderRadius: 4,
            },
            {
                label: t('type.expense'),
                data: stats.monthlyChartDataExpense,
                backgroundColor: 'rgba(239, 68, 68, 0.7)',
                hoverBackgroundColor: 'rgba(239, 68, 68, 1)',
                borderRadius: 4,
            },
        ],
    }), [monthShortLabels, stats, t]);

    const chartOptions = useMemo(() => ({
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
            tooltip: {
                backgroundColor: 'white',
                titleColor: '#111827',
                bodyColor: '#374151',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                padding: 10,
                callbacks: {
                    label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw || 0)}`
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: '#f3f4f6'
                },
                ticks: {
                    color: '#6b7280',
                    callback: (value) => 'Rp ' + formatCompact(value)
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    color: '#6b7280'
                }
            }
        }
    }), [formatCurrency, formatCompact]);

    const scrollToStats = () => {
        document.getElementById('stats-section')?.scrollIntoView({ behavior: 'smooth' });
    };

    const getFinancialHealth = (income, expense) => {
        if (income === 0) return { status: 'neutral', message: '' };
        const ratio = expense / income;
        if (ratio > 1) return { status: 'critical', message: t('public.financialCritical') };
        if (ratio > 0.8) return { status: 'warning', message: t('public.financialWarning') };
        return { status: 'healthy', message: t('public.financialHealthy') };
    };

    const weeklyHealth = getFinancialHealth(stats.weeklyIncome, stats.weeklyExpense);
    const monthlyHealth = getFinancialHealth(stats.monthlyIncome, stats.monthlyExpense);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tItem => {
            const tDate = parseSafeDate(tItem.date);
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
    }, [transactions, activePeriod, selectedMonth, selectedYear]);

    const publicIncome = useMemo(() => transactions.filter(tItem => tItem.type === 'pemasukan').reduce((acc, tItem) => acc + Number(tItem.amount), 0), [transactions]);
    const publicExpense = useMemo(() => transactions.filter(tItem => tItem.type === 'pengeluaran').reduce((acc, tItem) => acc + Number(tItem.amount), 0), [transactions]);
    const publicBalance = publicIncome - publicExpense;

    const expenseByCategory = useMemo(() => {
        const result = {};
        filteredTransactions.forEach(tItem => {
            if (tItem.type === 'pengeluaran') {
                const rawCategory = normalizeCategory(tItem.category, tItem.type);
                const categoryLabel = t(`categories.${rawCategory}`) || capitalizeText(rawCategory);
                result[categoryLabel] = (result[categoryLabel] || 0) + Number(tItem.amount);
            }
        });
        return result;
    }, [filteredTransactions, t]);

    const doughnutLabels = Object.keys(expenseByCategory);
    const doughnutData = Object.values(expenseByCategory);

    const categoryChartData = useMemo(() => ({
        labels: doughnutLabels.length > 0 ? doughnutLabels : [t('public.noExpenseData')],
        datasets: [
            {
                data: doughnutData.length > 0 ? doughnutData : [1],
                backgroundColor: doughnutData.length > 0 ? [
                    'rgba(59, 130, 246, 0.7)',
                    'rgba(245, 158, 11, 0.7)',
                    'rgba(16, 185, 129, 0.7)',
                    'rgba(139, 92, 246, 0.7)',
                    'rgba(236, 72, 153, 0.7)',
                    'rgba(239, 68, 68, 0.7)',
                    'rgba(6, 182, 212, 0.7)',
                    'rgba(107, 114, 128, 0.7)',
                ] : ['rgba(229, 231, 235, 0.5)'],
                borderColor: doughnutData.length > 0 ? [
                    '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#ef4444', '#06b6d4', '#6b7280'
                ] : ['#e5e7eb'],
                borderWidth: 1,
            }
        ]
    }), [doughnutLabels, doughnutData, t]);

    const categoryChartOptions = useMemo(() => ({
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
                        if (doughnutData.length === 0) return t('public.noExpenseData');
                        const value = context.raw;
                        const total = doughnutData.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                    }
                }
            }
        }
    }), [doughnutData, formatCurrency, t]);

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
                        <Link to="/" className="flex items-center gap-3">
                            <motion.img
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5 }}
                                src="/logo.jpg"
                                alt="Logo Keuangan"
                                width="36"
                                height="36"
                                decoding="async"
                                loading="eager"
                                className="w-9 h-9 rounded-lg object-cover shadow-sm"
                            />
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
                                {t('appName')}
                            </h1>
                        </Link>
                        <div className="flex items-center gap-3 sm:gap-4">
                            <button onClick={scrollToStats} className="hidden sm:inline-block text-gray-700 hover:text-blue-600 text-sm font-medium transition cursor-pointer">
                                {t('public.title')}
                            </button>
                            <Link to="/pricing" className="text-amber-600 hover:text-amber-700 text-sm font-bold transition flex items-center gap-1">
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                <span className="hidden sm:inline">{t('nav.upgradePremium')}</span>
                            </Link>
                            <LanguageSwitcher variant="header" />
                            <Link
                                to="/login"
                                className="flex items-center gap-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 px-3.5 py-1.5 rounded-full transition shadow-lg shadow-gray-200"
                            >
                                <LogIn className="w-4 h-4" />
                                <span>{t('public.loginAdmin')}</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main id="main-content">
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
                                {t('home.badge')}
                            </span>
                            <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
                                {t('public.heroTitle')}
                            </h2>
                            <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                                {t('public.heroSubtitle')}
                            </p>
                            <div className="flex justify-center gap-4">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={scrollToStats}
                                    className="group bg-blue-600 text-white px-8 py-3.5 rounded-full font-semibold hover:bg-blue-700 transition flex items-center gap-2 shadow-xl shadow-blue-200"
                                >
                                    {t('public.scrollDown')}
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
                            &ldquo;Jangan menabung apa yang tersisa setelah membelanjakan, tetapi belanjakan apa yang tersisa setelah menabung.&rdquo;
                        </blockquote>
                        <cite className="text-lime-400 font-bold tracking-wide uppercase text-sm">&mdash; Warren Buffett</cite>
                    </div>
                </motion.section>

                {/* Features Section */}
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
                                <h3 className="text-xl font-bold mb-2">{t('home.feature3Title')}</h3>
                                <p className="text-gray-500 leading-relaxed">{t('home.feature3Desc')}</p>
                            </motion.div>
                            <motion.div variants={fadeInUp} className="text-center p-6 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-xl transition duration-300">
                                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                                    <BarChart3 className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">{t('home.feature4Title')}</h3>
                                <p className="text-gray-500 leading-relaxed">{t('home.feature4Desc')}</p>
                            </motion.div>
                            <motion.div variants={fadeInUp} className="text-center p-6 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-xl transition duration-300">
                                <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">{t('home.feature2Title')}</h3>
                                <p className="text-gray-500 leading-relaxed">{t('home.feature2Desc')}</p>
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
                            <motion.span variants={fadeInUp} className="text-blue-600 font-bold tracking-wider text-xs uppercase bg-blue-50 px-3 py-1 rounded-full">{t('public.insight')}</motion.span>
                            <motion.h2 variants={fadeInUp} className="text-3xl font-bold text-gray-900 mt-3 mb-4">{t('public.financialTips')}</motion.h2>
                            <motion.p variants={fadeInUp} className="text-gray-500 max-w-2xl mx-auto">Kelola uang Anda dengan bijak menggunakan prinsip-prinsip dasar keuangan yang telah terbukti ini.</motion.p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            <motion.div variants={fadeInUp} className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-blue-100 hover:shadow-lg transition group">
                                <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <PieChart className="w-7 h-7 text-indigo-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-3">Metode 50/30/20</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">
                                    Alokasikan pendapatan Anda: <span className="font-bold text-gray-700">50%</span> untuk Kebutuhan, <span className="font-bold text-gray-700">30%</span> untuk Keinginan, dan <span className="font-bold text-gray-700">20%</span> untuk Tabungan & Investasi.
                                </p>
                            </motion.div>

                            <motion.div variants={fadeInUp} className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-blue-100 hover:shadow-lg transition group">
                                <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <PiggyBank className="w-7 h-7 text-emerald-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-3">Dana Darurat</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">
                                    Siapkan dana cair setara <span className="font-bold text-gray-700">3-6 bulan</span> pengeluaran rutin sebagai jaring pengaman kondisi tak terduga.
                                </p>
                            </motion.div>

                            <motion.div variants={fadeInUp} className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-blue-100 hover:shadow-lg transition group">
                                <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <Lightbulb className="w-7 h-7 text-amber-500" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-3">Investasi Leher ke Atas</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">
                                    Investasi terbaik adalah pada diri sendiri. Tingkatkan <span className="font-bold text-gray-700">keahlian & pengetahuan</span> untuk memperluas potensi pendapatan.
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
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('nav.reports')}</h2>
                            <p className="text-gray-500">{t('public.showingLatest')}</p>
                        </div>

                        <div className="flex flex-col gap-6 mb-10">
                            {/* Quick Period Filter Buttons */}
                            <div className="flex flex-wrap justify-center gap-2">
                                {[
                                    { id: 'all', label: t('period.all') },
                                    { id: 'week', label: t('period.week') },
                                    { id: 'month', label: t('period.month') },
                                    { id: 'year', label: t('period.year') }
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

                            {/* Custom Month/Year Dropdowns */}
                            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 bg-white p-6 rounded-2xl border-2 border-blue-50 shadow-sm max-w-xl mx-auto w-full">
                                <div className="flex items-center gap-2 mb-2 sm:mb-0">
                                    <span className="text-blue-600 font-bold text-xs uppercase tracking-wider">{t('search')}:</span>
                                </div>
                                <div className="flex-1 w-full">
                                    <label htmlFor="select-month" className="block text-[10px] font-bold text-gray-700 uppercase mb-1 ml-1">{t('period.month')}</label>
                                    <select
                                        id="select-month"
                                        aria-label="Pilih Bulan Data Transaksi"
                                        value={selectedMonth}
                                        onChange={(e) => {
                                            setSelectedMonth(parseInt(e.target.value));
                                            setActivePeriod('month');
                                        }}
                                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer hover:border-blue-300"
                                    >
                                        {monthFullLabels.map((month, idx) => (
                                            <option key={idx} value={idx}>{month}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1 w-full">
                                    <label htmlFor="select-year" className="block text-[10px] font-bold text-gray-700 uppercase mb-1 ml-1">{t('period.year')}</label>
                                    <select
                                        id="select-year"
                                        aria-label="Pilih Tahun Data Transaksi"
                                        value={selectedYear}
                                        onChange={(e) => {
                                            setSelectedYear(parseInt(e.target.value));
                                            setActivePeriod('year');
                                        }}
                                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer hover:border-blue-300"
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
                                        <p className="font-bold">{t('period.week')}:</p>
                                        <p className="text-sm">{weeklyHealth.message}</p>
                                    </div>
                                </div>
                            )}
                            {(monthlyHealth.status !== 'healthy' && monthlyHealth.status !== 'neutral') && (
                                <div className={`sm:col-span-2 lg:col-span-4 p-4 rounded-xl flex items-center gap-3 ${monthlyHealth.status === 'critical' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-yellow-100 text-yellow-800 border border-yellow-200'}`}>
                                    <AlertTriangle className="w-6 h-6 shrink-0" />
                                    <div>
                                        <p className="font-bold">{t('period.month')}:</p>
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
                                    <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest mb-1">{t('public.balance')}</p>
                                    <h3 className="text-2xl md:text-3xl font-black tracking-tight mt-1 truncate">
                                        {loading ? '...' : formatCurrency(publicBalance)}
                                    </h3>
                                </div>
                                <div className="space-y-1.5 border-t border-white/20 pt-3 mt-4">
                                    <div className="flex justify-between text-xs text-blue-100">
                                        <span>{t('public.totalIncome')}:</span>
                                        <span className="font-bold text-green-300">{loading ? '...' : formatCurrency(publicIncome)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-blue-100">
                                        <span>{t('public.totalExpense')}:</span>
                                        <span className="font-bold text-red-300">{loading ? '...' : formatCurrency(publicExpense)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Card 1: Weekly */}
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                                <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-4">{t('public.week')}</p>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs text-green-600 font-bold uppercase">{t('type.income')}</p>
                                        <h3 className="text-xl font-bold text-gray-900">
                                            {loading ? '...' : formatCurrency(stats.weeklyIncome)}
                                        </h3>
                                    </div>
                                    <div className="border-t pt-2">
                                        <p className="text-xs text-red-600 font-bold uppercase">{t('type.expense')}</p>
                                        <h3 className="text-xl font-bold text-gray-900">
                                            {loading ? '...' : formatCurrency(stats.weeklyExpense)}
                                        </h3>
                                    </div>
                                </div>
                                <div className="mt-4 text-gray-400 text-xs">
                                    7 {t('records')}
                                </div>
                            </div>

                            {/* Card 2: Monthly */}
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <BarChart3 className="w-24 h-24" />
                                </div>
                                <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-4">{t('public.month')}</p>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs text-green-600 font-bold uppercase">{t('type.income')}</p>
                                        <h3 className="text-2xl font-bold text-green-600">
                                            {loading ? '...' : formatCurrency(stats.monthlyIncome)}
                                        </h3>
                                    </div>
                                    <div className="border-t pt-2">
                                        <p className="text-xs text-red-600 font-bold uppercase">{t('type.expense')}</p>
                                        <h3 className="text-2xl font-bold text-red-600">
                                            {loading ? '...' : formatCurrency(stats.monthlyExpense)}
                                        </h3>
                                    </div>
                                </div>
                                <div className="mt-4 text-gray-400 text-xs">
                                    {activePeriod === 'month' ? `${monthFullLabels[selectedMonth]} ${selectedYear}` : t('period.month')}
                                </div>
                            </div>

                            {/* Card 3: Yearly */}
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                                <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-4">{t('public.year')}</p>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs text-green-600 font-bold uppercase">{t('type.income')}</p>
                                        <h3 className="text-xl font-bold text-gray-900">
                                            {loading ? '...' : formatCurrency(stats.yearlyIncome)}
                                        </h3>
                                    </div>
                                    <div className="border-t pt-2">
                                        <p className="text-xs text-red-600 font-bold uppercase">{t('type.expense')}</p>
                                        <h3 className="text-xl font-bold text-gray-900">
                                            {loading ? '...' : formatCurrency(stats.yearlyExpense)}
                                        </h3>
                                    </div>
                                </div>
                                <div className="mt-4 text-gray-400 text-xs">
                                    {activePeriod === 'year' ? `${t('period.year')} ${selectedYear}` : t('period.year')}
                                </div>
                            </div>
                        </div>

                        {/* Chart Section Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Bar Chart (Income vs Expense) */}
                            <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
                                <div className="flex justify-between items-end mb-8">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">{t('public.chartTitle', { year: selectedYear })}</h3>
                                        <p className="text-gray-500 text-sm mt-1">{t('public.heroSubtitle')}</p>
                                    </div>
                                </div>
                                <div className="h-80 w-full">
                                    {loading ? (
                                        <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl">{t('public.loadingData')}</div>
                                    ) : (
                                        <Bar options={chartOptions} data={chartData} />
                                    )}
                                </div>
                            </div>

                            {/* Doughnut Chart (Expense Category Breakdown) */}
                            <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
                                <div className="mb-8">
                                    <h3 className="text-xl font-bold text-gray-900">{t('public.categoryBreakdown')}</h3>
                                    <p className="text-gray-500 text-sm mt-1">{t('transactions.category')}</p>
                                </div>
                                <div className="h-64 w-full flex items-center justify-center">
                                    {loading ? (
                                        <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl">{t('public.loadingData')}</div>
                                    ) : (
                                        <Doughnut options={categoryChartOptions} data={categoryChartData} />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Recent Transactions Section */}
                        <div className="mt-12 bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                            <div className="p-8 border-b border-gray-100">
                                <h3 className="text-xl font-bold text-gray-900">{t('public.recentTransactions')}</h3>
                                <p className="text-gray-500 text-sm mt-1">{t('public.showingLatest')}</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th className="px-8 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('transactions.date')}</th>
                                            <th className="px-8 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('transactions.category')}</th>
                                            <th className="px-8 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('transactions.amount')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {loading ? (
                                            <tr><td colSpan="3" className="px-8 py-8 text-center text-gray-500">{t('public.loadingData')}</td></tr>
                                        ) : filteredTransactions.slice(0, 10).map((tItem) => (
                                            <tr key={tItem.id} className="hover:bg-gray-50/50 transition">
                                                <td className="px-8 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {formatDate(tItem.date)}
                                                </td>
                                                <td className="px-8 py-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {t(`categories.${normalizeCategory(tItem.category, tItem.type)}`) || capitalizeText(tItem.category)}
                                                    </div>
                                                    {tItem.description && tItem.description !== '-' && <div className="text-xs text-gray-400">{tItem.description}</div>}
                                                </td>
                                                <td className={`px-8 py-4 whitespace-nowrap text-right text-sm font-bold ${tItem.type === 'pemasukan' ? 'text-green-600' : 'text-red-500'}`}>
                                                    {tItem.type === 'pemasukan' ? '+' : '-'} {formatCurrency(tItem.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                        {!loading && filteredTransactions.length === 0 && (
                                            <tr><td colSpan="3" className="px-8 py-8 text-center text-gray-500 italic">{t('public.noTransactions')}</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {!loading && filteredTransactions.length > 10 && (
                                <div className="p-4 bg-gray-50 text-center text-xs text-gray-400">
                                    {t('public.showingLatest')}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </section>
            </main>
            <footer className="bg-white border-t py-12 text-center text-gray-600 text-sm">
                <p>{t('public.footer', { year: new Date().getFullYear() })}</p>
            </footer>
        </div>
    );
};

export default PublicDashboard;
