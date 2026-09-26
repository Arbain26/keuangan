import { useState } from 'react';
import { 
    Crown, 
    Shield, 
    CheckCircle2, 
    X, 
    Users, 
    ShieldCheck, 
    DollarSign, 
    RefreshCw, 
    Plus, 
    Search, 
    Edit2, 
    Ban, 
    ShoppingBag, 
    MessageCircle, 
    Clock,
    AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/format';
import { isSuperAdmin } from '../utils/subscriptionEngine';

export const AdminSubscriptionCenter = ({
    user,
    isAdminUtama,
    allSubscriptions = [],
    allOrders = [],
    loading = false,
    onRefresh,
    onConfirmPayment,
    onCancelOrder,
    onRevokePremium,
    onOpenGrantModal,
    isConfirmingOrder
}) => {
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [userStatusFilter, setUserStatusFilter] = useState('ALL'); // ALL | ACTIVE | FREE | EXPIRED
    const [orderFilter, setOrderFilter] = useState('ALL'); // ALL | PENDING | PAID | CANCELLED | EXPIRED

    if (!isAdminUtama) {
        return (
            <div className="bg-white border border-rose-200 rounded-3xl p-10 text-center max-w-lg mx-auto shadow-xl">
                <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
                    <Shield className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Akses Dibatasi: Khusus Admin Utama</h3>
                <p className="text-xs text-gray-600 leading-relaxed mb-4">
                    Halaman kontrol persetujuan langganan dan seluruh riwayat transaksi pembayaran hanya dapat diakses oleh Admin Utama (<span className="font-mono font-bold text-rose-600">arbain@gmail.com</span>).
                </p>
                <div className="p-3 bg-gray-50 rounded-xl text-left text-xs text-gray-500 font-mono">
                    Akun saat ini: {user?.email || 'Anonim / Belum Login'}
                </div>
            </div>
        );
    }

    const pendingOrders = allOrders.filter(o => o.status === 'PENDING');
    const activeSubsCount = allSubscriptions.filter(s => s.subscription_status === 'ACTIVE').length;
    const totalRevenue = allOrders
        .filter(o => o.status === 'PAID')
        .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    const filteredUsers = allSubscriptions.filter(sub => {
        const term = userSearchTerm.toLowerCase().trim();
        const emailStr = typeof sub.user_email === 'string' ? sub.user_email.toLowerCase() : '';
        const idStr = typeof sub.user_id === 'string' ? sub.user_id.toLowerCase() : '';
        const matchesSearch = !term || emailStr.includes(term) || idStr.includes(term);
        if (!matchesSearch) return false;
        if (userStatusFilter === 'ACTIVE') return sub.subscription_status === 'ACTIVE';
        if (userStatusFilter === 'FREE') return sub.plan_code === 'FREE' || sub.subscription_status === 'FREE';
        if (userStatusFilter === 'EXPIRED') return sub.subscription_status === 'EXPIRED';
        return true;
    });

    const filteredOrders = orderFilter === 'ALL' 
        ? allOrders 
        : allOrders.filter(o => o.status === orderFilter);

    return (
        <div className="space-y-8">
            {/* Super Admin Control Hero Banner */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden border border-amber-500/30">
                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-3 shadow-sm">
                            <Crown className="w-3.5 h-3.5 text-amber-400" />
                            PUSAT KONTROL ADMIN UTAMA
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                            Kelola Seluruh Pengguna & Persetujuan Langganan
                        </h3>
                        <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed">
                            Selamat datang, <span className="font-mono text-amber-300 font-bold">{user?.email || 'arbain@gmail.com'}</span>. Anda memiliki otoritas penuh untuk menyetujui transaksi pembayaran (QRIS Barcode, E-Wallet, Transfer Bank BRI) dan mengontrol status langganan seluruh pengguna website.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={onRefresh}
                            disabled={loading}
                            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 backdrop-blur-sm border border-white/10 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
                        </button>
                        <button
                            onClick={() => onOpenGrantModal(null)}
                            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
                        >
                            <Plus className="w-4 h-4" /> Berikan / Ubah Paket
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Stat Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`rounded-2xl p-5 border transition shadow-sm ${
                    pendingOrders.length > 0
                        ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-400/40'
                        : 'bg-white border-gray-200'
                }`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-amber-700">Antrean Approval</span>
                        {pendingOrders.length > 0 && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />}
                    </div>
                    <h4 className="text-2xl font-black text-gray-900">
                        {pendingOrders.length}
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-1">Perlu konfirmasi pembayaran</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-500">Total Pengguna</span>
                        <Users className="w-4 h-4 text-blue-500" />
                    </div>
                    <h4 className="text-2xl font-black text-gray-900">
                        {allSubscriptions.length || 1}
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-1">Terdaftar dalam sistem</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-emerald-600">Langganan Aktif</span>
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    </div>
                    <h4 className="text-2xl font-black text-emerald-700">
                        {activeSubsCount}
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-1">Premium 1 Bulan/1 Tahun/Unlimited</p>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-blue-100">Total Omset Pembayaran</span>
                        <DollarSign className="w-4 h-4 text-amber-300" />
                    </div>
                    <h4 className="text-2xl font-black">
                        {formatCurrency(totalRevenue)}
                    </h4>
                    <p className="text-[11px] text-blue-200 mt-1">Dari transaksi PAID</p>
                </div>
            </div>

            {/* ===== SECTION 1: ANTREAN PERSETUJUAN TRANSAKSI (APPROVAL QUEUE) ===== */}
            <div className="bg-white border-2 border-amber-400/80 rounded-3xl overflow-hidden shadow-md">
                <div className="p-5 md:p-6 bg-amber-50/50 border-b border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                            <h3 className="font-black text-gray-950 text-lg">
                                Antrean Persetujuan Transaksi (Approval Queue)
                            </h3>
                            <span className="bg-amber-500 text-slate-950 text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm">
                                {pendingOrders.length} Order Menunggu
                            </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                            Daftar pengguna yang sedang melakukan pembayaran paket langganan. Cek mutasi rekening / e-wallet, lalu klik tombol <strong className="text-emerald-700">APPROVE</strong> untuk langsung mengaktifkan akun.
                        </p>
                    </div>
                </div>

                {pendingOrders.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">
                        <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-gray-800">Tidak ada antrean pembayaran pending</p>
                        <p className="text-xs text-gray-400 mt-1">Semua order yang masuk telah diproses oleh Admin Utama.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-gray-700 min-w-[850px]">
                            <thead className="bg-gray-50/80 border-b border-gray-200 font-bold uppercase tracking-wider text-gray-600">
                                <tr>
                                    <th className="py-3.5 px-5">Order ID</th>
                                    <th className="py-3.5 px-4">Pengguna (Email & WA)</th>
                                    <th className="py-3.5 px-4">Paket Dipilih</th>
                                    <th className="py-3.5 px-4">Metode Bayar</th>
                                    <th className="py-3.5 px-4">Nominal</th>
                                    <th className="py-3.5 px-4">Waktu Order</th>
                                    <th className="py-3.5 px-5 text-center">Tindakan Admin</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-medium">
                                {pendingOrders.map((order) => {
                                    const phoneMatch = order.notes?.match(/08\d+/);
                                    const customerPhone = phoneMatch ? phoneMatch[0] : null;
                                    return (
                                        <tr key={order.order_id} className="hover:bg-amber-50/30 transition">
                                            <td className="py-4 px-5">
                                                <span className="font-mono font-bold text-gray-950 block">{order.order_id}</span>
                                                <span className="text-[10px] text-gray-400 font-mono">UID: {order.user_id?.substring(0, 8)}...</span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <p className="font-bold text-gray-900">{order.user_email || 'Email tidak tercatat'}</p>
                                                {customerPhone && (
                                                    <a 
                                                        href={`https://wa.me/62${customerPhone.replace(/^0/, '')}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 font-bold mt-0.5"
                                                    >
                                                        <MessageCircle className="w-3 h-3" />
                                                        WA: {customerPhone}
                                                    </a>
                                                )}
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="font-bold text-blue-700 block">
                                                    {order.plan_code === 'PREMIUM_MONTHLY' ? 'Premium 1 Bulan' :
                                                     order.plan_code === 'PREMIUM_YEARLY' ? 'Premium 1 Tahun' :
                                                     order.plan_code === 'PREMIUM_LIFETIME' ? 'Premium Unlimited' : order.plan_code}
                                                </span>
                                                <span className="text-[10px] text-gray-500">
                                                    {order.plan_code === 'PREMIUM_LIFETIME' ? 'Selamanya' : order.plan_code === 'PREMIUM_YEARLY' ? '365 Hari' : '30 Hari'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="font-semibold text-gray-800 block">{order.payment_method}</span>
                                                {order.promo_code && (
                                                    <span className="inline-block text-[10px] bg-green-100 text-green-800 font-bold px-1.5 py-0.5 rounded">
                                                        Promo: {order.promo_code}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="text-sm font-black text-gray-950 block">
                                                    {formatCurrency(order.total_amount)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-gray-500 text-[11px]">
                                                {order.created_at ? new Date(order.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                                            </td>
                                            <td className="py-4 px-5 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => onConfirmPayment(order.order_id)}
                                                        disabled={isConfirmingOrder === order.order_id}
                                                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95"
                                                        title="Setujui dan Aktifkan Akun"
                                                    >
                                                        {isConfirmingOrder === order.order_id ? (
                                                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                        )}
                                                        APPROVE
                                                    </button>
                                                    <button
                                                        onClick={() => onCancelOrder(order.order_id)}
                                                        disabled={isConfirmingOrder === order.order_id}
                                                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center gap-1 border border-rose-200"
                                                        title="Tolak Transaksi"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                        Tolak
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ===== SECTION 2: KONTROL SELURUH PENGGUNA ===== */}
            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-5 md:p-6 border-b border-gray-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="font-black text-gray-900 text-lg flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-600" />
                                Kontrol Seluruh Pengguna & Status Langganan ({allSubscriptions.length})
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                                Kelola status setiap pengguna secara manual. Anda dapat menambahkan paket Premium, memperpanjang durasi, atau mencabut akses.
                            </p>
                        </div>
                        <button
                            onClick={() => onOpenGrantModal(null)}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold transition shadow-sm self-start md:self-auto"
                        >
                            + Berikan Akses Premium Manual
                        </button>
                    </div>

                    {/* Search & Filter Toolbar */}
                    <div className="mt-4 flex flex-col md:flex-row items-center gap-3">
                        <div className="relative flex-1 w-full">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Cari email pengguna atau User ID..."
                                value={userSearchTerm}
                                onChange={(e) => setUserSearchTerm(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex gap-1.5 w-full md:w-auto flex-wrap">
                            {[
                                { id: 'ALL', label: 'Semua User' },
                                { id: 'ACTIVE', label: 'Premium Aktif' },
                                { id: 'FREE', label: 'Paket FREE' },
                                { id: 'EXPIRED', label: 'Kedaluwarsa' }
                            ].map((btn) => (
                                <button
                                    key={btn.id}
                                    onClick={() => setUserStatusFilter(btn.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                        userStatusFilter === btn.id
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-700 min-w-[750px]">
                        <thead className="bg-gray-50 border-b border-gray-200 font-bold uppercase tracking-wider text-gray-500">
                            <tr>
                                <th className="py-3.5 px-6">Pengguna</th>
                                <th className="py-3.5 px-4">Paket Langganan</th>
                                <th className="py-3.5 px-4">Status</th>
                                <th className="py-3.5 px-4">Sumber</th>
                                <th className="py-3.5 px-4">Masa Berlaku</th>
                                <th className="py-3.5 px-6 text-center">Aksi Admin</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-8 text-center text-gray-400">
                                        Tidak ada data pengguna yang sesuai pencarian.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((sub) => {
                                    const isCurrentUserAdmin = isSuperAdmin(sub.user_email || sub);
                                    const isActivePremium = sub.subscription_status === 'ACTIVE' && sub.plan_code !== 'FREE';
                                    return (
                                        <tr key={sub.id || sub.user_id} className="hover:bg-gray-50/50 transition">
                                            <td className="py-3.5 px-6">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="font-bold text-gray-900">{sub.user_email || 'Email belum tercatat'}</p>
                                                    {isCurrentUserAdmin && (
                                                        <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded">
                                                            UTAMA
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="font-mono text-[10px] text-gray-400">UID: {sub.user_id}</p>
                                            </td>
                                            <td className="py-3.5 px-4 font-bold">
                                                <span className={
                                                    sub.plan_code === 'PREMIUM_LIFETIME' ? 'text-amber-600' :
                                                    sub.plan_code === 'PREMIUM_YEARLY' ? 'text-indigo-600' :
                                                    sub.plan_code === 'PREMIUM_MONTHLY' ? 'text-blue-600' : 'text-gray-600'
                                                }>
                                                    {sub.plan_code === 'PREMIUM_MONTHLY' ? 'Premium 1 Bulan' :
                                                     sub.plan_code === 'PREMIUM_YEARLY' ? 'Premium 1 Tahun' :
                                                     sub.plan_code === 'PREMIUM_LIFETIME' ? 'Premium Unlimited' : 'FREE'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    sub.subscription_status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                                                    sub.subscription_status === 'EXPIRED' ? 'bg-rose-100 text-rose-800' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {sub.subscription_status}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                    sub.source === 'ADMIN_GRANTED' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {sub.source || 'PAID'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 font-mono text-[11px] text-gray-600">
                                                {sub.plan_code === 'PREMIUM_LIFETIME' ? (
                                                    <span className="text-amber-600 font-bold">Lifetime (Selamanya)</span>
                                                ) : sub.subscription_end ? (
                                                    formatDate(sub.subscription_end)
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td className="py-3.5 px-6 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => onOpenGrantModal(sub)}
                                                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                                                        title="Beri atau Ubah Paket"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                        Ubah Paket
                                                    </button>
                                                    {isActivePremium && !isCurrentUserAdmin && (
                                                        <button
                                                            onClick={() => onRevokePremium(sub.user_id, sub.user_email)}
                                                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                                                            title="Cabut Status Premium (Kembalikan ke Free)"
                                                        >
                                                            <Ban className="w-3 h-3" />
                                                            Cabut
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ===== SECTION 3: RIWAYAT TRANSAKSI PEMBAYARAN ===== */}
            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-5 md:p-6 border-b border-gray-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                            <h3 className="font-black text-gray-900 text-lg flex items-center gap-2">
                                <ShoppingBag className="w-5 h-5 text-amber-500" />
                                Seluruh Riwayat Transaksi Pembayaran ({allOrders.length})
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Data riwayat transaksi lengkap dari pengguna yang membeli paket melalui website. Eksklusif untuk Admin Utama.
                            </p>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                            {['ALL', 'PENDING', 'PAID', 'CANCELLED', 'EXPIRED'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setOrderFilter(f)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                        orderFilter === f
                                            ? f === 'PENDING' ? 'bg-amber-500 text-white shadow-sm' :
                                              f === 'PAID' ? 'bg-emerald-600 text-white shadow-sm' :
                                              f === 'CANCELLED' ? 'bg-rose-600 text-white shadow-sm' :
                                              'bg-gray-900 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {f} {f === 'PENDING' && pendingOrders.length > 0 && (
                                        <span className="ml-1 bg-white/30 rounded-full px-1.5">{pendingOrders.length}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-700 min-w-[900px]">
                        <thead className="bg-gray-50 border-b border-gray-200 font-bold uppercase tracking-wider text-gray-500">
                            <tr>
                                <th className="py-3.5 px-5">Order ID</th>
                                <th className="py-3.5 px-4">Pengguna</th>
                                <th className="py-3.5 px-4">Paket</th>
                                <th className="py-3.5 px-4">Metode Bayar</th>
                                <th className="py-3.5 px-4">Nominal</th>
                                <th className="py-3.5 px-4">Status</th>
                                <th className="py-3.5 px-4">Tanggal Order</th>
                                <th className="py-3.5 px-5 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium">
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="py-10 text-center text-gray-400">
                                        {allOrders.length === 0
                                            ? 'Belum ada transaksi pembayaran yang tercatat.'
                                            : `Tidak ada transaksi dengan status ${orderFilter}.`}
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => (
                                    <tr key={order.order_id} className={`hover:bg-gray-50/50 transition ${order.status === 'PENDING' ? 'bg-amber-50/40' : ''}`}>
                                        <td className="py-3.5 px-5 font-mono text-[11px] font-bold text-gray-900">
                                            {order.order_id}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <p className="font-bold text-gray-900">{order.user_email || 'Email tidak tercatat'}</p>
                                            <p className="text-[10px] text-gray-400 font-mono">UID: {order.user_id?.substring(0, 12)}...</p>
                                        </td>
                                        <td className="py-3.5 px-4 font-bold text-blue-700">
                                            {order.plan_code === 'PREMIUM_MONTHLY' ? '1 Bulan' :
                                             order.plan_code === 'PREMIUM_YEARLY' ? '1 Tahun' :
                                             order.plan_code === 'PREMIUM_LIFETIME' ? 'Unlimited' : order.plan_code}
                                        </td>
                                        <td className="py-3.5 px-4 text-gray-700">
                                            <span className="font-medium">{order.payment_method}</span>
                                            {order.promo_code && (
                                                <span className="ml-1 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">
                                                    {order.promo_code}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 font-black text-gray-950">
                                            {formatCurrency(order.total_amount)}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1 ${
                                                order.status === 'PAID' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                                order.status === 'PENDING' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                                order.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {order.status === 'PAID' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                                {order.status === 'PENDING' && <Clock className="w-3 h-3 text-amber-600" />}
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-gray-500 text-[11px]">
                                            {order.created_at ? new Date(order.created_at).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '-'}
                                        </td>
                                        <td className="py-3.5 px-5 text-center">
                                            {order.status === 'PENDING' ? (
                                                <div className="flex gap-1.5 justify-center">
                                                    <button
                                                        onClick={() => onConfirmPayment(order.order_id)}
                                                        disabled={isConfirmingOrder === order.order_id}
                                                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition disabled:opacity-50 flex items-center gap-1 shadow-sm"
                                                    >
                                                        {isConfirmingOrder === order.order_id ? (
                                                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <CheckCircle2 className="w-3 h-3" />
                                                        )}
                                                        APPROVE
                                                    </button>
                                                    <button
                                                        onClick={() => onCancelOrder(order.order_id)}
                                                        disabled={isConfirmingOrder === order.order_id}
                                                        className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold transition disabled:opacity-50 border border-rose-200"
                                                    >
                                                        Tolak
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-gray-300 text-[11px]">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
