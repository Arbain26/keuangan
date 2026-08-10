import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { 
    fetchPlans, 
    getUserSubscriptionStatus, 
    verifyPromoCode, 
    createCheckoutOrder, 
    processOrderPayment, 
    DEFAULT_PLANS 
} from '../utils/subscriptionEngine';
import { formatCurrency } from '../utils/format';
import { 
    Check, X, Sparkles, Shield, Zap, Award, ArrowLeft, CreditCard, 
    QrCode, Building2, Wallet, CheckCircle2, Lock, Tag, AlertCircle
} from 'lucide-react';

const PricingPage = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [userSub, setUserSub] = useState(null);
    const [plans, setPlans] = useState(DEFAULT_PLANS);
    const [loading, setLoading] = useState(true);

    // Modal Checkout State
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [promoCodeInput, setPromoCodeInput] = useState('');
    const [promoResult, setPromoResult] = useState(null);
    const [promoError, setPromoError] = useState('');
    const [isVerifyingPromo, setIsVerifyingPromo] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('QRIS');
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [checkoutSuccess, setCheckoutSuccess] = useState(null);

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                // Fetch plans from DB
                const planData = await fetchPlans();
                setPlans(planData);

                // Fetch current user session
                if (supabase) {
                    const { data: { user: currentUser } } = await supabase.auth.getUser();
                    setUser(currentUser);
                    if (currentUser) {
                        const sub = await getUserSubscriptionStatus(currentUser.id);
                        setUserSub(sub);
                    }
                }
            } catch (err) {
                console.error('Error loading pricing data:', err);
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, []);

    const handleOpenCheckout = (plan) => {
        if (plan.code === 'FREE') return;

        if (!user) {
            navigate('/login?redirect=/pricing');
            return;
        }

        if (userSub && userSub.plan_code === 'PREMIUM_LIFETIME') {
            alert('Anda sudah memiliki Premium Unlimited.');
            return;
        }

        setSelectedPlan(plan);
        setPromoCodeInput('');
        setPromoResult(null);
        setPromoError('');
        setPaymentMethod('QRIS');
        setCheckoutSuccess(null);
    };

    const handleApplyPromo = async () => {
        if (!selectedPlan || !promoCodeInput.trim()) return;
        setIsVerifyingPromo(true);
        setPromoError('');
        setPromoResult(null);

        try {
            const res = await verifyPromoCode(promoCodeInput, selectedPlan.price);
            if (res.valid) {
                setPromoResult(res);
            } else {
                setPromoError(res.message || 'Kode promo tidak valid');
            }
        } catch {
            setPromoError('Gagal memverifikasi kode promo');
        } finally {
            setIsVerifyingPromo(false);
        }
    };

    const handlePayNow = async () => {
        if (!selectedPlan || !user) return;

        setIsProcessingPayment(true);
        try {
            // 1. Create Checkout Order
            const order = await createCheckoutOrder({
                userId: user.id,
                planCode: selectedPlan.code,
                paymentMethod,
                promoCode: promoResult ? promoResult.code : null
            });

            // 2. Process Simulated Payment Gateway Completion
            const payRes = await processOrderPayment(order.order_id);

            // 3. Update local user subscription state
            const updatedSub = await getUserSubscriptionStatus(user.id);
            setUserSub(updatedSub);

            setCheckoutSuccess({
                orderId: order.order_id,
                totalPaid: order.total_amount,
                planName: selectedPlan.name,
                paymentMethod
            });
        } catch (err) {
            console.error('Error completing payment:', err);
            alert(err.message || 'Gagal memproses pembayaran.');
        } finally {
            setIsProcessingPayment(false);
        }
    };

    // Helper: Calculate current plan status for buttons
    const isCurrentPlan = (planCode) => {
        if (!userSub) return planCode === 'FREE';
        if (userSub.plan_code === planCode && userSub.subscription_status === 'ACTIVE') return true;
        if (planCode === 'FREE' && (userSub.plan_code === 'FREE' || userSub.subscription_status === 'EXPIRED')) return true;
        return false;
    };

    const getPlanPrice = (code, defaultVal) => {
        const found = plans.find(p => p.code === code);
        return found ? found.price : defaultVal;
    };

    return (
        <main className="min-h-screen bg-gray-50 text-gray-900 pb-20">
            {/* Header / Navbar */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Link to="/" className="flex items-center text-gray-600 hover:text-gray-900 font-medium text-sm transition">
                            <ArrowLeft className="w-4 h-4 mr-1.5" />
                            Kembali ke Halaman Publik
                        </Link>
                    </div>

                    <div className="flex items-center space-x-4">
                        {user ? (
                            <Link to="/admin" className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition">
                                Dashboard Saya
                            </Link>
                        ) : (
                            <Link to="/login" className="text-xs font-bold px-3.5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm">
                                Masuk / Daftar
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {/* Banner Section */}
            <section className="pt-12 pb-8 text-center max-w-4xl mx-auto px-4">
                <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 mb-4">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    SISTEM PAKET PREMIUM
                </span>
                <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
                    Pilih Paket Terbaik untuk Keuangan Anda
                </h1>
                <p className="text-gray-600 text-sm md:text-base max-w-2xl mx-auto">
                    Tingkatkan pengelolaan arus kas Anda dengan fitur analisis penuh, tanpa batas penggunaan, serta export laporan siap cetak.
                </p>
            </section>

            {/* 4 Pricing Cards Grid */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                    
                    {/* 1. FREE PLAN */}
                    <div className={`bg-white rounded-3xl p-6 border flex flex-col justify-between transition-all ${
                        isCurrentPlan('FREE') ? 'border-gray-300 ring-2 ring-gray-400/20 shadow-md' : 'border-gray-200 shadow-sm hover:shadow-md'
                    }`}>
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-gray-900">FREE</h3>
                            </div>

                            <div className="mb-6">
                                <div className="text-3xl font-extrabold text-gray-900">Rp0</div>
                                <div className="text-xs text-gray-500 font-medium mt-1">Penggunaan Dasar</div>
                            </div>

                            <ul className="space-y-3 text-xs text-gray-700 mb-6">
                                <li className="flex items-start">
                                    <Check className="w-4 h-4 text-green-500 mr-2 shrink-0 mt-0.5" />
                                    <span>Akses fitur dasar.</span>
                                </li>
                                <li className="flex items-start">
                                    <Check className="w-4 h-4 text-green-500 mr-2 shrink-0 mt-0.5" />
                                    <span>Memiliki batas penggunaan.</span>
                                </li>
                                <li className="flex items-start text-gray-400">
                                    <X className="w-4 h-4 text-gray-300 mr-2 shrink-0 mt-0.5" />
                                    <span>Fitur Premium terkunci.</span>
                                </li>
                                <li className="flex items-start">
                                    <Check className="w-4 h-4 text-green-500 mr-2 shrink-0 mt-0.5" />
                                    <span>Dapat upgrade kapan saja.</span>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <button
                                disabled={isCurrentPlan('FREE')}
                                className={`w-full py-3 rounded-xl font-bold text-xs transition ${
                                    isCurrentPlan('FREE')
                                        ? 'bg-gray-100 text-gray-500 cursor-default'
                                        : 'bg-gray-800 text-white hover:bg-gray-900'
                                }`}
                            >
                                {isCurrentPlan('FREE') ? 'Paket Saat Ini' : 'Gunakan Free'}
                            </button>
                        </div>
                    </div>

                    {/* 2. PREMIUM 1 BULAN */}
                    <div className={`bg-white rounded-3xl p-6 border flex flex-col justify-between transition-all ${
                        isCurrentPlan('PREMIUM_MONTHLY') ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg' : 'border-gray-200 shadow-sm hover:shadow-md'
                    }`}>
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-gray-900">PREMIUM 1 BULAN</h3>
                            </div>

                            <div className="mb-6">
                                <div className="text-3xl font-extrabold text-blue-600">
                                    {formatCurrency(getPlanPrice('PREMIUM_MONTHLY', 29000))}
                                </div>
                                <div className="text-xs font-bold text-blue-700 bg-blue-50 inline-block px-2.5 py-0.5 rounded-full mt-1.5">
                                    30 Hari
                                </div>
                            </div>

                            <ul className="space-y-3 text-xs text-gray-700 mb-6">
                                <li className="flex items-start">
                                    <Check className="w-4 h-4 text-blue-600 mr-2 shrink-0 mt-0.5" />
                                    <span>Semua fitur Premium.</span>
                                </li>
                                <li className="flex items-start">
                                    <Check className="w-4 h-4 text-blue-600 mr-2 shrink-0 mt-0.5" />
                                    <span>Limit penggunaan tanpa batas.</span>
                                </li>
                                <li className="flex items-start">
                                    <Check className="w-4 h-4 text-blue-600 mr-2 shrink-0 mt-0.5" />
                                    <span>Semua fitur analisis.</span>
                                </li>
                                <li className="flex items-start">
                                    <Check className="w-4 h-4 text-blue-600 mr-2 shrink-0 mt-0.5" />
                                    <span>Semua fitur advanced.</span>
                                </li>
                                <li className="flex items-start">
                                    <Check className="w-4 h-4 text-blue-600 mr-2 shrink-0 mt-0.5" />
                                    <span>Export laporan.</span>
                                </li>
                                <li className="flex items-start font-medium text-blue-900">
                                    <Zap className="w-4 h-4 text-blue-600 mr-2 shrink-0 mt-0.5" />
                                    <span>Akses penuh selama 30 hari.</span>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <button
                                onClick={() => handleOpenCheckout(plans.find(p => p.code === 'PREMIUM_MONTHLY') || DEFAULT_PLANS[1])}
                                className="w-full py-3.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white transition shadow-lg shadow-blue-600/20 active:scale-95"
                            >
                                {isCurrentPlan('PREMIUM_MONTHLY') ? 'Perpanjang Sekarang' : 'Beli Sekarang'}
                            </button>
                        </div>
                    </div>

                    {/* 3. PREMIUM 1 TAHUN (PALING POPULER) */}
                    <div className={`bg-white rounded-3xl p-6 border relative flex flex-col justify-between transition-all ${
                        isCurrentPlan('PREMIUM_YEARLY') ? 'border-purple-600 ring-4 ring-purple-500/20 shadow-xl' : 'border-purple-200 shadow-md hover:shadow-lg'
                    }`}>
                        {/* Badge Paling Populer */}
                        <div className="absolute top-0 right-6 -translate-y-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-black tracking-wider uppercase px-3 py-1 rounded-full shadow-md">
                            PALING POPULER
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-gray-900">PREMIUM 1 TAHUN</h3>
                            </div>

                            <div className="mb-6">
                                <div className="text-3xl font-extrabold text-purple-700">
                                    {formatCurrency(getPlanPrice('PREMIUM_YEARLY', 79000))}
                                </div>
                                <div className="text-xs font-bold text-purple-800 bg-purple-100 inline-block px-2.5 py-0.5 rounded-full mt-1.5">
                                    365 Hari
                                </div>
                            </div>

                            <ul className="space-y-3 text-xs text-gray-700 mb-6">
                                <li className="flex items-start">
                                    <Check className="w-4 h-4 text-purple-600 mr-2 shrink-0 mt-0.5" />
                                    <span>Semua fitur Premium.</span>
                                </li>
                                <li className="flex items-start">
                                    <Check className="w-4 h-4 text-purple-600 mr-2 shrink-0 mt-0.5" />
                                    <span>Akses penuh tanpa batas.</span>
                                </li>
                                <li className="flex items-start">
                                    <Check className="w-4 h-4 text-purple-600 mr-2 shrink-0 mt-0.5" />
                                    <span>Tidak terkena batas penggunaan FREE.</span>
                                </li>
                                <li className="flex items-start">
                                    <Check className="w-4 h-4 text-purple-600 mr-2 shrink-0 mt-0.5" />
                                    <span>Semua fitur advanced.</span>
                                </li>
                                <li className="flex items-start">
                                    <Check className="w-4 h-4 text-purple-600 mr-2 shrink-0 mt-0.5" />
                                    <span>Export laporan.</span>
                                </li>
                                <li className="flex items-start font-semibold text-purple-950">
                                    <Award className="w-4 h-4 text-purple-600 mr-2 shrink-0 mt-0.5" />
                                    <span>Aktif selama 1 tahun.</span>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <button
                                onClick={() => handleOpenCheckout(plans.find(p => p.code === 'PREMIUM_YEARLY') || DEFAULT_PLANS[2])}
                                className="w-full py-3.5 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white transition shadow-lg shadow-purple-600/25 active:scale-95"
                            >
                                {isCurrentPlan('PREMIUM_YEARLY') ? 'Perpanjang Sekarang' : 'Beli Sekarang'}
                            </button>
                        </div>
                    </div>

                    {/* 4. PREMIUM UNLIMITED (BEST VALUE) */}
                    <div className={`bg-gradient-to-b from-slate-900 to-gray-900 text-white rounded-3xl p-6 border relative flex flex-col justify-between transition-all ${
                        isCurrentPlan('PREMIUM_LIFETIME') ? 'border-amber-400 ring-4 ring-amber-400/20 shadow-2xl' : 'border-gray-800 shadow-xl hover:shadow-2xl'
                    }`}>
                        {/* Badge Best Value */}
                        <div className="absolute top-0 right-6 -translate-y-1/2 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-[10px] font-black tracking-wider uppercase px-3 py-1 rounded-full shadow-md">
                            BEST VALUE
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-amber-400">PREMIUM UNLIMITED</h3>
                            </div>

                            <div className="mb-6">
                                <div className="text-3xl font-extrabold text-amber-300">
                                    {formatCurrency(getPlanPrice('PREMIUM_LIFETIME', 119999))}
                                </div>
                                <div className="text-xs font-bold text-amber-950 bg-amber-400 inline-block px-2.5 py-0.5 rounded-full mt-1.5 uppercase tracking-wide">
                                    Lifetime / Selamanya
                                </div>
                            </div>

                            <ul className="space-y-3 text-xs text-gray-200 mb-6">
                                <li className="flex items-start">
                                    <Check className="w-4 h-4 text-amber-400 mr-2 shrink-0 mt-0.5" />
                                    <span>Semua fitur Premium.</span>
                                </li>
                                <li className="flex items-start font-bold text-amber-200">
                                    <Shield className="w-4 h-4 text-amber-400 mr-2 shrink-0 mt-0.5" />
                                    <span>Akses seumur hidup.</span>
                                </li>
                                <li className="flex items-start">
                                    <Check className="w-4 h-4 text-amber-400 mr-2 shrink-0 mt-0.5" />
                                    <span>Tidak ada masa kadaluarsa.</span>
                                </li>
                                <li className="flex items-start">
                                    <Check className="w-4 h-4 text-amber-400 mr-2 shrink-0 mt-0.5" />
                                    <span>Tidak perlu perpanjangan.</span>
                                </li>
                                <li className="flex items-start">
                                    <Check className="w-4 h-4 text-amber-400 mr-2 shrink-0 mt-0.5" />
                                    <span>Tidak terkena batas penggunaan FREE.</span>
                                </li>
                                <li className="flex items-start">
                                    <Check className="w-4 h-4 text-amber-400 mr-2 shrink-0 mt-0.5" />
                                    <span>Semua fitur advanced.</span>
                                </li>
                                <li className="flex items-start">
                                    <Check className="w-4 h-4 text-amber-400 mr-2 shrink-0 mt-0.5" />
                                    <span>Export laporan.</span>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <button
                                disabled={isCurrentPlan('PREMIUM_LIFETIME')}
                                onClick={() => handleOpenCheckout(plans.find(p => p.code === 'PREMIUM_LIFETIME') || DEFAULT_PLANS[3])}
                                className={`w-full py-3.5 rounded-xl font-bold text-xs transition active:scale-95 ${
                                    isCurrentPlan('PREMIUM_LIFETIME')
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-default'
                                        : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25'
                                }`}
                            >
                                {isCurrentPlan('PREMIUM_LIFETIME') ? '✓ Anda Memiliki Unlimited' : 'Beli Sekarang'}
                            </button>
                        </div>
                    </div>

                </div>
            </section>

            {/* Feature Comparison Table */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
                <div className="text-center mb-10">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Perbandingan Paket</h2>
                    <p className="text-gray-600 text-xs md:text-sm mt-1">Bandingkan keuntungan setiap paket sesuai kebutuhan Anda</p>
                </div>

                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50/70 text-xs text-gray-700">
                                <th className="py-4 px-6 font-bold">Fitur</th>
                                <th className="py-4 px-4 font-bold text-center">Free</th>
                                <th className="py-4 px-4 font-bold text-center text-blue-600">1 Bulan</th>
                                <th className="py-4 px-4 font-bold text-center text-purple-600">1 Tahun</th>
                                <th className="py-4 px-4 font-bold text-center text-amber-600">Unlimited</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs text-gray-800">
                            <tr>
                                <td className="py-3.5 px-6 font-medium">Dashboard</td>
                                <td className="text-center text-green-600 font-bold">✓</td>
                                <td className="text-center text-green-600 font-bold">✓</td>
                                <td className="text-center text-green-600 font-bold">✓</td>
                                <td className="text-center text-green-600 font-bold">✓</td>
                            </tr>
                            <tr>
                                <td className="py-3.5 px-6 font-medium">Fitur dasar</td>
                                <td className="text-center text-green-600 font-bold">✓</td>
                                <td className="text-center text-green-600 font-bold">✓</td>
                                <td className="text-center text-green-600 font-bold">✓</td>
                                <td className="text-center text-green-600 font-bold">✓</td>
                            </tr>
                            <tr>
                                <td className="py-3.5 px-6 font-medium">Batas penggunaan</td>
                                <td className="text-center text-green-600 font-bold">✓</td>
                                <td className="text-center text-red-500 font-bold">✕</td>
                                <td className="text-center text-red-500 font-bold">✕</td>
                                <td className="text-center text-red-500 font-bold">✕</td>
                            </tr>
                            <tr>
                                <td className="py-3.5 px-6 font-medium">Fitur Premium</td>
                                <td className="text-center text-red-500 font-bold">✕</td>
                                <td className="text-center text-green-600 font-bold">✓</td>
                                <td className="text-center text-green-600 font-bold">✓</td>
                                <td className="text-center text-green-600 font-bold">✓</td>
                            </tr>
                            <tr>
                                <td className="py-3.5 px-6 font-medium">Analisis lanjutan</td>
                                <td className="text-center text-amber-600 font-semibold">Terbatas</td>
                                <td className="text-center text-green-600 font-bold">✓</td>
                                <td className="text-center text-green-600 font-bold">✓</td>
                                <td className="text-center text-green-600 font-bold">✓</td>
                            </tr>
                            <tr>
                                <td className="py-3.5 px-6 font-medium">Export</td>
                                <td className="text-center text-amber-600 font-semibold">Terbatas</td>
                                <td className="text-center text-green-600 font-bold">✓</td>
                                <td className="text-center text-green-600 font-bold">✓</td>
                                <td className="text-center text-green-600 font-bold">✓</td>
                            </tr>
                            <tr>
                                <td className="py-3.5 px-6 font-medium">Semua fitur</td>
                                <td className="text-center text-red-500 font-bold">✕</td>
                                <td className="text-center text-green-600 font-bold">✓</td>
                                <td className="text-center text-green-600 font-bold">✓</td>
                                <td className="text-center text-green-600 font-bold">✓</td>
                            </tr>
                            <tr className="bg-gray-50/50">
                                <td className="py-3.5 px-6 font-bold text-gray-900">Masa aktif</td>
                                <td className="text-center text-gray-500 font-bold">-</td>
                                <td className="text-center text-blue-700 font-bold">30 hari</td>
                                <td className="text-center text-purple-700 font-bold">365 hari</td>
                                <td className="text-center text-amber-700 font-bold">Lifetime</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Checkout & Payment Gateway Modal */}
            {selectedPlan && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative border border-gray-100 overflow-hidden">
                        <button
                            onClick={() => setSelectedPlan(null)}
                            className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition p-1 rounded-full"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {checkoutSuccess ? (
                            /* Success Order View */
                            <div className="text-center py-6">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">Pembayaran Berhasil!</h3>
                                <p className="text-gray-600 text-xs mb-6">
                                    Paket <strong>{checkoutSuccess.planName}</strong> telah aktif pada akun Anda.
                                </p>

                                <div className="bg-gray-50 rounded-2xl p-4 text-xs space-y-2 mb-6 text-left border border-gray-200">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Order ID</span>
                                        <span className="font-mono font-bold text-gray-900">{checkoutSuccess.orderId}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Metode Pembayaran</span>
                                        <span className="font-bold text-gray-900">{checkoutSuccess.paymentMethod}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Total Dibayar</span>
                                        <span className="font-bold text-green-600">{formatCurrency(checkoutSuccess.totalPaid)}</span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => navigate('/my-orders')}
                                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs transition"
                                    >
                                        Riwayat Pesanan
                                    </button>
                                    <button
                                        onClick={() => navigate('/admin')}
                                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition shadow-md"
                                    >
                                        Ke Dashboard
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Checkout Form View */
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1">Checkout Pembayaran</h3>
                                <p className="text-xs text-gray-500 mb-6">Selesaikan pembayaran untuk mengaktifkan paket Premium</p>

                                {/* Plan Selected Card Summary */}
                                <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 mb-6 flex justify-between items-center">
                                    <div>
                                        <div className="text-xs font-bold text-blue-900">{selectedPlan.name}</div>
                                        <div className="text-[11px] text-blue-700">
                                            {selectedPlan.code === 'PREMIUM_LIFETIME' ? 'Masa Aktif: Selamanya (Lifetime)' : `Masa Aktif: ${selectedPlan.duration_days} Hari`}
                                        </div>
                                    </div>
                                    <div className="text-lg font-extrabold text-blue-700">
                                        {formatCurrency(selectedPlan.price)}
                                    </div>
                                </div>

                                {/* Promo Code Input */}
                                <div className="mb-6">
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Kode Promo / Diskon</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Tag className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                            <input
                                                type="text"
                                                value={promoCodeInput}
                                                onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                                                placeholder="Contoh: HEMAT20"
                                                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs uppercase font-mono tracking-wider text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleApplyPromo}
                                            disabled={isVerifyingPromo || !promoCodeInput.trim()}
                                            className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-xs transition disabled:opacity-50"
                                        >
                                            {isVerifyingPromo ? 'Gunakan...' : 'Terapkan'}
                                        </button>
                                    </div>
                                    {promoResult && (
                                        <p className="text-[11px] font-medium text-green-600 mt-1.5 flex items-center">
                                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                            Kode promo {promoResult.code} berhasil diterapkan! ({promoResult.discount_value}% diskon)
                                        </p>
                                    )}
                                    {promoError && (
                                        <p className="text-[11px] font-medium text-red-600 mt-1.5 flex items-center">
                                            <AlertCircle className="w-3.5 h-3.5 mr-1" />
                                            {promoError}
                                        </p>
                                    )}
                                </div>

                                {/* Payment Method Selector */}
                                <div className="mb-6">
                                    <label className="block text-xs font-bold text-gray-700 mb-2">Metode Pembayaran</label>
                                    <div className="grid grid-cols-3 gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('QRIS')}
                                            className={`p-3 rounded-xl border flex flex-col items-center justify-center text-xs transition ${
                                                paymentMethod === 'QRIS'
                                                    ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold ring-2 ring-blue-600/20'
                                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            <QrCode className="w-5 h-5 mb-1 text-blue-600" />
                                            QRIS
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('Virtual Account')}
                                            className={`p-3 rounded-xl border flex flex-col items-center justify-center text-xs transition ${
                                                paymentMethod === 'Virtual Account'
                                                    ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold ring-2 ring-blue-600/20'
                                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            <Building2 className="w-5 h-5 mb-1 text-purple-600" />
                                            Transfer VA
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('E-Wallet')}
                                            className={`p-3 rounded-xl border flex flex-col items-center justify-center text-xs transition ${
                                                paymentMethod === 'E-Wallet'
                                                    ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold ring-2 ring-blue-600/20'
                                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            <Wallet className="w-5 h-5 mb-1 text-emerald-600" />
                                            E-Wallet
                                        </button>
                                    </div>
                                </div>

                                {/* Order Price Calculation Summary */}
                                <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-xs space-y-2 border border-gray-200">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Harga Paket</span>
                                        <span>{formatCurrency(selectedPlan.price)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Promo Diskon</span>
                                        <span className="text-green-600 font-semibold">
                                            {promoResult ? `- ${formatCurrency(promoResult.discount_amount)}` : 'Rp0'}
                                        </span>
                                    </div>
                                    <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold text-gray-900">
                                        <span>Total Pembayaran</span>
                                        <span className="text-blue-600 font-extrabold">
                                            {formatCurrency(promoResult ? promoResult.total_amount : selectedPlan.price)}
                                        </span>
                                    </div>
                                </div>

                                {/* Pay Button */}
                                <button
                                    onClick={handlePayNow}
                                    disabled={isProcessingPayment}
                                    className="w-full py-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white transition shadow-lg shadow-blue-600/25 flex items-center justify-center active:scale-95 disabled:opacity-50"
                                >
                                    {isProcessingPayment ? (
                                        <span className="flex items-center">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                            Memproses Pembayaran...
                                        </span>
                                    ) : (
                                        <span className="flex items-center">
                                            <Lock className="w-4 h-4 mr-2" />
                                            Bayar Sekarang ({formatCurrency(promoResult ? promoResult.total_amount : selectedPlan.price)})
                                        </span>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
};

export default PricingPage;
