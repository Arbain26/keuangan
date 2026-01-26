import { useEffect, useState } from 'react';
import { fetchTransactions } from '../lib/api';
import { calculateStats } from '../utils/calculations';
import { formatCurrency } from '../utils/format';
import { Link } from 'react-router-dom';
import { LogIn, TrendingUp, ShieldCheck, BarChart3, ArrowDown, AlertTriangle, Quote, PieChart, PiggyBank, Lightbulb } from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
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

    useEffect(() => {
        const loadData = async () => {
            const data = await fetchTransactions();
            const calculatedCurrentStats = calculateStats(data);
            setStats(calculatedCurrentStats);
            setTransactions(data);
            setLoading(false);
        };

        loadData();
    }, []);

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

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans">
            {/* Navbar */}
            <nav className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-2">
                            <div className="bg-blue-600 p-1.5 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-white" />
                            </div>
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
                                Admin
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-blue-50/50 to-white">
                <div className="max-w-4xl mx-auto text-center">
                    <span className="inline-block py-1 px-3 rounded-full bg-blue-100 text-blue-700 text-xs font-bold tracking-wide uppercase mb-6">
                        Transparansi Keuangan
                    </span>
                    <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
                        Kelola Keuangan dengan <br />
                        <span className="text-blue-600">Lebih Cerdas & Terbuka.</span>
                    </h2>
                    <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Platform manajemen keuangan pribadi yang didesain untuk mencatat pemasukan
                        dan pengeluaran secara terstruktur, transparan, dan mudah dipahami melalui visualisasi data.
                    </p>
                    <div className="flex justify-center gap-4">
                        <button
                            onClick={scrollToStats}
                            className="group bg-blue-600 text-white px-8 py-3.5 rounded-full font-semibold hover:bg-blue-700 transition flex items-center gap-2 shadow-xl shadow-blue-200"
                        >
                            Lihat Statistik
                            <ArrowDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </section>

            {/* Quote Section */}
            <section className="bg-[#1e293b] text-white py-12 px-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-lime-400 rounded-full blur-[80px] opacity-20"></div>
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[80px] opacity-20"></div>
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <Quote className="w-12 h-12 text-lime-400 mx-auto mb-6 opacity-80" />
                    <blockquote className="text-xl md:text-2xl font-serif italic leading-relaxed text-gray-200 mb-6">
                        "Jangan menabung apa yang tersisa setelah membelanjakan, tetapi belanjakan apa yang tersisa setelah menabung."
                    </blockquote>
                    <cite className="text-lime-400 font-bold tracking-wide uppercase text-sm">— Warren Buffett</cite>
                </div>
            </section>

            {/* About / Features Section */}
            <section className="py-20 px-4 border-t border-gray-100">
                <div className="max-w-7xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-12">
                        <div className="text-center p-6 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-xl transition duration-300">
                            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Data Terjamin</h3>
                            <p className="text-gray-500 leading-relaxed">Seluruh data transaksi dicatat dengan aman dan hanya admin yang dapat mengubahnya.</p>
                        </div>
                        <div className="text-center p-6 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-xl transition duration-300">
                            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <BarChart3 className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Visualisasi Interaktif</h3>
                            <p className="text-gray-500 leading-relaxed">Grafik dinamis memudahkan Anda melihat tren keuangan mingguan hingga tahunan.</p>
                        </div>
                        <div className="text-center p-6 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-xl transition duration-300">
                            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Pantau Progress</h3>
                            <p className="text-gray-500 leading-relaxed">Monitoring cashflow secara real-time untuk keputusan finansial yang lebih baik.</p>
                        </div>
                    </div>
                </div>
            </section>


            {/* Financial Education Section */}
            <section className="py-20 px-4 bg-white border-t border-gray-100">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="text-blue-600 font-bold tracking-wider text-xs uppercase bg-blue-50 px-3 py-1 rounded-full">Edukasi</span>
                        <h2 className="text-3xl font-bold text-gray-900 mt-3 mb-4">Tips Keuangan Cerdas</h2>
                        <p className="text-gray-500 max-w-2xl mx-auto">Kelola uang Anda dengan bijak menggunakan prinsip-prinsip dasar keuangan yang telah terbukti ini.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Tip 1 */}
                        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-blue-100 hover:shadow-lg transition group">
                            <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <PieChart className="w-7 h-7 text-indigo-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-3">Metode 50/30/20</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Alokasikan pendapatan Anda: <span className="font-bold text-gray-700">50%</span> untuk Kebutuhan (Needs), <span className="font-bold text-gray-700">30%</span> untuk Keinginan (Wants), dan <span className="font-bold text-gray-700">20%</span> untuk Tabungan & Investasi.
                            </p>
                        </div>

                        {/* Tip 2 */}
                        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-blue-100 hover:shadow-lg transition group">
                            <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <PiggyBank className="w-7 h-7 text-emerald-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-3">Dana Darurat</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Siapkan dana cair setara <span className="font-bold text-gray-700">3-6 bulan</span> pengeluaran rutin. Ini adalah jaring pengaman Anda saat terjadi hal tak terduga seperti sakit atau PHK.
                            </p>
                        </div>

                        {/* Tip 3 */}
                        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-blue-100 hover:shadow-lg transition group">
                            <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Lightbulb className="w-7 h-7 text-amber-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-3">Investasi Leher ke Atas</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Investasi terbaik adalah pada diri sendiri. Tingkatkan <span className="font-bold text-gray-700">skill dan pengetahuan</span> Anda untuk meningkatkan potensi penghasilan di masa depan.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section id="stats-section" className="py-24 px-4 bg-gray-50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Ringkasan Keuangan</h2>
                        <p className="text-gray-500">Data berikut diambil secara real-time dari database.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">

                        {/* WARNING BANNERS */}
                        {(weeklyHealth.status !== 'healthy' && weeklyHealth.status !== 'neutral') && (
                            <div className={`md:col-span-3 p-4 rounded-xl flex items-center gap-3 ${weeklyHealth.status === 'critical' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-yellow-100 text-yellow-800 border border-yellow-200'}`}>
                                <AlertTriangle className="w-6 h-6 shrink-0" />
                                <div>
                                    <p className="font-bold">Peringatan Keuangan Mingguan:</p>
                                    <p className="text-sm">{weeklyHealth.message}</p>
                                </div>
                            </div>
                        )}
                        {(monthlyHealth.status !== 'healthy' && monthlyHealth.status !== 'neutral') && (
                            <div className={`md:col-span-3 p-4 rounded-xl flex items-center gap-3 ${monthlyHealth.status === 'critical' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-yellow-100 text-yellow-800 border border-yellow-200'}`}>
                                <AlertTriangle className="w-6 h-6 shrink-0" />
                                <div>
                                    <p className="font-bold">Peringatan Keuangan Bulanan:</p>
                                    <p className="text-sm">{monthlyHealth.message}</p>
                                </div>
                            </div>
                        )}

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
                                Bulan ini
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
                                Tahun berjalan
                            </div>
                        </div>

                    </div>

                    {/* Chart Section */}
                    <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
                        <div className="flex justify-between items-end mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Grafik Keuangan</h3>
                                <p className="text-gray-500 text-sm mt-1">Perbandingan Pemasukan & Pengeluaran Bulanan</p>
                            </div>
                            {/* Legend or extra info could go here */}
                        </div>
                        <div className="h-80 w-full">
                            {loading ? (
                                <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl">Memuat Grafik...</div>
                            ) : (
                                <Bar options={chartOptions} data={chartData} />
                            )}
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
                                    ) : transactions.slice(0, 10).map((t) => ( // Show only top 10
                                        <tr key={t.id} className="hover:bg-gray-50/50 transition">
                                            <td className="px-8 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </td>
                                            <td className="px-8 py-4">
                                                <div className="text-sm font-medium text-gray-900">{t.category}</div>
                                                <div className="text-xs text-gray-400">{t.description}</div>
                                            </td>
                                            <td className={`px-8 py-4 whitespace-nowrap text-right text-sm font-bold ${t.type === 'pemasukan' ? 'text-green-600' : 'text-red-500'}`}>
                                                {t.type === 'pemasukan' ? '+' : '-'} {formatCurrency(t.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                    {!loading && transactions.length === 0 && (
                                        <tr><td colSpan="3" className="px-8 py-8 text-center text-gray-500 italic">Belum ada transaksi tercatat.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {!loading && transactions.length > 10 && (
                            <div className="p-4 bg-gray-50 text-center text-xs text-gray-400">
                                Menampilkan 10 transaksi terbaru
                            </div>
                        )}
                    </div>
                </div>
            </section>
            <footer className="bg-white border-t py-12 text-center text-gray-400 text-sm">
                <p>&copy; {new Date().getFullYear()} FinTrack. Dibuat untuk manajemen keuangan yang lebih baik.</p>
            </footer>
        </div>
    );
};

export default PublicDashboard;
