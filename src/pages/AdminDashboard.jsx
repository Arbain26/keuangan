import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchTransactions, createTransaction, deleteTransaction, updateTransaction } from '../lib/api';
import { LogOut, Trash2, Edit2, Plus, X, Search, FileText, LayoutDashboard, User, Lock, Save, Zap, ChevronRight, Menu, Clock, Filter, Terminal, Activity, DollarSign, Wallet, Download, Table, TrendingUp, TrendingDown, Calendar, CreditCard } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/format';
import { Link } from 'react-router-dom';
import { Bar, Line } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement
);

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | transactions | reports | profile
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Transaction Form State
    const [formData, setFormData] = useState({
        type: 'pengeluaran',
        category: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
    });
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [dateFilter, setDateFilter] = useState({
        startDate: '',
        endDate: ''
    });
    const [activePeriod, setActivePeriod] = useState('all'); // all | week | month | year

    // Profile Form State
    const [profileData, setProfileData] = useState({
        fullName: '',
        email: '',
        newPassword: ''
    });
    const [profileMessage, setProfileMessage] = useState('');

    useEffect(() => {
        loadInitialData();
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [activeTab]);

    const loadInitialData = async () => {
        setLoading(true);
        const [transData, { data: { user } }] = await Promise.all([
            fetchTransactions(),
            supabase.auth.getUser()
        ]);

        setTransactions(transData);
        setUser(user);
        if (user) {
            setProfileData(prev => ({
                ...prev,
                email: user.email,
                fullName: 'Muhammad Arbain'
            }));
        }
        setLoading(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    // --- Transaction Logic ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.amount || !formData.date || !formData.category) return;

        if (editingId) {
            await updateTransaction(editingId, formData);
        } else {
            await createTransaction(formData);
        }

        setFormData({
            type: 'pengeluaran',
            category: '',
            amount: '',
            description: '',
            date: new Date().toISOString().split('T')[0]
        });
        setEditingId(null);
        const data = await fetchTransactions();
        setTransactions(data);
        if (activeTab === 'dashboard') {
            setActiveTab('transactions');
        }
        // Ensure success feedback or scroll
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleEdit = (transaction) => {
        setActiveTab('transactions');
        setEditingId(transaction.id);
        setFormData({
            type: transaction.type,
            category: transaction.category,
            amount: transaction.amount,
            description: transaction.description || '',
            date: transaction.date
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this transaction?')) {
            await deleteTransaction(id);
            const data = await fetchTransactions();
            setTransactions(data);
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setFormData({
            type: 'pengeluaran',
            category: '',
            amount: '',
            description: '',
            date: new Date().toISOString().split('T')[0]
        });
    };

    // --- Profile Logic ---
    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setProfileMessage('');

        const updates = {
            data: { full_name: profileData.fullName }
        };

        if (profileData.newPassword) {
            updates.password = profileData.newPassword;
        }

        const { error } = await supabase.auth.updateUser(updates);

        if (error) {
            setProfileMessage('Error: ' + error.message);
        } else {
            setProfileMessage('Profile updated successfully.');
            setProfileData(prev => ({ ...prev, newPassword: '' }));
        }
    };

    // --- Export Logic ---
    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredTransactions.map(t => ({
            Date: t.date,
            Type: t.type,
            Category: t.category,
            Amount: t.amount,
            Description: t.description || '-'
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Financial Report");
        XLSX.writeFile(workbook, `Financial_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Filter Logic
    const filteredTransactions = transactions.filter(t => {
        const matchesSearch = t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchTerm.toLowerCase());

        const tDate = new Date(t.date);
        const now = new Date();

        let matchesPeriod = true;
        if (activePeriod === 'week') {
            const startOfWeek = new Date(now);
            const day = now.getDay() || 7; // Get current day (1-7, where 7 is Sunday)
            startOfWeek.setDate(now.getDate() - day + 1); // Monday
            startOfWeek.setHours(0, 0, 0, 0);
            matchesPeriod = tDate >= startOfWeek;
        } else if (activePeriod === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            matchesPeriod = tDate >= startOfMonth;
        } else if (activePeriod === 'year') {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            matchesPeriod = tDate >= startOfYear;
        }

        const startDate = dateFilter.startDate ? new Date(dateFilter.startDate) : null;
        const endDate = dateFilter.endDate ? new Date(dateFilter.endDate) : null;

        const matchesDate = (!startDate || tDate >= startDate) && (!endDate || tDate <= endDate);

        return matchesSearch && matchesDate && matchesPeriod;
    });

    // Stats Calculation
    const totalIncome = filteredTransactions.filter(t => t.type === 'pemasukan').reduce((acc, t) => acc + Number(t.amount), 0);
    const totalExpense = filteredTransactions.filter(t => t.type === 'pengeluaran').reduce((acc, t) => acc + Number(t.amount), 0);
    const balance = totalIncome - totalExpense;

    // Chart Data
    const chartData = {
        labels: filteredTransactions.slice(0, 7).reverse().map(t => formatDate(t.date)),
        datasets: [
            {
                label: 'Cash Flow',
                data: filteredTransactions.slice(0, 7).reverse().map(t => t.type === 'pemasukan' ? t.amount : -t.amount),
                borderColor: '#a3e635', // lime-400
                backgroundColor: 'rgba(163, 230, 53, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#0d1117',
                titleColor: '#c9d1d9',
                bodyColor: '#c9d1d9',
                borderColor: '#30363d',
                borderWidth: 1,
                padding: 12,
                callbacks: {
                    label: (context) => formatCurrency(Math.abs(context.raw))
                }
            }
        },
        scales: {
            y: {
                grid: { color: '#30363d', borderDash: [5, 5] },
                ticks: { color: '#8b949e' },
                border: { display: false }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#8b949e' },
                border: { display: false }
            }
        }
    };

    const SidebarItem = ({ id, icon: Icon, label }) => (
        <button
            onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }}
            className={`w-full text-left px-4 py-3 text-sm font-medium rounded-lg transition-all flex items-center gap-3 mb-1 ${activeTab === id
                ? 'bg-[#21262d] text-white shadow-sm border-l-4 border-lime-400'
                : 'text-[#8b949e] hover:bg-[#21262d] hover:text-[#c9d1d9]'
                }`}
        >
            <Icon className={`w-5 h-5 ${activeTab === id ? 'text-lime-400' : 'text-[#8b949e]'}`} />
            {label}
        </button>
    );

    const FilterButtons = () => (
        <div className="flex flex-wrap gap-2 mb-4">
            {[
                { id: 'all', label: 'Semua' },
                { id: 'week', label: 'Minggu Ini' },
                { id: 'month', label: 'Bulan Ini' },
                { id: 'year', label: 'Tahun Ini' }
            ].map((period) => (
                <button
                    key={period.id}
                    onClick={() => setActivePeriod(period.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${activePeriod === period.id
                        ? 'bg-lime-400 text-black border-lime-400 shadow-sm'
                        : 'bg-[#161b22] text-[#8b949e] border-[#30363d] hover:border-[#8b949e] hover:text-[#c9d1d9]'
                        }`}
                >
                    {period.label}
                </button>
            ))}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] font-sans selection:bg-lime-400/30 selection:text-lime-200">

            {/* Top Bar */}
            <header className="fixed top-0 w-full h-16 bg-[#161b22]/90 backdrop-blur-md border-b border-[#30363d] z-50 flex items-center justify-between px-4 md:px-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="md:hidden text-[#8b949e] hover:text-white transition p-2 rounded-lg hover:bg-[#21262d] active:scale-95"
                    >
                        {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-lime-400 rounded-lg flex items-center justify-center shadow-lg shadow-lime-400/20">
                            <Wallet className="w-5 h-5 text-black" />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-white leading-tight">Keuangan</h1>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex flex-col items-end mr-2">
                        <span className="text-xs font-medium text-[#8b949e]">
                            {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                        </span>
                        <span className="text-xs font-bold text-[#c9d1d9]">
                            {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 border-l border-[#30363d] pl-4 h-8">
                        <div className="w-8 h-8 rounded-full bg-[#21262d] flex items-center justify-center border border-[#30363d] text-xs font-bold text-lime-400">
                            MA
                        </div>
                        <div className="hidden md:block">
                            <p className="text-xs font-bold text-white capitalize">{user?.user_metadata?.full_name || 'Muhammad Arbain'}</p>
                            <p className="text-[10px] text-[#8b949e]">Administrator</p>
                        </div>
                        <button onClick={handleLogout} className="ml-2 p-2 text-[#8b949e] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-[60] md:hidden backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Layout Container */}
            <div className="pt-16 flex min-h-screen relative overflow-hidden">

                {/* Sidebar */}
                <aside className={`fixed top-0 left-0 bottom-0 md:relative z-[70] w-72 md:w-64 h-screen md:h-auto bg-[#161b22] border-r border-[#30363d] transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 overflow-y-auto shadow-2xl md:shadow-none`}>
                    <div className="p-4 flex flex-col h-full">
                        <div className="space-y-1 flex-1">
                            <p className="px-4 text-[10px] text-[#8b949e] font-bold uppercase tracking-wider mb-3 mt-2">Menu Utama</p>
                            <SidebarItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
                            <SidebarItem id="transactions" icon={CreditCard} label="Transaksi" />
                            <SidebarItem id="reports" icon={FileText} label="Laporan" />

                            <p className="px-4 text-[10px] text-[#8b949e] font-bold uppercase tracking-wider mb-3 mt-6">Pengaturan</p>
                            <SidebarItem id="profile" icon={User} label="Profil User" />
                            <Link to="/" target="_blank" className="w-full text-left px-4 py-3 text-sm font-medium text-[#8b949e] hover:bg-[#21262d] hover:text-[#c9d1d9] rounded-lg transition-all flex items-center gap-3">
                                <ChevronRight className="w-5 h-5 text-[#8b949e]" />
                                Lihat Website
                            </Link>
                        </div>

                        <div className="p-4 bg-[#0d1117] rounded-xl border border-[#30363d] mt-auto">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-lime-400 animate-pulse"></div>
                                <div>
                                    <p className="text-xs font-bold text-white">System Status</p>
                                    <p className="text-[10px] text-[#8b949e]">All services operational</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 bg-[#0d1117] p-4 md:p-8">
                    <div className="max-w-6xl mx-auto space-y-8">

                        {/* Page Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[#30363d] pb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">
                                    {activeTab === 'dashboard' && 'Dashboard Overview'}
                                    {activeTab === 'transactions' && 'Manajemen Transaksi'}
                                    {activeTab === 'reports' && 'Laporan Keuangan'}
                                    {activeTab === 'profile' && 'Pengaturan Akun'}
                                </h2>
                                <p className="text-[#8b949e] text-sm mt-1">
                                    {activeTab === 'dashboard' && 'Ringkasan aktivitas keuangan Anda hari ini.'}
                                    {activeTab === 'transactions' && 'Kelola pemasukan dan pengeluaran dengan mudah.'}
                                    {activeTab === 'reports' && 'Analisis dan unduh laporan keuangan.'}
                                    {activeTab === 'profile' && 'Perbarui informasi dan keamanan akun Anda.'}
                                </p>
                            </div>
                            {activeTab === 'reports' && (
                                <button
                                    onClick={exportToExcel}
                                    className="flex items-center gap-2 px-4 py-2 bg-lime-400 text-black text-sm font-bold rounded-lg hover:bg-lime-500 transition shadow-lg shadow-lime-400/20"
                                >
                                    <Download className="w-4 h-4" />
                                    Download Excel
                                </button>
                            )}
                        </div>

                        {activeTab === 'dashboard' && (
                            <div className="space-y-6">
                                <FilterButtons />
                                {/* Stats Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Income */}
                                    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-sm relative overflow-hidden">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-[#8b949e] mb-1">Total Pemasukan</p>
                                                <h3 className="text-2xl font-bold text-white">{formatCurrency(totalIncome)}</h3>
                                            </div>
                                            <div className="p-2 bg-lime-400/10 rounded-lg">
                                                <TrendingUp className="w-5 h-5 text-lime-400" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expense */}
                                    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-sm relative overflow-hidden">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-[#8b949e] mb-1">Total Pengeluaran</p>
                                                <h3 className="text-2xl font-bold text-white">{formatCurrency(totalExpense)}</h3>
                                            </div>
                                            <div className="p-2 bg-rose-500/10 rounded-lg">
                                                <TrendingDown className="w-5 h-5 text-rose-500" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Balance */}
                                    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-sm relative overflow-hidden">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-[#8b949e] mb-1">Saldo Bersih</p>
                                                <h3 className="text-2xl font-bold text-white">{formatCurrency(balance)}</h3>
                                            </div>
                                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                                <Wallet className="w-5 h-5 text-blue-500" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Chart */}
                                <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-sm">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-bold text-white">Analisis Cash Flow</h3>
                                    </div>
                                    <div className="h-72">
                                        <Line options={chartOptions} data={chartData} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'transactions' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Input Form */}
                                <div className="lg:col-span-1 space-y-6">
                                    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-sm">
                                        <div className="flex items-center justify-between gap-2 mb-6">
                                            <h3 className="text-lg font-bold text-white">{editingId ? 'Edit Transaksi' : 'Transaksi Baru'}</h3>
                                            {editingId && <button onClick={cancelEdit} className="text-xs text-rose-400 hover:text-rose-300 hover:underline">Batal Edit</button>}
                                        </div>

                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            <div className="grid grid-cols-2 gap-3 p-1 bg-[#0d1117] rounded-lg border border-[#30363d]">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, type: 'pemasukan' })}
                                                    className={`py-2 text-xs font-bold rounded-md transition ${formData.type === 'pemasukan' ? 'bg-lime-400 text-black shadow-md' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
                                                >
                                                    Pemasukan
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, type: 'pengeluaran' })}
                                                    className={`py-2 text-xs font-bold rounded-md transition ${formData.type === 'pengeluaran' ? 'bg-rose-600 text-white shadow-md' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
                                                >
                                                    Pengeluaran
                                                </button>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-[#8b949e] mb-1.5 pl-1">Tanggal</label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" />
                                                    <input
                                                        type="date"
                                                        value={formData.date}
                                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                        className="w-full bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] rounded-lg py-2.5 pl-10 pr-4 text-sm focus:border-lime-400 focus:ring-1 focus:ring-lime-400 outline-none transition"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-[#8b949e] mb-1.5 pl-1">Jumlah</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e] text-sm font-bold">Rp</span>
                                                    <input
                                                        type="number"
                                                        placeholder="0"
                                                        value={formData.amount}
                                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                                        className="w-full bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] rounded-lg py-2.5 pl-10 pr-4 text-sm focus:border-lime-400 focus:ring-1 focus:ring-lime-400 outline-none transition font-medium"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-[#8b949e] mb-1.5 pl-1">Kategori & Keterangan</label>
                                                <input
                                                    type="text"
                                                    placeholder="Kategori (mis: Makan, Gaji)"
                                                    value={formData.category}
                                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                    className="w-full bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] rounded-lg py-2.5 px-4 text-sm focus:border-lime-400 focus:ring-1 focus:ring-lime-400 outline-none transition mb-3"
                                                    required
                                                />
                                                <textarea
                                                    placeholder="Catatan tambahan (opsional)"
                                                    value={formData.description}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                    className="w-full bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] rounded-lg py-2.5 px-4 text-sm focus:border-lime-400 focus:ring-1 focus:ring-lime-400 outline-none transition min-h-[80px]"
                                                />
                                            </div>

                                            <button type="submit" className="w-full bg-lime-400 text-black font-bold py-3 rounded-lg text-sm hover:bg-lime-500 transition shadow-lg shadow-lime-400/20 flex items-center justify-center gap-2">
                                                <Save className="w-4 h-4" />
                                                {editingId ? 'Simpan Perubahan' : 'Simpan Transaksi'}
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                {/* Transaction List */}
                                <div className="lg:col-span-2">
                                    <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-sm overflow-hidden">
                                        <div className="p-5 border-b border-[#30363d] flex flex-col md:flex-row justify-between items-center gap-4">
                                            <h3 className="font-bold text-white">Riwayat Transaksi</h3>
                                            <div className="relative w-full md:w-64">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" />
                                                <input
                                                    type="text"
                                                    placeholder="Cari transaksi..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] rounded-lg py-2 pl-10 pr-4 text-sm focus:border-lime-400 focus:ring-1 focus:ring-lime-400 outline-none transition"
                                                />
                                            </div>
                                        </div>
                                        <div className="hidden md:block overflow-x-auto">
                                            <table className="w-full text-left text-sm text-[#8b949e]">
                                                <thead className="bg-[#0d1117] text-[#8b949e] font-semibold border-b border-[#30363d]">
                                                    <tr>
                                                        <th className="px-6 py-4 w-1/4">Tanggal</th>
                                                        <th className="px-6 py-4 w-1/4">Kategori</th>
                                                        <th className="px-6 py-4 w-1/4">Nominal</th>
                                                        <th className="px-6 py-4 w-1/4 text-right">Aksi</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[#30363d]">
                                                    {loading ? (
                                                        <tr><td colSpan="4" className="text-center py-12 text-[#8b949e]">Memuat data...</td></tr>
                                                    ) : filteredTransactions.length === 0 ? (
                                                        <tr><td colSpan="4" className="text-center py-12 text-[#8b949e]">Belum ada transaksi.</td></tr>
                                                    ) : (
                                                        filteredTransactions.map((t) => (
                                                            <tr key={t.id} className="hover:bg-[#21262d] transition">
                                                                <td className="px-6 py-4">
                                                                    <div className="text-[#c9d1d9] font-medium">{formatDate(t.date)}</div>
                                                                    <div className="text-xs text-[#8b949e]">{new Date(t.date).getFullYear()}</div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`w-2 h-2 rounded-full ${t.type === 'pemasukan' ? 'bg-lime-400' : 'bg-rose-500'}`}></span>
                                                                        <span className="text-[#c9d1d9] font-medium">{t.category}</span>
                                                                    </div>
                                                                    {t.description && <div className="text-xs text-[#8b949e] mt-1 truncate max-w-[150px]">{t.description}</div>}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className={`font-medium ${t.type === 'pemasukan' ? 'text-lime-400' : 'text-rose-400'}`}>
                                                                        {t.type === 'pemasukan' ? '+' : '-'} {formatCurrency(t.amount)}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <div className="flex justify-end gap-2">
                                                                        <button onClick={() => handleEdit(t)} className="p-2 text-[#8b949e] hover:text-white hover:bg-[#30363d] rounded-lg transition" title="Edit">
                                                                            <Edit2 className="w-4 h-4" />
                                                                        </button>
                                                                        <button onClick={() => handleDelete(t.id)} className="p-2 text-[#8b949e] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition" title="Delete">
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="md:hidden p-4 space-y-4">
                                            {loading ? (
                                                <div className="text-center py-4 text-[#8b949e]">Memuat data...</div>
                                            ) : filteredTransactions.length === 0 ? (
                                                <div className="text-center py-4 text-[#8b949e]">Belum ada transaksi.</div>
                                            ) : (
                                                filteredTransactions.map((t) => (
                                                    <div key={t.id} className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4 space-y-3">
                                                        <div className="flex justify-between items-start border-b border-[#30363d] pb-2">
                                                            <div>
                                                                <p className="text-xs text-[#8b949e]">{formatDate(t.date)} {new Date(t.date).getFullYear()}</p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className={`w-2 h-2 rounded-full ${t.type === 'pemasukan' ? 'bg-lime-400' : 'bg-rose-500'}`}></span>
                                                                    <span className="text-[#c9d1d9] font-bold">{t.category}</span>
                                                                </div>
                                                            </div>
                                                            <span className={`font-bold ${t.type === 'pemasukan' ? 'text-lime-400' : 'text-rose-400'}`}>
                                                                {t.type === 'pemasukan' ? '+' : '-'} {formatCurrency(t.amount)}
                                                            </span>
                                                        </div>
                                                        {t.description && <p className="text-xs text-[#8b949e] italic">{t.description}</p>}
                                                        <div className="flex justify-end gap-2 pt-1">
                                                            <button onClick={() => handleEdit(t)} className="flex-1 py-2 bg-[#21262d] text-[#c9d1d9] rounded flex items-center justify-center gap-2 text-xs font-medium border border-[#30363d] hover:bg-[#30363d]">
                                                                <Edit2 className="w-3.5 h-3.5" /> Edit
                                                            </button>
                                                            <button onClick={() => handleDelete(t.id)} className="flex-1 py-2 bg-rose-500/10 text-rose-400 rounded flex items-center justify-center gap-2 text-xs font-medium border border-rose-500/20 hover:bg-rose-500/20">
                                                                <Trash2 className="w-3.5 h-3.5" /> Hapus
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'reports' && (
                            <div className="space-y-6">
                                <FilterButtons />
                                {/* Filter & Export */}
                                <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-sm">
                                    <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                                            <div>
                                                <label className="block text-xs font-bold text-[#8b949e] uppercase tracking-wider mb-2">Periode Awal</label>
                                                <input
                                                    type="date"
                                                    value={dateFilter.startDate}
                                                    onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                                                    className="w-full bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] rounded-lg py-2 px-4 text-sm focus:border-lime-400 outline-none transition"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-[#8b949e] uppercase tracking-wider mb-2">Periode Akhir</label>
                                                <input
                                                    type="date"
                                                    value={dateFilter.endDate}
                                                    onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                                                    className="w-full bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] rounded-lg py-2 px-4 text-sm focus:border-lime-400 outline-none transition"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-3 w-full md:w-auto">
                                            <button
                                                onClick={() => setDateFilter({ startDate: '', endDate: '' })}
                                                className="px-4 py-2 border border-[#30363d] text-[#8b949e] hover:bg-[#21262d] hover:text-white rounded-lg transition text-sm font-medium"
                                            >
                                                Reset
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Report Summary */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-6 bg-lime-400/5 border border-lime-400/10 rounded-xl">
                                        <h3 className="text-lime-400 text-xs font-bold uppercase tracking-wider mb-2">Total Pemasukan</h3>
                                        <p className="text-3xl text-white font-bold">{formatCurrency(totalIncome)}</p>
                                    </div>
                                    <div className="p-6 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                                        <h3 className="text-rose-500 text-xs font-bold uppercase tracking-wider mb-2">Total Pengeluaran</h3>
                                        <p className="text-3xl text-white font-bold">{formatCurrency(totalExpense)}</p>
                                    </div>
                                    <div className="p-6 bg-[#21262d] border border-[#30363d] rounded-xl">
                                        <h3 className="text-[#8b949e] text-xs font-bold uppercase tracking-wider mb-2">Saldo Tertahan</h3>
                                        <p className="text-3xl text-white font-bold">{formatCurrency(balance)}</p>
                                    </div>
                                </div>

                                {/* Report Table Preview */}
                                <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden shadow-sm">
                                    <div className="p-5 border-b border-[#30363d]">
                                        <h3 className="font-bold text-white">Preview Data Laporan</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm text-[#8b949e]">
                                            <thead className="bg-[#0d1117] text-[#8b949e] font-semibold">
                                                <tr>
                                                    <th className="px-6 py-3 w-32">Tanggal</th>
                                                    <th className="px-6 py-3 w-24">Tipe</th>
                                                    <th className="px-6 py-3 w-32">Kategori</th>
                                                    <th className="px-6 py-3">Keterangan</th>
                                                    <th className="px-6 py-3 text-right w-32">Jumlah</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#30363d]">
                                                {filteredTransactions.length === 0 ? (
                                                    <tr><td colSpan="5" className="text-center py-8 text-[#8b949e]">Tidak ada data untuk periode ini.</td></tr>
                                                ) : (
                                                    filteredTransactions.map(t => (
                                                        <tr key={t.id}>
                                                            <td className="px-6 py-3 text-[#c9d1d9]">{formatDate(t.date)}</td>
                                                            <td className="px-6 py-3">
                                                                <span className={`text-xs px-2 py-1 rounded font-medium capitalize ${t.type === 'pemasukan' ? 'bg-lime-400/10 text-lime-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                                    {t.type}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-3 text-[#c9d1d9]">{t.category}</td>
                                                            <td className="px-6 py-3 truncate max-w-xs">{t.description || '-'}</td>
                                                            <td className={`px-6 py-3 text-right font-medium ${t.type === 'pemasukan' ? 'text-lime-400' : 'text-[#c9d1d9]'}`}>
                                                                {formatCurrency(t.amount)}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'profile' && (
                            <div className="max-w-2xl mx-auto bg-[#161b22] border border-[#30363d] rounded-xl p-8 shadow-sm">
                                <h2 className="text-xl font-bold text-white mb-6 border-b border-[#30363d] pb-4">
                                    Pengaturan Profil
                                </h2>

                                {profileMessage && (
                                    <div className="mb-6 p-4 rounded-lg border border-lime-400/20 bg-lime-400/10 text-lime-400 text-sm flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-lime-400"></div>
                                        {profileMessage}
                                    </div>
                                )}

                                <form onSubmit={handleUpdateProfile} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-[#8b949e] mb-2">Email Akun</label>
                                        <input type="text" value={profileData.email} disabled className="w-full bg-[#0d1117] border border-[#30363d] text-[#8b949e] rounded-lg p-3 text-sm cursor-not-allowed" />
                                        <p className="text-xs text-[#8b949e] mt-1">Email tidak dapat diubah.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#8b949e] mb-2">Nama Lengkap</label>
                                        <input type="text" value={profileData.fullName} onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })} className="w-full bg-[#0d1117] border border-[#30363d] text-white rounded-lg p-3 text-sm focus:border-lime-400 outline-none transition" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#8b949e] mb-2">Password Baru</label>
                                        <input type="password" value={profileData.newPassword} onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })} placeholder="Biarkan kosong jika tidak ingin mengganti" className="w-full bg-[#0d1117] border border-[#30363d] text-white rounded-lg p-3 text-sm focus:border-lime-400 outline-none transition" />
                                    </div>
                                    <div className="pt-4">
                                        <button type="submit" className="px-6 py-2.5 bg-lime-400 text-black font-medium rounded-lg hover:bg-lime-500 transition shadow-lg shadow-lime-400/20 w-full md:w-auto">
                                            Simpan Perubahan
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;
