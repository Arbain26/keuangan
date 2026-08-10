import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { 
    fetchPlans, 
    getUserSubscriptionStatus, 
    verifyPromoCode, 
    createCheckoutOrder, 
    checkPaymentStatus,
    DEFAULT_PLANS 
} from '../utils/subscriptionEngine';
import { formatCurrency } from '../utils/format';
import { 
    Check, X, Sparkles, Shield, Zap, Award, ArrowLeft, CreditCard, 
    QrCode, Building2, Wallet, CheckCircle2, Lock, Tag, AlertCircle, Copy
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
    
    // Payment flow state
    const [pendingOrder, setPendingOrder] = useState(null);   // Created PENDING order
    const [paymentConfirmed, setPaymentConfirmed] = useState(false); // PAID confirmed
    const [isCheckingStatus, setIsCheckingStatus] = useState(false);
    const [copiedField, setCopiedField] = useState('');
    const [countdown, setCountdown] = useState(null); // seconds remaining

    const handleCopyText = (text, fieldName) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(''), 2500);
    };

    // Countdown timer for pending orders
    useEffect(() => {
        if (!pendingOrder?.expired_at) return;
        const tick = () => {
            const secs = Math.max(0, Math.floor((new Date(pendingOrder.expired_at) - Date.now()) / 1000));
            setCountdown(secs);
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [pendingOrder]);

    // Polling: check payment status every 5 seconds while pendingOrder exists
    useEffect(() => {
        if (!pendingOrder?.order_id || paymentConfirmed) return;
        const poll = setInterval(async () => {
            try {
                const status = await checkPaymentStatus(pendingOrder.order_id);
                if (status?.status === 'PAID') {
                    setPaymentConfirmed(true);
                    // Refresh user subscription
                    if (user) {
                        const updatedSub = await getUserSubscriptionStatus(user.id);
                        setUserSub(updatedSub);
                    }
                    clearInterval(poll);
                } else if (status?.status === 'CANCELLED' || status?.status === 'EXPIRED') {
                    setPendingOrder(prev => ({ ...prev, status: status.status }));
                    clearInterval(poll);
                }
            } catch {}
        }, 5000);
        return () => clearInterval(poll);
    }, [pendingOrder, paymentConfirmed, user]);

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                const planData = await fetchPlans();
                setPlans(planData);
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
        setPendingOrder(null);
        setPaymentConfirmed(false);
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

    // âš ï¸ CRITICAL FIX: This ONLY creates a PENDING order.
    // It does NOT activate Premium. Premium is activated only by Admin after verifying payment.
    const handlePayNow = async () => {
        if (!selectedPlan || !user) return;
        setIsProcessingPayment(true);
        try {
            const order = await createCheckoutOrder({
                userId: user.id,
                planCode: selectedPlan.code,
                paymentMethod,
                promoCode: promoResult ? promoResult.code : null
            });
            // Order is now PENDING. Show waiting-for-payment screen.
            setPendingOrder(order);
        } catch (err) {
            console.error('Error creating order:', err);
            alert(err.message || 'Gagal membuat pesanan.');
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const handleCheckStatus = async () => {
        if (!pendingOrder?.order_id) return;
        setIsCheckingStatus(true);
        try {
            const status = await checkPaymentStatus(pendingOrder.order_id);
            if (status?.status === 'PAID') {
                setPaymentConfirmed(true);
                if (user) {
                    const updatedSub = await getUserSubscriptionStatus(user.id);
                    setUserSub(updatedSub);
                }
            } else {
                setPendingOrder(prev => ({ ...prev, status: status?.status || prev.status }));
                alert(`Status pembayaran: ${status?.status || 'PENDING'}. Mohon selesaikan pembayaran terlebih dahulu.`);
            }
        } catch {
            alert('Gagal memeriksa status. Silakan coba lagi.');
        } finally {
            setIsCheckingStatus(false);
        }
    };

    const formatCountdown = (secs) => {
        if (!secs && secs !== 0) return '--:--:--';
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
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
                                {isCurrentPlan('PREMIUM_LIFETIME') ? 'âœ“ Anda Memiliki Unlimited' : 'Beli Sekarang'}
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
                                <td className="text-center text-green-600 font-bold">âœ“</td>
                                <td className="text-center text-green-600 font-bold">âœ“</td>
                                <td className="text-center text-green-600 font-bold">âœ“</td>
                                <td className="text-center text-green-600 font-bold">âœ“</td>
                            </tr>
                            <tr>
                                <td className="py-3.5 px-6 font-medium">Fitur dasar</td>
                                <td className="text-center text-green-600 font-bold">âœ“</td>
                                <td className="text-center text-green-600 font-bold">âœ“</td>
                                <td className="text-center text-green-600 font-bold">âœ“</td>
                                <td className="text-center text-green-600 font-bold">âœ“</td>
                            </tr>
                            <tr>
                                <td className="py-3.5 px-6 font-medium">Batas penggunaan</td>
                                <td className="text-center text-green-600 font-bold">âœ“</td>
                                <td className="text-center text-red-500 font-bold">âœ•</td>
                                <td className="text-center text-red-500 font-bold">âœ•</td>
                                <td className="text-center text-red-500 font-bold">âœ•</td>
                            </tr>
                            <tr>
                                <td className="py-3.5 px-6 font-medium">Fitur Premium</td>
                                <td className="text-center text-red-500 font-bold">âœ•</td>
                                <td className="text-center text-green-600 font-bold">âœ“</td>
                                <td className="text-center text-green-600 font-bold">âœ“</td>
                                <td className="text-center text-green-600 font-bold">âœ“</td>
                            </tr>
                            <tr>
                                <td className="py-3.5 px-6 font-medium">Analisis lanjutan</td>
                                <td className="text-center text-amber-600 font-semibold">Terbatas</td>
                                <td className="text-center text-green-600 font-bold">âœ“</td>
                                <td className="text-center text-green-600 font-bold">âœ“</td>
                                <td className="text-center text-green-600 font-bold">âœ“</td>
                            </tr>
                            <tr>
                                <td className="py-3.5 px-6 font-medium">Export</td>
                                <td className="text-center text-amber-600 font-semibold">Terbatas</td>
                                <td className="text-center text-green-600 font-bold">âœ“</td>
                                <td className="text-center text-green-600 font-bold">âœ“</td>
                                <td className="text-center text-green-600 font-bold">âœ“</td>
                            </tr>
                            <tr>
                                <td className="py-3.5 px-6 font-medium">Semua fitur</td>
                                <td className="text-center text-red-500 font-bold">âœ•</td>
                                <td className="text-center text-green-600 font-bold">âœ“</td>
                                <td className="text-center text-green-600 font-bold">âœ“</td>
                                <td className="text-center text-green-600 font-bold">âœ“</td>
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
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative border border-gray-100 overflow-y-auto max-h-[95vh]">
                        {/* Close button - only show if not in pending waiting state */}
                        {!pendingOrder && (
                            <button
                                onClick={() => setSelectedPlan(null)}
                                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition p-1 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}

                        {/* === VIEW 3: PAYMENT CONFIRMED SUCCESS === */}
                        {paymentConfirmed ? (
                            <div className="text-center py-6">
                                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
                                    <CheckCircle2 className="w-12 h-12" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">Pembayaran Dikonfirmasi! ðŸŽ‰</h3>
                                <p className="text-gray-500 text-sm mb-6">
                                    Paket <strong className="text-blue-600">{selectedPlan.name}</strong> telah aktif pada akun Anda.
                                    Nikmati akses Premium tanpa batas!
                                </p>
                                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-xs space-y-2 mb-6 text-left">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Order ID</span>
                                        <span className="font-mono font-bold text-gray-900">{pendingOrder?.order_id}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Paket</span>
                                        <span className="font-bold text-gray-900">{selectedPlan.name}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Total Dibayar</span>
                                        <span className="font-bold text-green-600">{formatCurrency(pendingOrder?.total_amount)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Status</span>
                                        <span className="font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-md">âœ… PAID</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setSelectedPlan(null); navigate('/'); }}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition shadow-md"
                                >
                                    Ke Dashboard Utama
                                </button>
                            </div>

                        /* === VIEW 2: WAITING FOR PAYMENT (PENDING) === */
                        ) : pendingOrder ? (
                            <div>
                                <div className="text-center mb-6">
                                    <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <AlertCircle className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">Menunggu Pembayaran</h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Selesaikan transfer, lalu akun Anda akan diaktifkan oleh admin (biasanya dalam 1-24 jam).
                                    </p>
                                </div>

                                {/* Order Summary */}
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 text-xs space-y-2">
                                    <div className="flex justify-between text-gray-700">
                                        <span className="font-medium">Order ID</span>
                                        <span className="font-mono font-bold text-gray-900 flex items-center gap-2">
                                            {pendingOrder.order_id}
                                            <button onClick={() => handleCopyText(pendingOrder.order_id, 'orderid')} className="text-amber-600 hover:text-amber-700">
                                                <Copy className="w-3 h-3" />
                                            </button>
                                            {copiedField === 'orderid' && <span className="text-green-600 text-[10px]">Tersalin!</span>}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-gray-700">
                                        <span className="font-medium">Paket</span>
                                        <span className="font-bold text-gray-900">{selectedPlan.name}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-700">
                                        <span className="font-medium">Metode</span>
                                        <span className="font-bold text-gray-900">{pendingOrder.payment_method}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-amber-200 pt-2 text-gray-900">
                                        <span className="font-bold">Total Transfer</span>
                                        <span className="font-extrabold text-amber-700 text-sm">{formatCurrency(pendingOrder.total_amount)}</span>
                                    </div>
                                </div>

                                {/* Payment destination info */}
                                <div className="space-y-3 mb-4">
                                    {(pendingOrder.payment_method === 'E-Wallet' || pendingOrder.payment_method === 'QRIS') && (
                                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs">
                                            <p className="font-bold text-emerald-900 mb-2 flex items-center"><Wallet className="w-3.5 h-3.5 mr-1" /> E-Wallet (DANA / GoPay)</p>
                                            <div className="flex justify-between items-center bg-white rounded-lg p-2 border border-emerald-100">
                                                <div>
                                                    <p className="text-[10px] text-gray-400">Nomor Tujuan â€” a.n. Muhammad Arbain</p>
                                                    <p className="font-mono font-extrabold text-emerald-900">082215322757</p>
                                                </div>
                                                <button onClick={() => handleCopyText('082215322757', 'ewallet2')} className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded-lg transition">
                                                    <Copy className="w-3 h-3" /> {copiedField === 'ewallet2' ? 'Tersalin!' : 'Salin'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {(pendingOrder.payment_method === 'Virtual Account' || pendingOrder.payment_method === 'QRIS') && (
                                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs">
                                            <p className="font-bold text-purple-900 mb-2 flex items-center"><Building2 className="w-3.5 h-3.5 mr-1" /> Transfer Bank BRI</p>
                                            <div className="flex justify-between items-center bg-white rounded-lg p-2 border border-purple-100">
                                                <div>
                                                    <p className="text-[10px] text-gray-400">No. Rekening â€” a.n. Muhammad Arbain</p>
                                                    <p className="font-mono font-extrabold text-purple-900">362901036404538</p>
                                                </div>
                                                <button onClick={() => handleCopyText('362901036404538', 'bri2')} className="flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 px-2 py-1 rounded-lg transition">
                                                    <Copy className="w-3 h-3" /> {copiedField === 'bri2' ? 'Tersalin!' : 'Salin'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Instructions */}
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-600 mb-4 space-y-1">
                                    <p className="font-bold text-gray-800 mb-1">ðŸ“‹ Langkah selanjutnya:</p>
                                    <p>1ï¸âƒ£ Transfer <strong>{formatCurrency(pendingOrder.total_amount)}</strong> ke rekening/ewallet di atas</p>
                                    <p>2ï¸âƒ£ Cantumkan Order ID: <strong className="font-mono">{pendingOrder.order_id}</strong> sebagai keterangan transfer (jika ada kolom keterangan)</p>
                                    <p>3ï¸âƒ£ Setelah transfer, tunggu konfirmasi admin (1â€“24 jam kerja)</p>
                                    <p>4ï¸âƒ£ Status akan otomatis berubah menjadi âœ… AKTIF</p>
                                </div>

                                {/* Countdown */}
                                {countdown !== null && countdown > 0 && (
                                    <div className="text-center text-xs text-gray-500 mb-4">
                                        <span className="bg-gray-100 rounded-lg px-3 py-1 font-mono font-bold text-gray-700">
                                            â± Order berlaku: {formatCountdown(countdown)}
                                        </span>
                                    </div>
                                )}
                                {countdown === 0 && (
                                    <div className="text-center text-xs text-red-600 font-bold mb-4 bg-red-50 rounded-lg px-3 py-2">
                                        âš ï¸ Order telah kedaluwarsa (24 jam). Buat order baru jika ingin melanjutkan.
                                    </div>
                                )}

                                {/* Status indicator - auto polling */}
                                <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-4">
                                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                                    Memeriksa status otomatis setiap 5 detik...
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setSelectedPlan(null)}
                                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition"
                                    >
                                        Tutup
                                    </button>
                                    <button
                                        onClick={handleCheckStatus}
                                        disabled={isCheckingStatus}
                                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                                    >
                                        {isCheckingStatus ? (
                                            <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Memeriksa...</>
                                        ) : (
                                            <><Shield className="w-3.5 h-3.5" /> Cek Status Pembayaran</>
                                        )}
                                    </button>
                                </div>
                            </div>

                        /* === VIEW 1: CHECKOUT FORM === */
                        ) : (
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
                                    <div className="grid grid-cols-3 gap-2.5 mb-4">
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
                                            Transfer Bank (BRI)
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
                                            E-Wallet (DANA/GoPay)
                                        </button>
                                    </div>

                                    {/* Account Details Box */}
                                    {paymentMethod === 'E-Wallet' && (
                                        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-xs">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold text-emerald-900 flex items-center">
                                                    <Wallet className="w-4 h-4 mr-1.5 text-emerald-600" />
                                                    E-Wallet (DANA / GoPay)
                                                </span>
                                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-md uppercase">a.n. Muhammad Arbain</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-emerald-200 shadow-sm mt-2">
                                                <div>
                                                    <div className="text-[10px] text-gray-500 font-medium">Nomor E-Wallet</div>
                                                    <div className="font-mono text-sm font-extrabold text-emerald-950">082215322757</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyText('082215322757', 'ewallet')}
                                                    className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition"
                                                >
                                                    <Copy className="w-3.5 h-3.5" />
                                                    {copiedField === 'ewallet' ? 'Tersalin!' : 'Salin'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {paymentMethod === 'Virtual Account' && (
                                        <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 text-xs">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold text-purple-900 flex items-center">
                                                    <Building2 className="w-4 h-4 mr-1.5 text-purple-600" />
                                                    Rekening Bank BRI
                                                </span>
                                                <span className="text-[10px] bg-purple-100 text-purple-800 font-extrabold px-2 py-0.5 rounded-md uppercase">a.n. Muhammad Arbain</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-purple-200 shadow-sm mt-2">
                                                <div>
                                                    <div className="text-[10px] text-gray-500 font-medium">Nomor Rekening BRI</div>
                                                    <div className="font-mono text-sm font-extrabold text-purple-950">362901036404538</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyText('362901036404538', 'bri')}
                                                    className="flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 px-3 py-1.5 rounded-lg transition"
                                                >
                                                    <Copy className="w-3.5 h-3.5" />
                                                    {copiedField === 'bri' ? 'Tersalin!' : 'Salin'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {paymentMethod === 'QRIS' && (
                                        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 text-xs">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold text-blue-900 flex items-center">
                                                    <QrCode className="w-4 h-4 mr-1.5 text-blue-600" />
                                                    QRIS / Transfer Langsung
                                                </span>
                                                <span className="text-[10px] bg-blue-100 text-blue-800 font-extrabold px-2 py-0.5 rounded-md uppercase">a.n. Muhammad Arbain</span>
                                            </div>
                                            <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-sm mt-2 space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <div className="text-[10px] text-gray-500 font-medium">E-Wallet (DANA/GoPay)</div>
                                                        <div className="font-mono text-sm font-extrabold text-blue-950">082215322757</div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyText('082215322757', 'qris')}
                                                        className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                        {copiedField === 'qris' ? 'Tersalin!' : 'Salin'}
                                                    </button>
                                                </div>
                                                <div className="flex justify-between items-center border-t border-blue-100 pt-2">
                                                    <div>
                                                        <div className="text-[10px] text-gray-500 font-medium">Rekening BRI</div>
                                                        <div className="font-mono text-sm font-extrabold text-blue-950">362901036404538</div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyText('362901036404538', 'qris-bri')}
                                                        className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                        {copiedField === 'qris-bri' ? 'Tersalin!' : 'Salin'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
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

                                {/* Warning Banner */}
                                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 mb-4 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
                                    <span>
                                        <strong>Penting:</strong> Klik &quot;Buat Pesanan&quot; untuk mendapatkan Order ID, lalu transfer ke rekening/ewallet di atas.
                                        Akses Premium akan aktif setelah admin memverifikasi pembayaran Anda (1â€“24 jam).
                                    </span>
                                </div>

                                {/* Pay Button */}
                                <button
                                    onClick={handlePayNow}
                                    disabled={isProcessingPayment}
                                    className="w-full py-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white transition shadow-lg shadow-blue-600/25 flex items-center justify-center active:scale-95 disabled:opacity-50"
                                >
                                    {isProcessingPayment ? (
                                        <span className="flex items-center">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                            Membuat Pesanan...
                                        </span>
                                    ) : (
                                        <span className="flex items-center">
                                            <Lock className="w-4 h-4 mr-2" />
                                            Buat Pesanan ({formatCurrency(promoResult ? promoResult.total_amount : selectedPlan.price)})
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

