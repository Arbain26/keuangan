import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchTransactions, createTransaction, deleteTransaction, updateTransaction } from '../lib/api';
import { LogOut, Trash2, Edit2, Plus, X, Search, FileText, LayoutDashboard, User, Lock, Save, Zap, ChevronRight, Menu, Clock, Filter, Terminal, Activity, DollarSign, Wallet } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/format';
import { Link } from 'react-router-dom';
import { Bar, Line } from 'react-chartjs-2';
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
    const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | profile
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

    // Filter State
    const [dateFilter, setDateFilter] = useState({
        startDate: '',
        endDate: ''
    });

    // Profile Form State
    const [profileData, setProfileData] = useState({
        fullName: '',
        email: '',
        newPassword: ''
    });
    const [profileMessage, setProfileMessage] = useState('');

    useEffect(() => {
        loadInitialData();
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

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
                fullName: 'Muhammad Arbain' // Hardcoded as requested
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
        const data = await fetchTransactions(); // Reload fresh
        setTransactions(data);
    };

    const handleEdit = (transaction) => {
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
        if (confirm('Yakin ingin menghapus transaksi ini?')) {
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
            setProfileMessage('Gagal: ' + error.message);
        } else {
            setProfileMessage('Profil diperbarui!');
            setProfileData(prev => ({ ...prev, newPassword: '' }));
        }
    };

    // Filter Logic
    const filteredTransactions = transactions.filter(t => {
        const matchesSearch = t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchTerm.toLowerCase());

        const tDate = new Date(t.date);
        const startDate = dateFilter.startDate ? new Date(dateFilter.startDate) : null;
        const endDate = dateFilter.endDate ? new Date(dateFilter.endDate) : null;

        const matchesDate = (!startDate || tDate >= startDate) && (!endDate || tDate <= endDate);

        return matchesSearch && matchesDate;
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
                label: 'Transaksi',
                data: filteredTransactions.slice(0, 7).reverse().map(t => t.type === 'pemasukan' ? t.amount : -t.amount),
                borderColor: '#00ff00',
                backgroundColor: 'rgba(0, 255, 0, 0.2)',
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#000',
                titleColor: '#00ff00',
                bodyColor: '#fff',
                borderColor: '#00ff00',
                borderWidth: 1,
                callbacks: {
                    label: (context) => formatCurrency(Math.abs(context.raw))
                }
            }
        },
        scales: {
            y: {
                grid: { color: '#1a1a1a' },
                ticks: { color: '#00ff00' }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#00ff00' }
            }
        }
    };

    return (
        <div className="min-h-screen bg-black text-green-500 font-['Share_Tech_Mono'] selection:bg-green-500 selection:text-black overflow-x-hidden">

            {/* Top Bar */}
            <header className="fixed top-0 w-full h-16 bg-[#050505] border-b border-green-900 z-40 flex items-center justify-between px-4 md:px-6 shadow-[0_0_15px_rgba(0,255,0,0.1)]">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="md:hidden text-green-500 hover:text-white transition"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-900/20 rounded-sm border border-green-500 flex items-center justify-center">
                            <Terminal className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-wider text-white leading-none">APLIKASI KEUANGAN</h1>
                            <p className="text-[10px] text-green-600 tracking-widest uppercase">Fakultas Ilmu Komputer</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <span className="hidden md:block text-xs text-green-700 font-bold uppercase tracking-widest">
                        {user ? 'System Online' : 'Offline'}
                    </span>
                    <div className="flex items-center gap-3 border-l border-green-900 pl-6 h-8">
                        <span className="text-sm font-bold text-white capitalize">
                            {user?.user_metadata?.full_name || 'Muhammad Arbain'}
                        </span>
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#00ff00]"></div>
                        <button onClick={handleLogout} className="px-3 py-1 text-xs bg-red-900/20 text-red-500 border border-red-900 hover:bg-red-500 hover:text-black transition uppercase font-bold tracking-wider ml-2">
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Layout Container */}
            <div className="pt-16 flex h-screen">

                {/* Sidebar */}
                <aside className={`fixed md:relative z-50 w-64 h-full bg-[#0a0a0a] border-r border-green-900 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                    <div className="p-4 space-y-1">
                        <p className="px-4 text-[10px] text-green-800 uppercase tracking-widest font-bold mb-2">Main Menu</p>
                        <button
                            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
                            className={`w-full text-left px-4 py-3 text-sm font-bold border-l-2 transition-all hover:bg-green-900/10 hover:text-white group flex items-center gap-3 ${activeTab === 'dashboard' ? 'border-green-500 text-green-400 bg-green-900/20' : 'border-transparent text-gray-500'}`}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                        </button>
                        <button className="w-full text-left px-4 py-3 text-sm font-bold border-l-2 border-transparent text-gray-600 hover:text-green-700 cursor-not-allowed flex items-center gap-3">
                            <Activity className="w-4 h-4" />
                            Kategori (Locked)
                        </button>
                        <button className="w-full text-left px-4 py-3 text-sm font-bold border-l-2 border-transparent text-gray-600 hover:text-green-700 cursor-not-allowed flex items-center gap-3">
                            <FileText className="w-4 h-4" />
                            Laporan (Locked)
                        </button>

                        <p className="px-4 text-[10px] text-green-800 uppercase tracking-widest font-bold mt-6 mb-2">System</p>
                        <button
                            onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }}
                            className={`w-full text-left px-4 py-3 text-sm font-bold border-l-2 transition-all hover:bg-green-900/10 hover:text-white group flex items-center gap-3 ${activeTab === 'profile' ? 'border-green-500 text-green-400 bg-green-900/20' : 'border-transparent text-gray-500'}`}
                        >
                            <User className="w-4 h-4" />
                            User Management
                        </button>
                        <Link to="/" target="_blank" className="block w-full text-left px-4 py-3 text-sm font-bold border-l-2 border-transparent text-gray-500 hover:text-white hover:bg-green-900/10 flex items-center gap-3">
                            <ChevronRight className="w-4 h-4" />
                            View Site
                        </Link>
                    </div>

                    <div className="absolute bottom-0 w-full p-4 border-t border-green-900 bg-[#050505]">
                        <div className="text-[10px] text-green-800">
                            v2.0.4-CYBER
                            <br />
                            SECURE CONNECTION
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto bg-black p-4 md:p-8 relative">
                    {/* Background Grid Effect */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0"></div>

                    <div className="relative z-10 max-w-7xl mx-auto">

                        {activeTab === 'dashboard' && (
                            <div className="space-y-6">
                                {/* Header Section */}
                                <div className="border border-green-500/30 bg-[#050505] p-6 relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                                        <div>
                                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 uppercase tracking-wide drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                                                Dashboard Keuangan
                                            </h2>
                                            <p className="text-green-500/70 text-sm tracking-wider uppercase font-bold">
                                                Sistem Monitoring Keuangan Real-time
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-4xl md:text-5xl font-bold text-green-400 font-mono tracking-widest drop-shadow-[0_0_10px_#00ff00]">
                                                {currentTime.toLocaleTimeString('en-US', { hour12: false })}
                                            </div>
                                            <div className="text-green-700 text-sm font-bold uppercase tracking-[0.2em] mt-1">
                                                {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Filter Section */}
                                <div className="border border-green-500/30 bg-[#050505] p-4">
                                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-green-900">
                                        <Filter className="w-4 h-4 text-green-400" />
                                        <span className="text-sm font-bold text-green-400 uppercase tracking-widest">Filter Periode</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                        <div className="md:col-span-5">
                                            <label className="block text-[10px] uppercase font-bold text-green-700 mb-1">Tanggal Awal</label>
                                            <input
                                                type="date"
                                                value={dateFilter.startDate}
                                                onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                                                className="w-full bg-black border border-green-800 text-white p-2 text-sm focus:border-green-400 focus:outline-none focus:shadow-[0_0_10px_rgba(0,255,0,0.2)] transition placeholder-green-900"
                                            />
                                        </div>
                                        <div className="md:col-span-5">
                                            <label className="block text-[10px] uppercase font-bold text-green-700 mb-1">Tanggal Akhir</label>
                                            <input
                                                type="date"
                                                value={dateFilter.endDate}
                                                onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                                                className="w-full bg-black border border-green-800 text-white p-2 text-sm focus:border-green-400 focus:outline-none focus:shadow-[0_0_10px_rgba(0,255,0,0.2)] transition"
                                            />
                                        </div>
                                        <div className="md:col-span-2 flex gap-2">
                                            <button
                                                onClick={() => {/* Filter logic happens automatically */ }}
                                                className="flex-1 bg-green-600 hover:bg-green-500 text-black font-bold p-2 text-sm transition uppercase tracking-wider"
                                            >
                                                Filter
                                            </button>
                                            <button
                                                onClick={() => setDateFilter({ startDate: '', endDate: '' })}
                                                className="px-3 border border-green-800 text-green-600 hover:text-white hover:border-white transition"
                                            >
                                                X
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Income Card - Green */}
                                    <div className="bg-[#050505] border border-green-500/50 p-6 relative group overflow-hidden">
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-bl-full -mr-10 -mt-10 group-hover:bg-green-500/20 transition"></div>
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-2 mb-3 text-green-500">
                                                <DollarSign className="w-5 h-5" />
                                                <span className="text-xs font-bold uppercase tracking-widest">Total Pemasukan</span>
                                            </div>
                                            <div className="text-3xl font-bold text-white tracking-wider mb-2 drop-shadow-[0_0_5px_rgba(0,255,0,0.5)]">
                                                {formatCurrency(totalIncome)}
                                            </div>
                                            <div className="text-[10px] text-green-700 font-bold uppercase tracking-widest flex justify-between">
                                                <span>Periode Aktif</span>
                                                <span className="animate-pulse">REAL-TIME</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expense Card - Pink */}
                                    <div className="bg-[#050505] border border-pink-500/50 p-6 relative group overflow-hidden">
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-pink-500/10 rounded-bl-full -mr-10 -mt-10 group-hover:bg-pink-500/20 transition"></div>
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-2 mb-3 text-pink-500">
                                                <Zap className="w-5 h-5" />
                                                <span className="text-xs font-bold uppercase tracking-widest">Total Pengeluaran</span>
                                            </div>
                                            <div className="text-3xl font-bold text-white tracking-wider mb-2 drop-shadow-[0_0_5px_rgba(236,72,153,0.5)]">
                                                {formatCurrency(totalExpense)}
                                            </div>
                                            <div className="text-[10px] text-pink-700 font-bold uppercase tracking-widest flex justify-between">
                                                <span>Periode Aktif</span>
                                                <span className="animate-pulse">REAL-TIME</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Balance Card - Blue/Cyan */}
                                    <div className="bg-[#050505] border border-cyan-500/50 p-6 relative group overflow-hidden">
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-bl-full -mr-10 -mt-10 group-hover:bg-cyan-500/20 transition"></div>
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-2 mb-3 text-cyan-500">
                                                <Wallet className="w-5 h-5" />
                                                <span className="text-xs font-bold uppercase tracking-widest">Saldo Akhir</span>
                                            </div>
                                            <div className="text-3xl font-bold text-white tracking-wider mb-2 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]">
                                                {formatCurrency(balance)}
                                            </div>
                                            <div className="text-[10px] text-cyan-700 font-bold uppercase tracking-widest flex justify-between">
                                                <span>Selisih Pemasukan & Pengeluaran</span>
                                                <span>+ POSITIF</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Graph & Input Section Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                                    {/* Chart - Left 8 cols */}
                                    <div className="lg:col-span-8 bg-[#050505] border border-green-500/30 p-6">
                                        <div className="flex items-center gap-2 mb-6 pb-2 border-b border-green-900/50">
                                            <Activity className="w-5 h-5 text-green-500" />
                                            <h3 className="text-sm font-bold text-green-400 uppercase tracking-widest">Analisis Grafik</h3>
                                        </div>
                                        <div className="h-64">
                                            <Line options={chartOptions} data={chartData} />
                                        </div>
                                    </div>

                                    {/* Input Form - Right 4 cols */}
                                    <div className="lg:col-span-4 bg-[#050505] border border-green-500/30 p-6">
                                        <div className="flex items-center justify-between gap-2 mb-6 pb-2 border-b border-green-900/50">
                                            <div className="flex items-center gap-2">
                                                <Plus className="w-5 h-5 text-green-500" />
                                                <h3 className="text-sm font-bold text-green-400 uppercase tracking-widest">{editingId ? 'Edit Data' : 'Tambah Data'}</h3>
                                            </div>
                                            {editingId && <button onClick={cancelEdit} className="text-[10px] text-red-500 border border-red-500 px-2 hover:bg-red-500 hover:text-black transition">CANCEL</button>}
                                        </div>

                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, type: 'pemasukan' })}
                                                    className={`py-2 text-xs font-bold border transition ${formData.type === 'pemasukan' ? 'bg-green-500 text-black border-green-500' : 'text-gray-500 border-green-900 hover:border-green-500 hover:text-green-500'}`}
                                                >
                                                    PEMASUKAN
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, type: 'pengeluaran' })}
                                                    className={`py-2 text-xs font-bold border transition ${formData.type === 'pengeluaran' ? 'bg-pink-500 text-black border-pink-500' : 'text-gray-500 border-pink-900/50 hover:border-pink-500 hover:text-pink-500'}`}
                                                >
                                                    PENGELUARAN
                                                </button>
                                            </div>

                                            <input
                                                type="date"
                                                value={formData.date}
                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                className="w-full bg-black border border-green-900 text-white p-3 text-sm focus:border-green-500 focus:outline-none transition"
                                                required
                                            />
                                            <input
                                                type="number"
                                                placeholder="JUMLAH (RP)"
                                                value={formData.amount}
                                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                                className="w-full bg-black border border-green-900 text-white p-3 text-sm focus:border-green-500 focus:outline-none transition font-mono"
                                                required
                                            />
                                            <input
                                                type="text"
                                                placeholder="KATEGORI"
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full bg-black border border-green-900 text-white p-3 text-sm focus:border-green-500 focus:outline-none transition"
                                                required
                                            />
                                            <input
                                                type="text"
                                                placeholder="KETERANGAN (OPSIONAL)"
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                className="w-full bg-black border border-green-900 text-white p-3 text-sm focus:border-green-500 focus:outline-none transition"
                                            />

                                            <button type="submit" className="w-full bg-green-600/20 border border-green-500 text-green-500 hover:bg-green-500 hover:text-black py-3 font-bold uppercase tracking-widest transition duration-300 shadow-[0_0_15px_rgba(0,255,0,0.1)] hover:shadow-[0_0_20px_rgba(0,255,0,0.4)]">
                                                {editingId ? 'SIMPAN PERUBAHAN' : 'EKSEKUSI DATA'}
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                {/* Transaction List */}
                                <div className="border border-green-500/30 bg-[#050505]">
                                    <div className="p-4 border-b border-green-900/50 flex justify-between items-center">
                                        <h3 className="text-sm font-bold text-green-400 uppercase tracking-widest">Data Stream Log</h3>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-700" />
                                            <input
                                                type="text"
                                                placeholder="SEARCH QUERY..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="bg-black border border-green-900 pl-10 pr-4 py-1 text-xs text-white focus:border-green-500 focus:outline-none w-48 transition uppercase placeholder-green-900"
                                            />
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm text-gray-400">
                                            <thead className="bg-green-900/20 text-green-500 text-xs uppercase font-bold tracking-wider">
                                                <tr>
                                                    <th className="px-6 py-3">Timestamp</th>
                                                    <th className="px-6 py-3">Category</th>
                                                    <th className="px-6 py-3">Value</th>
                                                    <th className="px-6 py-3 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-green-900/30">
                                                {loading ? (
                                                    <tr><td colSpan="4" className="text-center py-8 text-green-800 animate-pulse">LOADING DATA STREAM...</td></tr>
                                                ) : filteredTransactions.length === 0 ? (
                                                    <tr><td colSpan="4" className="text-center py-8 text-green-800">NO DATA FOUND</td></tr>
                                                ) : (
                                                    filteredTransactions.map((t) => (
                                                        <tr key={t.id} className="hover:bg-green-900/10 transition group">
                                                            <td className="px-6 py-4 font-mono text-xs">
                                                                <div className="text-white">{formatDate(t.date)}</div>
                                                                <div className="text-[10px] text-gray-600">{new Date(t.date).getFullYear()}</div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="text-white font-bold">{t.category}</span>
                                                                {t.description && <div className="text-[10px] text-gray-500 font-mono mt-1">{t.description}</div>}
                                                            </td>
                                                            <td className="px-6 py-4 font-mono font-bold">
                                                                <span className={t.type === 'pemasukan' ? 'text-green-400 drop-shadow-[0_0_2px_#00ff00]' : 'text-pink-500 drop-shadow-[0_0_2px_#ec4899]'}>
                                                                    {t.type === 'pemasukan' ? '+' : '-'} {formatCurrency(t.amount)}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <button onClick={() => handleEdit(t)} className="text-green-500 hover:text-white hover:bg-green-500 p-1 transition border border-transparent hover:border-green-400">
                                                                        <Edit2 className="w-4 h-4" />
                                                                    </button>
                                                                    <button onClick={() => handleDelete(t.id)} className="text-pink-500 hover:text-white hover:bg-pink-500 p-1 transition border border-transparent hover:border-pink-400">
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
                                </div>
                            </div>
                        )}

                        {activeTab === 'profile' && (
                            <div className="max-w-2xl mx-auto border border-green-500/30 bg-[#050505] p-8">
                                <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-widest border-b border-green-900 pb-4">
                                    <span className="text-green-500">##</span> User Configuration
                                </h2>

                                {profileMessage && (
                                    <div className="mb-6 p-4 border border-green-500/50 bg-green-500/10 text-green-400 text-sm font-mono">
                                        {'>'} {profileMessage}
                                    </div>
                                )}

                                <form onSubmit={handleUpdateProfile} className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-bold text-green-600 uppercase tracking-wider mb-2">System Identity (Email)</label>
                                        <input type="text" value={profileData.email} disabled className="w-full bg-[#111] border border-green-900 text-gray-500 p-3 text-sm cursor-not-allowed" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-green-600 uppercase tracking-wider mb-2">Display Name</label>
                                        <input type="text" value={profileData.fullName} onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })} className="w-full bg-black border border-green-800 text-white p-3 text-sm focus:border-green-500 focus:outline-none transition" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-green-600 uppercase tracking-wider mb-2">Update Access Key (Password)</label>
                                        <input type="password" value={profileData.newPassword} onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })} placeholder="LEAVE EMPTY TO KEEP CURRENT" className="w-full bg-black border border-green-800 text-white p-3 text-sm focus:border-green-500 focus:outline-none transition" />
                                    </div>
                                    <button type="submit" className="px-8 py-3 bg-green-600 text-black font-bold uppercase tracking-wider hover:bg-green-500 transition shadow-[0_0_15px_rgba(0,255,0,0.2)]">
                                        Save Configuration
                                    </button>
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
