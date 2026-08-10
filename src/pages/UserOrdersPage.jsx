import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { formatCurrency, formatDate } from '../utils/format';
import { ArrowLeft, ShoppingBag, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

const UserOrdersPage = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    const fetchUserOrders = async (userId) => {
        setLoading(true);
        try {
            if (!supabase) return;
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setOrders(data);
            }
        } catch (err) {
            console.error('Error fetching user orders:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const checkUser = async () => {
            if (!supabase) {
                setLoading(false);
                return;
            }
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser || currentUser.email?.toLowerCase() !== 'arbain@gmail.com') {
                navigate(currentUser ? '/admin' : '/login?redirect=/my-orders');
                return;
            }
            setUser(currentUser);
            fetchUserOrders(currentUser.id);
        };

        checkUser();
    }, [navigate]);

    const getPlanLabel = (planCode) => {
        switch (planCode) {
            case 'PREMIUM_MONTHLY': return 'Premium 1 Bulan';
            case 'PREMIUM_YEARLY': return 'Premium 1 Tahun';
            case 'PREMIUM_LIFETIME': return 'Premium Unlimited';
            default: return planCode || 'Premium';
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PAID':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        PAID
                    </span>
                );
            case 'PENDING':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        PENDING
                    </span>
                );
            case 'EXPIRED':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                        <AlertCircle className="w-3.5 h-3.5 mr-1" />
                        EXPIRED
                    </span>
                );
            case 'CANCELLED':
            case 'FAILED':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        {status}
                    </span>
                );
            default:
                return <span className="text-xs font-bold text-gray-600">{status}</span>;
        }
    };

    return (
        <main className="min-h-screen bg-gray-50 text-gray-900 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link to="/admin" className="flex items-center text-gray-600 hover:text-gray-900 font-medium text-sm transition">
                        <ArrowLeft className="w-4 h-4 mr-1.5" />
                        Kembali ke Dashboard
                    </Link>

                    <div className="flex items-center space-x-3">
                        <Link to="/pricing" className="text-xs font-bold px-3.5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm">
                            + Upgrade Paket
                        </Link>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center">
                            <ShoppingBag className="w-7 h-7 mr-2.5 text-blue-600" />
                            Riwayat Transaksi Langganan
                        </h1>
                        <p className="text-gray-600 text-xs md:text-sm mt-1">
                            Daftar pesanan paket Premium dan status pembayaran Anda
                        </p>
                    </div>

                    {user && (
                        <button
                            onClick={() => fetchUserOrders(user.id)}
                            className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-2 rounded-xl transition self-start"
                        >
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                            Muat Ulang Data
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="bg-white rounded-3xl p-12 border border-gray-200 text-center shadow-sm">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Memuat riwayat transaksi...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 border border-gray-200 text-center shadow-sm">
                        <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Belum Ada Transaksi</h3>
                        <p className="text-gray-500 text-xs mb-6">Anda belum pernah melakukan pembelian paket Premium.</p>
                        <Link
                            to="/pricing"
                            className="inline-flex items-center px-5 py-3 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition shadow-md"
                        >
                            Lihat Paket Premium
                        </Link>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[750px]">
                                <thead>
                                    <tr className="bg-gray-50/80 border-b border-gray-200 text-xs text-gray-600 font-bold uppercase tracking-wider">
                                        <th className="py-4 px-6">Order ID</th>
                                        <th className="py-4 px-4">Paket</th>
                                        <th className="py-4 px-4">Harga</th>
                                        <th className="py-4 px-4">Diskon</th>
                                        <th className="py-4 px-4">Total</th>
                                        <th className="py-4 px-4">Metode</th>
                                        <th className="py-4 px-4">Status</th>
                                        <th className="py-4 px-6 text-right">Tanggal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-xs text-gray-800 font-medium">
                                    {orders.map((order) => (
                                        <tr key={order.id || order.order_id} className="hover:bg-gray-50/60 transition">
                                            <td className="py-4 px-6 font-mono font-bold text-blue-700">
                                                {order.order_id}
                                            </td>
                                            <td className="py-4 px-4 font-bold text-gray-900">
                                                {getPlanLabel(order.plan_code)}
                                            </td>
                                            <td className="py-4 px-4 text-gray-600">
                                                {formatCurrency(order.price)}
                                            </td>
                                            <td className="py-4 px-4 text-green-600 font-medium">
                                                {order.discount_amount > 0 ? `- ${formatCurrency(order.discount_amount)}` : 'Rp0'}
                                            </td>
                                            <td className="py-4 px-4 font-extrabold text-gray-900">
                                                {formatCurrency(order.total_amount)}
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-[11px] font-bold">
                                                    {order.payment_method}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                {getStatusBadge(order.status)}
                                            </td>
                                            <td className="py-4 px-6 text-right text-gray-500 font-mono text-[11px]">
                                                {formatDate(order.created_at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};

export default UserOrdersPage;
