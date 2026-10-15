import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft, ShoppingBag, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { usePageTitle } from '../hooks/usePageTitle';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { PLAN_CODE_MAP, ORDER_STATUS_MAP } from '../i18n/translations';

const UserOrdersPage = () => {
    const { t, formatCurrency, formatDate } = useLanguage();
    usePageTitle('nav.myOrders');

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
            if (!currentUser) {
                navigate('/login?redirect=/my-orders');
                return;
            }
            setUser(currentUser);
            fetchUserOrders(currentUser.id);
        };

        checkUser();
    }, [navigate]);

    const getPlanLabel = (planCode) => {
        const translationKey = PLAN_CODE_MAP[planCode];
        if (translationKey) return t(translationKey);
        return planCode || 'Premium';
    };

    const getStatusBadge = (status) => {
        const statusKey = ORDER_STATUS_MAP[status];
        const statusText = statusKey ? t(statusKey) : status;

        switch (status) {
            case 'PAID':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        {statusText}
                    </span>
                );
            case 'PENDING':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        {statusText}
                    </span>
                );
            case 'EXPIRED':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                        <AlertCircle className="w-3.5 h-3.5 mr-1" />
                        {statusText}
                    </span>
                );
            case 'CANCELLED':
            case 'FAILED':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        {statusText}
                    </span>
                );
            default:
                return <span className="text-xs font-bold text-gray-600">{statusText}</span>;
        }
    };

    return (
        <main className="min-h-screen bg-gray-50 text-gray-900 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link to="/admin" className="flex items-center text-gray-600 hover:text-gray-900 font-medium text-sm transition">
                        <ArrowLeft className="w-4 h-4 mr-1.5" />
                        {t('nav.dashboard')}
                    </Link>

                    <div className="flex items-center space-x-3">
                        <LanguageSwitcher variant="header" />
                        <Link to="/pricing" className="text-xs font-bold px-3.5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-xs">
                            + {t('nav.upgradePremium')}
                        </Link>
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center">
                            <ShoppingBag className="w-7 h-7 mr-2.5 text-blue-600" />
                            {t('nav.myOrders')}
                        </h1>
                        <p className="text-gray-600 text-xs md:text-sm mt-1">
                            {t('nav.ordersSub')}
                        </p>
                    </div>

                    {user && (
                        <button
                            onClick={() => fetchUserOrders(user.id)}
                            className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-2 rounded-xl transition self-start"
                        >
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                            {t('refresh')}
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="bg-white rounded-3xl p-12 border border-gray-200 text-center shadow-xs">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{t('loading')}</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 border border-gray-200 text-center shadow-xs">
                        <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{t('none')}</h3>
                        <p className="text-sm text-gray-500 mb-6">{t('public.noTransactions')}</p>
                        <Link
                            to="/pricing"
                            className="inline-flex items-center text-xs font-bold px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition shadow-xs"
                        >
                            {t('nav.upgradePremium')}
                        </Link>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50/75 border-b border-gray-200 text-xs uppercase font-bold text-gray-700">
                                    <tr>
                                        <th className="px-6 py-4">Order ID</th>
                                        <th className="px-6 py-4">{t('transactions.type')}</th>
                                        <th className="px-6 py-4">{t('transactions.amount')}</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">{t('transactions.date')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 font-medium">
                                    {orders.map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50/50 transition">
                                            <td className="px-6 py-4 font-mono text-xs text-gray-900">
                                                {order.order_id || order.id}
                                            </td>
                                            <td className="px-6 py-4 text-gray-900 font-semibold">
                                                {getPlanLabel(order.plan_code)}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-900">
                                                {formatCurrency(order.amount)}
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(order.status)}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-500">
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
