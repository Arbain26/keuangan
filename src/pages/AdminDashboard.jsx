import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchTransactions, createTransaction, deleteTransaction, updateTransaction } from '../lib/api';
import { LogOut, Trash2, Edit2, Plus, X, Search, FileText, LayoutDashboard, User, Lock, Save, Bell, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/format';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | profile
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

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

    // Profile Form State
    const [profileData, setProfileData] = useState({
        fullName: '',
        email: '',
        newPassword: ''
    });
    const [profileMessage, setProfileMessage] = useState('');

    useEffect(() => {
        loadInitialData();
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
                fullName: user.user_metadata?.full_name || ''
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
            setProfileMessage('Gagal memperbarui profil: ' + error.message);
        } else {
            setProfileMessage('Profil berhasil diperbarui!');
            setProfileData(prev => ({ ...prev, newPassword: '' }));
        }
    };

    // Filter
    const filteredTransactions = transactions.filter(t =>
        t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#0f1115] font-sans flex text-gray-300 selection:bg-lime-500 selection:text-black">

            {/* Sidebar */}
            <aside className="w-72 bg-[#161b22] border-r border-[#242c38] hidden md:flex flex-col fixed h-full z-10">
                <div className="p-8 flex items-center gap-3">
                    <div className="w-10 h-10 bg-lime-400 rounded-xl flex items-center justify-center shadow-lg shadow-lime-400/20">
                        <LayoutDashboard className="w-6 h-6 text-black" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-wide">FinTrack</h1>
                        <p className="text-xs text-gray-500 font-medium">Panel Admin</p>
                    </div>

                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium transition duration-200 group ${activeTab === 'dashboard' ? 'bg-lime-400 text-black shadow-lg shadow-lime-400/20' : 'text-gray-400 hover:bg-[#1f2633] hover:text-white'}`}
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard Transaksi
                    </button>
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium transition duration-200 group ${activeTab === 'profile' ? 'bg-lime-400 text-black shadow-lg shadow-lime-400/20' : 'text-gray-400 hover:bg-[#1f2633] hover:text-white'}`}
                    >
                        <User className="w-5 h-5" />
                        Edit Profil
                    </button>
                </nav>

                <div className="p-6">
                    <div className="bg-[#1f2633] rounded-2xl p-4 mb-4 border border-[#2d3646]">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-lime-400 to-green-500 flex items-center justify-center text-black font-bold text-xs">
                                {user?.email?.charAt(0).toUpperCase() || 'A'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{profileData.fullName || 'Admin'}</p>
                                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-[#2d3646] rounded-xl text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition"
                    >
                        <LogOut className="w-4 h-4" />
                        Keluar Sesi
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-72 p-6 md:p-10 overflow-y-auto">
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-1">
                            {activeTab === 'dashboard' ? 'Overview' : 'Pengaturan Akun'}
                        </h2>
                        <p className="text-gray-500 text-sm">
                            {activeTab === 'dashboard' ? 'Selamat datang kembali, kelola keuanganmu hari ini.' : 'Perbarui informasi profil dan keamanan akun Anda.'}
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <Link to="/" target="_blank" className="flex items-center gap-2 px-5 py-2.5 bg-[#1f2633] hover:bg-[#2d3646] text-white rounded-xl text-sm font-medium transition border border-[#2d3646]">
                            Lihat Publik
                            <ChevronRight className="w-4 h-4 text-lime-400" />
                        </Link>
                    </div>
                </header>

                {activeTab === 'dashboard' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Form Section */}
                        <div className="lg:col-span-4">
                            <div className="bg-[#161b22] rounded-3xl p-6 border border-[#242c38] sticky top-8">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        {editingId ? <Edit2 className="w-5 h-5 text-lime-400" /> : <Plus className="w-5 h-5 text-lime-400" />}
                                        {editingId ? 'Edit Transaksi' : 'Transaksi Baru'}
                                    </h3>
                                    {editingId && (
                                        <button onClick={cancelEdit} className="text-xs text-red-400 hover:text-red-300">Batal</button>
                                    )}
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tipe Transaksi</label>
                                        <div className="grid grid-cols-2 gap-3 p-1 bg-[#1f2633] rounded-xl">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, type: 'pemasukan' })}
                                                className={`py-2.5 px-4 rounded-lg text-sm font-bold transition duration-300 ${formData.type === 'pemasukan' ? 'bg-[#0f1115] text-green-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                Pemasukan
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, type: 'pengeluaran' })}
                                                className={`py-2.5 px-4 rounded-lg text-sm font-bold transition duration-300 ${formData.type === 'pengeluaran' ? 'bg-[#0f1115] text-red-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                Pengeluaran
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tanggal</label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full bg-[#1f2633] border border-[#2d3646] rounded-xl text-white text-sm py-3 px-4 focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 outline-none transition"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Jumlah (Rp)</label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            placeholder="0"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            className="w-full bg-[#1f2633] border border-[#2d3646] rounded-xl text-white text-sm py-3 px-4 focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 outline-none transition font-mono"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Kategori</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Makan, Gaji, Transport..."
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full bg-[#1f2633] border border-[#2d3646] rounded-xl text-white text-sm py-3 px-4 focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 outline-none transition"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Catatan</label>
                                        <textarea
                                            rows="2"
                                            placeholder="Opsional..."
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full bg-[#1f2633] border border-[#2d3646] rounded-xl text-white text-sm py-3 px-4 focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 outline-none transition resize-none"
                                        />
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            className={`w-full flex justify-center items-center py-4 px-6 rounded-xl text-sm font-bold text-black transition transform active:scale-95 shadow-lg ${editingId ? 'bg-amber-400 hover:bg-amber-500 shadow-amber-400/20' : 'bg-lime-400 hover:bg-lime-500 shadow-lime-400/20'}`}
                                        >
                                            {editingId ? <Edit2 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                            {editingId ? 'Simpan Perubahan' : 'Tambah Transaksi'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* List Section */}
                        <div className="lg:col-span-8">
                            <div className="bg-[#161b22] rounded-3xl border border-[#242c38] flex flex-col h-full overflow-hidden">
                                <div className="p-6 border-b border-[#242c38] flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#161b22]">
                                    <h2 className="text-lg font-bold text-white">Riwayat Transaksi</h2>
                                    <div className="relative w-full sm:w-72">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="text"
                                            placeholder="Cari transaksi..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-[#1f2633] border border-[#2d3646] text-white focus:border-lime-400 focus:ring-1 focus:ring-lime-400 outline-none transition placeholder-gray-600"
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-x-auto">
                                    <table className="min-w-full divide-y divide-[#242c38]">
                                        <thead className="bg-[#1f2633]/50">
                                            <tr>
                                                <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Waktu</th>
                                                <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Detail</th>
                                                <th className="px-6 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nominal</th>
                                                <th className="px-6 py-5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#242c38]">
                                            {loading ? (
                                                <tr><td colSpan="4" className="text-center py-12 text-gray-600">Memuat data...</td></tr>
                                            ) : filteredTransactions.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" className="text-center py-20">
                                                        <div className="flex flex-col items-center justify-center text-gray-600">
                                                            <div className="w-16 h-16 bg-[#1f2633] rounded-full flex items-center justify-center mb-4">
                                                                <FileText className="w-8 h-8 opacity-50" />
                                                            </div>
                                                            <p className="font-medium">Belum ada data transaksi.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredTransactions.map((t) => (
                                                    <tr key={t.id} className="hover:bg-[#1f2633]/50 transition group">
                                                        <td className="px-6 py-5 whitespace-nowrap">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-gray-300">{formatDate(t.date)}</span>
                                                                <span className="text-xs text-gray-600 mt-1">{new Date(t.date).getFullYear()}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-2 h-2 rounded-full ${t.type === 'pemasukan' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                                <div>
                                                                    <div className="text-sm font-bold text-white">{t.category}</div>
                                                                    {t.description && <div className="text-xs text-gray-500 mt-0.5 max-w-[150px] truncate">{t.description}</div>}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5 whitespace-nowrap">
                                                            <div className={`text-sm font-bold font-mono ${t.type === 'pemasukan' ? 'text-green-400' : 'text-red-400'}`}>
                                                                {t.type === 'pemasukan' ? '+' : '-'} {new Intl.NumberFormat('id-ID').format(t.amount)}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5 whitespace-nowrap text-right text-sm">
                                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => handleEdit(t)} className="p-2 text-lime-400 hover:bg-lime-400/10 rounded-lg transition">
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => handleDelete(t.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition">
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
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-[#161b22] rounded-3xl border border-[#242c38] p-8 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-lime-400 to-green-500"></div>

                            <div className="flex items-center gap-6 mb-8">
                                <div className="w-24 h-24 rounded-full bg-[#1f2633] border-4 border-[#242c38] flex items-center justify-center text-4xl text-gray-500 font-bold">
                                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">Edit Profil Admin</h2>
                                    <p className="text-gray-500 text-sm">Perbarui identitas dan kata sandi akses.</p>
                                </div>
                            </div>

                            {profileMessage && (
                                <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${profileMessage.includes('Gagal') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                                    {profileMessage}
                                </div>
                            )}

                            <form onSubmit={handleUpdateProfile} className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email Akun</label>
                                        <div className="flex items-center gap-3 bg-[#1f2633] border border-[#2d3646] rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed">
                                            <Lock className="w-4 h-4" />
                                            <span className="text-sm">{profileData.email}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-600 mt-2">Email tidak dapat diubah secara langsung.</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nama Lengkap</label>
                                        <input
                                            type="text"
                                            value={profileData.fullName}
                                            onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                                            placeholder="Nama tampilan..."
                                            className="w-full bg-[#161b22] border border-[#2d3646] rounded-xl text-white text-sm py-3 px-4 focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 outline-none transition"
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-[#242c38] pt-6">
                                    <h3 className="text-sm font-bold text-white mb-4">Keamanan</h3>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Password Baru (Opsional)</label>
                                        <input
                                            type="password"
                                            value={profileData.newPassword}
                                            onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                                            placeholder="Biarkan kosong jika tidak ingin mengubah"
                                            className="w-full bg-[#161b22] border border-[#2d3646] rounded-xl text-white text-sm py-3 px-4 focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 outline-none transition"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="submit"
                                        className="flex items-center gap-2 px-8 py-3.5 bg-lime-400 text-black rounded-xl font-bold text-sm hover:bg-lime-500 shadow-lg shadow-lime-400/20 transition transform active:scale-95"
                                    >
                                        <Save className="w-4 h-4" />
                                        Simpan Profil
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

export default AdminDashboard;
