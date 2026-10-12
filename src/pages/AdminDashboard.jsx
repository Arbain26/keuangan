import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchTransactions, createTransaction, deleteTransaction, updateTransaction, deleteAllTransactions } from '../lib/api';
import { LogOut, Trash2, Edit2, Plus, X, Search, FileText, LayoutDashboard, User, Lock, Save, Zap, ChevronRight, Menu, Clock, Filter, Terminal, Activity, DollarSign, Wallet, Download, Upload, Table, TrendingUp, TrendingDown, Calendar, CreditCard, Camera, Shield, Award, Sparkles, CheckCircle2, AlertCircle, ShoppingBag, Crown, MessageCircle, Phone, RefreshCw, Users, ShieldCheck, Check, Ban, Globe } from 'lucide-react';
import { formatCurrency, formatDate, normalizeCategory } from '../utils/format';
import { scanReceiptImage } from '../utils/receiptScanner';
import { 
    getUserSubscriptionStatus, 
    checkFeatureAccess, 
    adminGrantPremium,
    adminConfirmPayment,
    adminCancelPayment,
    adminRevokePremium,
    adminEditUserSubscription,
    adminDeleteUserSubscription,
    isSuperAdmin,
    SUPER_ADMIN_EMAIL,
    fetchPlans, 
    fetchUsageLimits,
    fetchAdminData,
    DEFAULT_PLANS,
    DEFAULT_LIMITS 
} from '../utils/subscriptionEngine';
import { AdminSubscriptionCenter } from '../components/AdminSubscriptionCenter';
import { Link } from 'react-router-dom';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import ExcelJS from 'exceljs';
import { motion, AnimatePresence } from 'framer-motion';
import { parseSafeDate } from '../utils/calculations';
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
    ArcElement,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement,
    ArcElement
);

const capitalizeText = (str) => {
    if (!str) return '';
    return str.split(' ').map(word => {
        if (!word) return '';
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
};

const formatNumberInput = (value) => {
    if (value === null || value === undefined) return '';
    // Strip everything except digits
    const clean = value.toString().replace(/\D/g, '');
    // Format with dot thousands separator
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const getLocalDateString = (dateObj) => {
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '';
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getCellValue = (cell) => {
    if (!cell) return '';
    const val = cell.value;
    if (val === null || val === undefined) return '';
    
    // If it is a formula
    if (typeof val === 'object' && val.formula !== undefined && val.result !== undefined) {
        return val.result;
    }
    
    // If it is a hyperlink
    if (typeof val === 'object' && val.text !== undefined && val.hyperlink !== undefined) {
        return val.text;
    }
    
    // If it is rich text
    if (typeof val === 'object' && Array.isArray(val.richText)) {
        return val.richText.map(t => t.text || '').join('');
    }
    
    return val;
};

const getUTCDateString = (dateObj) => {
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '';
    const year = dateObj.getUTCFullYear();
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseIndonesianDate = (str) => {
    if (!str) return null;
    const cleaned = str.toString().toLowerCase().trim()
        .replace(/[\s\-,]+/g, ' '); // normalize spaces, hyphens, commas
    
    const monthsMap = {
        jan: '01', januari: '01',
        feb: '02', februari: '02',
        mar: '03', maret: '03',
        apr: '04', april: '04',
        mei: '05',
        jun: '06', juni: '06',
        jul: '07', juli: '07',
        agt: '08', agust: '08', agustus: '08',
        sep: '09', september: '09',
        okt: '10', oktober: '10',
        nov: '11', november: '11',
        des: '12', desember: '12'
    };

    const words = cleaned.split(' ');
    if (words.length >= 3) {
        const dayPart = words[0];
        const monthPart = words[1];
        let yearPart = words[2];

        const dayNum = parseInt(dayPart, 10);
        const monthNum = monthsMap[monthPart];
        
        if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31 && monthNum && yearPart) {
            let year = yearPart;
            if (year.length === 2) {
                year = (Number(year) < 70 ? '20' : '19') + year;
            }
            if (year.length === 4) {
                const day = String(dayNum).padStart(2, '0');
                return `${year}-${monthNum}-${day}`;
            }
        }
    }
    return null;
};

const parseExcelDate = (val) => {
    if (val instanceof Date) {
        return getUTCDateString(val);
    }
    if (val === null || val === undefined) {
        return getLocalDateString(new Date()); // fallback to current local date
    }
    if (typeof val === 'string') {
        const cleaned = val.trim();
        
        // Coba parsing format teks Indonesia (contoh: "4 Agustus 2026" atau "04-Agt-26")
        const indoParsed = parseIndonesianDate(cleaned);
        if (indoParsed) return indoParsed;

        // Cocokkan YYYY-MM-DD atau YY-MM-DD atau YYYY/MM/DD
        const match = cleaned.match(/^(\d{2,4})[-/](\d{1,2})[-/](\d{1,2})/);
        if (match) {
            let year = match[1];
            if (year.length === 2) {
                year = (Number(year) < 70 ? '20' : '19') + year;
            }
            const month = match[2].padStart(2, '0');
            const day = match[3].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        
        // Cocokkan DD-MM-YYYY atau DD/MM/YYYY atau DD/MM/YY
        const matchDDMM = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
        if (matchDDMM) {
            const day = matchDDMM[1].padStart(2, '0');
            const month = matchDDMM[2].padStart(2, '0');
            let year = matchDDMM[3];
            if (year.length === 2) {
                year = (Number(year) < 70 ? '20' : '19') + year;
            }
            return `${year}-${month}-${day}`;
        }
        
        // Fallback untuk format lain
        const parsed = new Date(cleaned);
        if (!isNaN(parsed.getTime())) {
            return getLocalDateString(parsed);
        }
    }
    // Jika berupa angka serial Excel
    if (typeof val === 'number') {
        // Epoch dasar Excel adalah 1899-12-30 (mengakomodasi bug kabisat 1900 di Excel)
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const dateVal = new Date(excelEpoch.getTime() + val * 24 * 60 * 60 * 1000);
        return getUTCDateString(dateVal);
    }
    return getLocalDateString(new Date());
};

const CATEGORIES = [
    { id: 'makanan & minuman', label: 'Makanan & Minuman (Food & Dining)', icon: '🍔' },
    { id: 'transportasi', label: 'Transportasi (Transportation)', icon: '🚗' },
    { id: 'pendidikan', label: 'Pendidikan / Kuliah (Education)', icon: '🎓' },
    { id: 'belanja', label: 'Belanja (Shopping & Retail)', icon: '🛍️' },
    { id: 'hiburan', label: 'Hiburan/Rekreasi (Entertainment)', icon: '🎬' },
    { id: 'utilitas', label: 'Tagihan & Utilitas (Bills & Utilities)', icon: '⚡' },
    { id: 'kesehatan', label: 'Kesehatan (Health & Medical)', icon: '🏥' },
    { id: 'gaji', label: 'Gaji/Pendapatan (Salary & Income)', icon: '💵' },
    { id: 'investasi', label: 'Investasi (Investments)', icon: '📈' },
    { id: 'lainnya', label: 'Lainnya (Other / Custom)', icon: '📝' }
];

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | transactions | reports | profile
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [currency, setCurrency] = useState(() => {
        try {
            return localStorage.getItem('fintrack_currency') || 'IDR';
        } catch {
            return 'IDR';
        }
    });
    const exchangeRate = 16200; // 1 USD = 16,200 IDR

    const handleSetCurrency = (newCurr) => {
        if (newCurr === currency) return;
        setCurrency(newCurr);
        try {
            localStorage.setItem('fintrack_currency', newCurr);
        } catch {}

        // Seamlessly convert currently typed amount in form if present
        setFormData(prev => {
            if (!prev.amount) return prev;
            const cleanDigits = Number(prev.amount.toString().replace(/\D/g, '')) || 0;
            if (cleanDigits === 0) return prev;
            if (newCurr === 'USD') {
                const usd = Math.round(cleanDigits / exchangeRate);
                return { ...prev, amount: usd > 0 ? formatNumberInput(usd) : '1' };
            } else {
                const idr = Math.round(cleanDigits * exchangeRate);
                return { ...prev, amount: formatNumberInput(idr) };
            }
        });
    };

    const displayCurrency = (amount) => {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return currency === 'USD' ? '$0.00' : 'Rp0';
        }
        if (currency === 'USD') {
            const usdVal = Number(amount) / exchangeRate;
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(usdVal);
        }
        return formatCurrency(amount);
    };

    const displayDate = (dateString) => {
        if (!dateString) return '-';
        const parsed = parseSafeDate(dateString);
        if (!parsed || isNaN(parsed.getTime())) return formatDate(dateString);
        return parsed.toLocaleDateString(currency === 'USD' ? 'en-US' : 'id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const userTimezoneLabel = (() => {
        try {
            const offsetMin = -currentTime.getTimezoneOffset();
            const sign = offsetMin >= 0 ? '+' : '-';
            const hours = Math.floor(Math.abs(offsetMin) / 60);
            return `UTC${sign}${hours}`;
        } catch {
            return 'UTC';
        }
    })();

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
    const fileInputRef = useRef(null);
    const receiptInputRef = useRef(null);
    const [isScanningReceipt, setIsScanningReceipt] = useState(false);
    const [scanProgress, setScanProgress] = useState('');

    const [activePeriod, setActivePeriod] = useState('all'); // all | week | month | year

    // Profile Form State
    const [profileData, setProfileData] = useState({
        fullName: '',
        email: '',
        newPassword: ''
    });
    const [profileMessage, setProfileMessage] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState(null);
    const [isCustomCategory, setIsCustomCategory] = useState(false);

    // Subscription & Limit State
    const [userSub, setUserSub] = useState(null);
    const [usageLimits, setUsageLimits] = useState(DEFAULT_LIMITS);
    const [plans, setPlans] = useState(DEFAULT_PLANS);
    const [allSubscriptions, setAllSubscriptions] = useState([]);
    const [allOrders, setAllOrders] = useState([]);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [userStatusFilter, setUserStatusFilter] = useState('ALL'); // ALL | ACTIVE | FREE | EXPIRED
    const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
    const [grantForm, setGrantForm] = useState({
        targetUserId: '',
        targetUserEmail: '',
        planCode: 'PREMIUM_MONTHLY',
        note: ''
    });
    const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
    const [editUserForm, setEditUserForm] = useState({
        userId: '',
        userEmail: '',
        planCode: 'FREE',
        subscriptionStatus: 'FREE',
        subscriptionEnd: '',
        note: ''
    });
    const [dashboardUserSearch, setDashboardUserSearch] = useState('');
    const [limitModal, setLimitModal] = useState(null);
    const [orderFilter, setOrderFilter] = useState('ALL'); // ALL | PENDING | PAID | CANCELLED | EXPIRED
    const [isConfirmingOrder, setIsConfirmingOrder] = useState(null); // orderId being confirmed

    // Admin Utama status check
    const isAdminUtama = isSuperAdmin(user);

    const handleReceiptPhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsScanningReceipt(true);
        setScanProgress('Membaca & memproses foto nota...');
        try {
            const scannedData = await scanReceiptImage(file, (msg) => setScanProgress(msg));
            
            const finalDesc = scannedData.description && scannedData.description.trim() !== '' 
                ? scannedData.description.trim().toLowerCase() 
                : '-';

            if (scannedData.amount > 0) {
                const dataToSubmit = {
                    type: scannedData.type || 'pengeluaran',
                    amount: scannedData.amount,
                    date: scannedData.date || new Date().toISOString().split('T')[0],
                    category: normalizeCategory(scannedData.category || 'lainnya', scannedData.type || 'pengeluaran'),
                    description: finalDesc
                };
                await createTransaction(dataToSubmit);
                const data = await fetchTransactions();
                setTransactions(Array.isArray(data) ? data : []);
                setFormData({
                    type: 'pengeluaran',
                    category: '',
                    amount: '',
                    description: '',
                    date: new Date().toISOString().split('T')[0]
                });
                setIsCustomCategory(false);
                showToast(`Transaksi foto struk (Rp ${formatNumberInput(scannedData.amount)}) berhasil disimpan otomatis!`);
            } else {
                setFormData({
                    type: scannedData.type || 'pengeluaran',
                    amount: scannedData.amount ? formatNumberInput(scannedData.amount) : '',
                    date: scannedData.date || new Date().toISOString().split('T')[0],
                    category: scannedData.category || '',
                    description: finalDesc
                });
                setIsCustomCategory(false);
                showToast('Foto nota dibaca. Silakan isi nominal & simpan.', 'error');
            }
        } catch (error) {
            console.error('Error scanning receipt:', error);
            showToast('Gagal membaca foto nota. Silakan input manual.', 'error');
        } finally {
            setIsScanningReceipt(false);
            e.target.value = null;
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    // Auto-dismiss toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [transData, userData, planList, limits] = await Promise.all([
                fetchTransactions(),
                supabase.auth.getUser(),
                fetchPlans(),
                fetchUsageLimits()
            ]);

            setTransactions(Array.isArray(transData) ? transData : []);
            setPlans(planList);
            setUsageLimits(limits);

            const activeUser = userData?.data?.user || null;
            if (activeUser) {
                setUser(activeUser);
                setProfileData(prev => ({
                    ...prev,
                    email: activeUser.email,
                    fullName: activeUser.user_metadata?.full_name || 'Muhammad Arbain'
                }));

                const subStatus = await getUserSubscriptionStatus(activeUser.id, activeUser.email);
                setUserSub(subStatus);
            }

            // Fetch All Subscriptions & Orders EXCLUSIVELY for Admin Utama (arbain@gmail.com)
            const isUserSuperAdmin = activeUser && isSuperAdmin(activeUser);
            if (supabase && isUserSuperAdmin) {
                const adminData = await fetchAdminData();
                setAllSubscriptions(adminData.subscriptions || []);
                setAllOrders(adminData.orders || []);
            } else {
                setAllSubscriptions([]);
                setAllOrders([]);
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.replace('/login');
    };

    // Admin: Confirm a PENDING order as PAID and activate subscription
    const handleConfirmPayment = async (orderId) => {
        if (!orderId) return;
        if (!window.confirm(`Konfirmasi pembayaran untuk Order: ${orderId}?\nIni akan mengaktifkan Premium user secara langsung.`)) return;
        setIsConfirmingOrder(orderId);
        try {
            await adminConfirmPayment(orderId);
            showToast(`✅ Order ${orderId} berhasil di-APPROVE sebagai PAID. Langganan user aktif!`);
            // Refresh orders & subscriptions list for Super Admin
            if (supabase && isSuperAdmin(user)) {
                const adminData = await fetchAdminData();
                setAllSubscriptions(adminData.subscriptions || []);
                setAllOrders(adminData.orders || []);
            }
        } catch (err) {
            showToast(err.message || 'Gagal mengkonfirmasi pembayaran.', 'error');
        } finally {
            setIsConfirmingOrder(null);
        }
    };

    // Admin: Reject/cancel a PENDING order
    const handleCancelOrder = async (orderId) => {
        if (!orderId) return;
        const reason = window.prompt(`Alasan pembatalan order ${orderId}? (opsional)`) ?? '';
        if (reason === null) return; // User pressed Cancel
        setIsConfirmingOrder(orderId);
        try {
            await adminCancelPayment(orderId, reason);
            showToast(`Order ${orderId} dibatalkan.`, 'error');
            if (supabase && isSuperAdmin(user)) {
                const adminData = await fetchAdminData();
                setAllOrders(adminData.orders || []);
            }
        } catch (err) {
            showToast(err.message || 'Gagal membatalkan order.', 'error');
        } finally {
            setIsConfirmingOrder(null);
        }
    };

    // Admin Utama: Revoke user subscription (revert to FREE)
    const handleRevokePremium = async (userId, userEmail) => {
        if (!userId) return;
        const targetDisplay = userEmail || userId;
        if (!window.confirm(`Yakin ingin mencabut status Premium untuk: ${targetDisplay}?\nPengguna ini akan dikembalikan ke paket FREE.`)) return;
        setIsSubmitting(true);
        try {
            await adminRevokePremium(userId);
            showToast(`Akses Premium untuk ${targetDisplay} telah dicabut.`);
            if (supabase && isSuperAdmin(user)) {
                const adminData = await fetchAdminData();
                setAllSubscriptions(adminData.subscriptions || []);
            }
        } catch (err) {
            showToast(err.message || 'Gagal mencabut status Premium.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Admin Utama: Open Edit User Modal
    const handleOpenEditUserModal = (targetUser) => {
        if (targetUser) {
            setEditUserForm({
                userId: targetUser.user_id || '',
                userEmail: targetUser.user_email || '',
                planCode: targetUser.plan_code || 'FREE',
                subscriptionStatus: targetUser.subscription_status || 'FREE',
                subscriptionEnd: targetUser.subscription_end ? targetUser.subscription_end.split('T')[0] : '',
                note: targetUser.note || ''
            });
        } else {
            setEditUserForm({
                userId: '',
                userEmail: '',
                planCode: 'PREMIUM_MONTHLY',
                subscriptionStatus: 'ACTIVE',
                subscriptionEnd: '',
                note: ''
            });
        }
        setIsEditUserModalOpen(true);
    };

    // Admin Utama: Save edited user data (email, plan, status, end date, note)
    const handleSaveEditUser = async (e) => {
        e.preventDefault();
        if (!editUserForm.userId.trim()) {
            showToast('User ID target tidak valid.', 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            await adminEditUserSubscription({
                userId: editUserForm.userId.trim(),
                userEmail: editUserForm.userEmail.trim(),
                planCode: editUserForm.planCode,
                subscriptionStatus: editUserForm.subscriptionStatus,
                subscriptionEnd: editUserForm.planCode === 'PREMIUM_LIFETIME' ? null : (editUserForm.subscriptionEnd ? new Date(editUserForm.subscriptionEnd).toISOString() : null),
                note: editUserForm.note
            });
            showToast(`Data pengguna ${editUserForm.userEmail || editUserForm.userId} berhasil disimpan!`);
            setIsEditUserModalOpen(false);
            loadInitialData();
        } catch (err) {
            showToast(err.message || 'Gagal menyimpan perubahan pengguna.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Admin Utama: Delete user from database completely
    const handleDeleteUser = async (userId, userEmail) => {
        if (!userId) return;
        if (isSuperAdmin(userEmail)) {
            showToast('Akun Admin Utama (arbain@gmail.com) tidak dapat dihapus!', 'error');
            return;
        }
        const targetDisplay = userEmail || userId;
        if (!window.confirm(`⚠️ PERINGATAN HAPUS PENGGUNA:\nApakah Anda yakin ingin MENGHAPUS pengguna:\n"${targetDisplay}" secara permanen?\n\nSeluruh data status langganan dan pesanan order pengguna ini akan dihapus dari sistem.`)) {
            return;
        }
        setIsSubmitting(true);
        try {
            await adminDeleteUserSubscription(userId, userEmail);
            showToast(`Pengguna ${targetDisplay} berhasil dihapus dari sistem.`);
            loadInitialData();
        } catch (err) {
            showToast(err.message || 'Gagal menghapus pengguna.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.amount || !formData.date || !formData.category) return;
        
        const rawDigits = Number(formData.amount.toString().replace(/\D/g, '')) || 0;
        const amountCleaned = currency === 'USD' ? Math.round(rawDigits * exchangeRate) : rawDigits;
        if (!editingId) {
            const access = await checkFeatureAccess(user, 'transaction', transactions.length);
            if (!access.allowed) {
                setLimitModal({
                    title: 'Batas Transaksi Bulanan Terlampaui',
                    message: `Pengguna FREE memiliki batas ${access.limit} transaksi per bulan. Anda telah mencatatkan ${access.usage} transaksi bulan ini. Upgrade ke Paket Premium untuk transaksi tanpa batas!`
                });
                return;
            }
        }

        setIsSubmitting(true);

        const dataToSubmit = {
            ...formData,
            amount: amountCleaned,
            category: normalizeCategory(formData.category.trim(), formData.type),
            description: formData.description ? formData.description.trim().toLowerCase() : ''
        };

        try {
            if (editingId) {
                await updateTransaction(editingId, dataToSubmit);
                showToast('Transaksi berhasil diperbarui!');
            } else {
                await createTransaction(dataToSubmit);
                showToast('Transaksi berhasil ditambahkan!');
            }

            setFormData({
                type: 'pengeluaran',
                category: '',
                amount: '',
                description: '',
                date: new Date().toISOString().split('T')[0]
            });
            setEditingId(null);
            setIsCustomCategory(false);
            const data = await fetchTransactions();
            setTransactions(Array.isArray(data) ? data : []);
            if (activeTab === 'dashboard') {
                setActiveTab('transactions');
            }
        } catch (error) {
            console.error('Error submitting transaction:', error);
            showToast('Gagal menyimpan transaksi.', 'error');
        } finally {
            setIsSubmitting(false);
        }
        window.scrollTo(0, 0);
    };

    const handleEdit = (transaction) => {
        if (!transaction) return;
        setActiveTab('transactions');
        setEditingId(transaction.id);
        setFormData({
            type: transaction.type,
            category: transaction.category || '',
            amount: formatNumberInput(currency === 'USD' ? Math.round(Number(transaction.amount) / exchangeRate) : transaction.amount) || '',
            description: transaction.description || '',
            date: transaction.date || new Date().toISOString().split('T')[0]
        });
        const isStd = CATEGORIES.some(cat => cat.id === (transaction.category || '').toLowerCase());
        setIsCustomCategory(!isStd && transaction.category !== '');
        window.scrollTo(0, 0);
    };

    const handleDelete = async (id) => {
        if (confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
            try {
                await deleteTransaction(id);
                showToast('Transaksi berhasil dihapus!');
                const data = await fetchTransactions();
                setTransactions(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Error deleting transaction:', error);
                showToast('Gagal menghapus transaksi.', 'error');
            }
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
        setIsCustomCategory(false);
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setProfileMessage('');
        setIsSubmitting(true);

        const updates = {
            data: { full_name: profileData.fullName }
        };

        if (profileData.newPassword) {
            updates.password = profileData.newPassword;
        }

        try {
            const { data, error } = await supabase.auth.updateUser(updates);

            if (error) {
                setProfileMessage('Error: ' + error.message);
                showToast('Gagal memperbarui profil: ' + error.message, 'error');
            } else {
                setProfileMessage('Profil berhasil diperbarui.');
                showToast('Profil berhasil diperbarui!');
                setProfileData(prev => ({ ...prev, newPassword: '' }));
                if (data?.user) {
                    setUser(data.user);
                }
            }
        } catch (err) {
            console.error(err);
            showToast('Terjadi kesalahan jaringan.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const exportToExcel = async () => {
        try {
            const isUsd = currency === 'USD';
            const numFmt = isUsd ? '$#,##0.00' : '#,##0';
            const incomeLabel = isUsd ? 'Income' : 'Pemasukan';
            const expenseLabel = isUsd ? 'Expense' : 'Pengeluaran';

            // ── 1. Aggregate category spending for the chart ──
            const categoryTotals = {};
            filteredTransactions
                .filter(t => t.type === 'pengeluaran')
                .forEach(t => {
                    const cat = t.category || 'Lainnya';
                    categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(t.amount);
                });
            const sortedCategories = Object.entries(categoryTotals)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8);

            // ── 2. Render chart on hidden off-screen canvas ──
            let imageBase64 = null;
            if (sortedCategories.length > 0) {
                const canvas = document.createElement('canvas');
                canvas.width = 640;
                canvas.height = 360;
                canvas.style.position = 'absolute';
                canvas.style.left = '-9999px';
                document.body.appendChild(canvas);

                const chartColors = [
                    '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd',
                    '#f59e0b', '#ec4899', '#8b5cf6', '#10b981'
                ];

                const chartInstance = new ChartJS(canvas.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: sortedCategories.map(([cat]) =>
                            cat.charAt(0).toUpperCase() + cat.slice(1)
                        ),
                        datasets: [{
                            label: isUsd ? 'Expenses (USD)' : 'Pengeluaran (Rp)',
                            data: sortedCategories.map(([, amt]) => isUsd ? +(amt / exchangeRate).toFixed(2) : amt),
                            backgroundColor: chartColors.slice(0, sortedCategories.length),
                            borderRadius: 6,
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: false,
                        animation: false,
                        plugins: {
                            legend: { display: false },
                            title: {
                                display: true,
                                text: isUsd ? 'Top Expenses by Category' : 'Pengeluaran Terbanyak per Kategori',
                                font: { size: 14, weight: 'bold' },
                                padding: { bottom: 12 }
                            }
                        },
                        scales: {
                            x: {
                                ticks: {
                                    callback: (v) => isUsd ? '$' + Number(v).toLocaleString('en-US') : 'Rp ' + Number(v).toLocaleString('id-ID')
                                },
                                grid: { color: '#f1f5f9' }
                            },
                            y: { grid: { display: false } }
                        }
                    }
                });

                await new Promise(r => setTimeout(r, 250));
                imageBase64 = canvas.toDataURL('image/png').split(',')[1];
                chartInstance.destroy();
                document.body.removeChild(canvas);
            }

            // ── 3. Build Multi-Sheet Workbook with Formulas ──
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'FinTrack Financial Intelligence';
            workbook.lastModifiedBy = user?.email || 'FinTrack Admin';
            workbook.created = new Date();
            workbook.modified = new Date();

            const thinBorder = {
                top:    { style: 'thin', color: { argb: 'FFCBD5E1' } },
                bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                left:   { style: 'thin', color: { argb: 'FFCBD5E1' } },
                right:  { style: 'thin', color: { argb: 'FFCBD5E1' } },
            };

            const doubleBottomBorder = {
                top:    { style: 'thin', color: { argb: 'FF475569' } },
                bottom: { style: 'double', color: { argb: 'FF0F172A' } },
                left:   { style: 'thin', color: { argb: 'FFCBD5E1' } },
                right:  { style: 'thin', color: { argb: 'FFCBD5E1' } },
            };

            // ══════════════════════════════════════════════════════
            // SHEET 1: EXECUTIVE FINANCIAL SUMMARY & CHARTS
            // ══════════════════════════════════════════════════════
            const summarySheet = workbook.addWorksheet(isUsd ? 'Executive Summary' : 'Ringkasan Eksekutif');
            summarySheet.views = [{ showGridLines: true }];

            // Title Banner
            summarySheet.mergeCells('A1:H1');
            const titleCell = summarySheet.getCell('A1');
            titleCell.value = 'FINTRACK FINANCIAL INTELLIGENCE REPORT';
            titleCell.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
            titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            summarySheet.getRow(1).height = 36;

            // Subtitle metadata
            summarySheet.mergeCells('A2:H2');
            const subTitleCell = summarySheet.getCell('A2');
            subTitleCell.value = `Export Date: ${new Date().toLocaleDateString('en-GB')} | Currency: ${currency} | User: ${user?.email || 'FinTrack User'}`;
            subTitleCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
            subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            summarySheet.getRow(2).height = 20;

            // KPI Cards Section Header
            summarySheet.mergeCells('A4:H4');
            const kpiHeader = summarySheet.getCell('A4');
            kpiHeader.value = isUsd ? 'KEY FINANCIAL METRICS (REAL-TIME EXCEL FORMULAS)' : 'METRIK KEUANGAN UTAMA (RUMUS EXCEL REAL-TIME)';
            kpiHeader.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
            summarySheet.getRow(4).height = 20;

            const totalRowsData = filteredTransactions.length;
            const dataEndRow = Math.max(totalRowsData + 1, 2);
            const dataSheetRef = `'Data Transaksi'`;

            // Calculate precomputed values for fallback results
            const calcTotalIncome = filteredTransactions
                .filter(t => t.type === 'pemasukan')
                .reduce((s, t) => s + (isUsd ? +(Number(t.amount) / exchangeRate) : Number(t.amount)), 0);

            const calcTotalExpense = filteredTransactions
                .filter(t => t.type === 'pengeluaran')
                .reduce((s, t) => s + (isUsd ? +(Number(t.amount) / exchangeRate) : Number(t.amount)), 0);

            const calcNet = calcTotalIncome - calcTotalExpense;

            // KPI Card 1: Total Revenue (A5:B6)
            summarySheet.mergeCells('A5:B5');
            summarySheet.getCell('A5').value = isUsd ? 'TOTAL REVENUE (INCOME)' : 'TOTAL PEMASUKAN';
            summarySheet.getCell('A5').font = { size: 9, bold: true, color: { argb: 'FF065F46' } };
            summarySheet.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
            summarySheet.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };

            summarySheet.mergeCells('A6:B6');
            const revValCell = summarySheet.getCell('A6');
            revValCell.value = {
                formula: `SUMIF(${dataSheetRef}!C$2:C$${dataEndRow}, "${incomeLabel}", ${dataSheetRef}!E$2:E$${dataEndRow})`,
                result: calcTotalIncome
            };
            revValCell.font = { size: 14, bold: true, color: { argb: 'FF047857' } };
            revValCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
            revValCell.alignment = { horizontal: 'center', vertical: 'middle' };
            revValCell.numFmt = numFmt;

            // KPI Card 2: Total Expenses (C5:D6)
            summarySheet.mergeCells('C5:D5');
            summarySheet.getCell('C5').value = isUsd ? 'TOTAL EXPENSES' : 'TOTAL PENGELUARAN';
            summarySheet.getCell('C5').font = { size: 9, bold: true, color: { argb: 'FF9F1239' } };
            summarySheet.getCell('C5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } };
            summarySheet.getCell('C5').alignment = { horizontal: 'center', vertical: 'middle' };

            summarySheet.mergeCells('C6:D6');
            const expValCell = summarySheet.getCell('C6');
            expValCell.value = {
                formula: `SUMIF(${dataSheetRef}!C$2:C$${dataEndRow}, "${expenseLabel}", ${dataSheetRef}!E$2:E$${dataEndRow})`,
                result: calcTotalExpense
            };
            expValCell.font = { size: 14, bold: true, color: { argb: 'FFBE123C' } };
            expValCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } };
            expValCell.alignment = { horizontal: 'center', vertical: 'middle' };
            expValCell.numFmt = numFmt;

            // KPI Card 3: Net Cashflow (E5:F6)
            summarySheet.mergeCells('E5:F5');
            summarySheet.getCell('E5').value = isUsd ? 'NET CASHFLOW (BALANCE)' : 'SALDO BERSIH (NET)';
            summarySheet.getCell('E5').font = { size: 9, bold: true, color: { argb: 'FF1E40AF' } };
            summarySheet.getCell('E5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
            summarySheet.getCell('E5').alignment = { horizontal: 'center', vertical: 'middle' };

            summarySheet.mergeCells('E6:F6');
            const netValCell = summarySheet.getCell('E6');
            netValCell.value = {
                formula: 'A6-C6',
                result: calcNet
            };
            netValCell.font = { size: 14, bold: true, color: { argb: 'FF1D4ED8' } };
            netValCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
            netValCell.alignment = { horizontal: 'center', vertical: 'middle' };
            netValCell.numFmt = numFmt;

            // KPI Card 4: Count of Transactions (G5:H6)
            summarySheet.mergeCells('G5:H5');
            summarySheet.getCell('G5').value = isUsd ? 'TRANSACTIONS COUNT' : 'JUMLAH TRANSAKSI';
            summarySheet.getCell('G5').font = { size: 9, bold: true, color: { argb: 'FF78350F' } };
            summarySheet.getCell('G5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
            summarySheet.getCell('G5').alignment = { horizontal: 'center', vertical: 'middle' };

            summarySheet.mergeCells('G6:H6');
            const countValCell = summarySheet.getCell('G6');
            countValCell.value = {
                formula: `COUNTA(${dataSheetRef}!B$2:B$${dataEndRow})`,
                result: totalRowsData
            };
            countValCell.font = { size: 14, bold: true, color: { argb: 'FFB45309' } };
            countValCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
            countValCell.alignment = { horizontal: 'center', vertical: 'middle' };
            countValCell.numFmt = '#,##0';

            ['A5','B5','A6','B6','C5','D5','C6','D6','E5','F5','E6','F6','G5','H5','G6','H6'].forEach(addr => {
                summarySheet.getCell(addr).border = thinBorder;
            });

            // Section 2: Category Breakdown Table
            const catStartRow = 9;
            summarySheet.mergeCells(`A${catStartRow}:D${catStartRow}`);
            const catHeaderCell = summarySheet.getCell(`A${catStartRow}`);
            catHeaderCell.value = isUsd ? 'EXPENSE BREAKDOWN BY CATEGORY' : 'RINCIAN PENGELUARAN PER KATEGORI';
            catHeaderCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
            summarySheet.getRow(catStartRow).height = 22;

            // Category Table Headers
            const catHeaderRow = catStartRow + 1;
            summarySheet.getRow(catHeaderRow).values = [
                '#',
                isUsd ? 'Category' : 'Kategori Pos',
                isUsd ? 'Total Amount' : 'Total Pengeluaran',
                isUsd ? '% Share' : '% dari Total'
            ];
            summarySheet.getRow(catHeaderRow).height = 20;

            ['A','B','C','D'].forEach(col => {
                const c = summarySheet.getCell(`${col}${catHeaderRow}`);
                c.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
                c.alignment = { horizontal: (col === 'C' || col === 'D') ? 'right' : 'center', vertical: 'middle' };
                c.border = thinBorder;
            });

            let currentCatRow = catHeaderRow + 1;
            sortedCategories.forEach(([cat, rawAmt], idx) => {
                const amtVal = isUsd ? +(rawAmt / exchangeRate).toFixed(2) : rawAmt;
                const r = summarySheet.getRow(currentCatRow);
                r.height = 18;

                // Index
                const cellIdx = summarySheet.getCell(`A${currentCatRow}`);
                cellIdx.value = idx + 1;
                cellIdx.alignment = { horizontal: 'center' };

                // Category Name
                const cellCat = summarySheet.getCell(`B${currentCatRow}`);
                cellCat.value = cat.charAt(0).toUpperCase() + cat.slice(1);
                cellCat.font = { bold: true };

                // Amount Formula: SUMIFS
                const cellAmt = summarySheet.getCell(`C${currentCatRow}`);
                cellAmt.value = {
                    formula: `SUMIFS(${dataSheetRef}!E$2:E$${dataEndRow}, ${dataSheetRef}!C$2:C$${dataEndRow}, "${expenseLabel}", ${dataSheetRef}!D$2:D$${dataEndRow}, "${cat}")`,
                    result: amtVal
                };
                cellAmt.numFmt = numFmt;
                cellAmt.alignment = { horizontal: 'right' };

                // Percent Share Formula
                const cellPct = summarySheet.getCell(`D${currentCatRow}`);
                cellPct.value = {
                    formula: `C${currentCatRow}/C$6`,
                    result: calcTotalExpense > 0 ? (amtVal / calcTotalExpense) : 0
                };
                cellPct.numFmt = '0.0%';
                cellPct.alignment = { horizontal: 'right' };

                ['A','B','C','D'].forEach(col => {
                    const cell = summarySheet.getCell(`${col}${currentCatRow}`);
                    cell.border = thinBorder;
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC' } };
                });

                currentCatRow++;
            });

            // Category Total Row
            const catTotalRow = currentCatRow;
            summarySheet.getCell(`A${catTotalRow}`).value = '';
            summarySheet.getCell(`B${catTotalRow}`).value = isUsd ? 'TOTAL EXPENSES' : 'TOTAL PENGELUARAN';
            summarySheet.getCell(`B${catTotalRow}`).font = { bold: true, size: 9 };

            const catTotalAmtCell = summarySheet.getCell(`C${catTotalRow}`);
            catTotalAmtCell.value = {
                formula: `SUM(C${catHeaderRow + 1}:C${catTotalRow - 1})`,
                result: calcTotalExpense
            };
            catTotalAmtCell.font = { bold: true };
            catTotalAmtCell.numFmt = numFmt;
            catTotalAmtCell.alignment = { horizontal: 'right' };

            const catTotalPctCell = summarySheet.getCell(`D${catTotalRow}`);
            catTotalPctCell.value = {
                formula: `SUM(D${catHeaderRow + 1}:D${catTotalRow - 1})`,
                result: 1.0
            };
            catTotalPctCell.font = { bold: true };
            catTotalPctCell.numFmt = '0.0%';
            catTotalPctCell.alignment = { horizontal: 'right' };

            ['A','B','C','D'].forEach(col => {
                const cell = summarySheet.getCell(`${col}${catTotalRow}`);
                cell.border = doubleBottomBorder;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            });

            // Set column widths for Summary Sheet
            summarySheet.getColumn('A').width = 6;
            summarySheet.getColumn('B').width = 24;
            summarySheet.getColumn('C').width = 20;
            summarySheet.getColumn('D').width = 16;
            summarySheet.getColumn('E').width = 16;
            summarySheet.getColumn('F').width = 16;
            summarySheet.getColumn('G').width = 16;
            summarySheet.getColumn('H').width = 16;

            // Embed Chart image to the right of Category Table (Column F)
            if (imageBase64) {
                const imageId = workbook.addImage({
                    base64: imageBase64,
                    extension: 'png',
                });
                summarySheet.addImage(imageId, {
                    tl: { col: 4.8, row: 8 },
                    br: { col: 8.5, row: Math.max(currentCatRow + 5, 24) },
                    editAs: 'oneCell',
                });
            }

            // ══════════════════════════════════════════════════════
            // SHEET 2: RAW TRANSACTIONS DATA (DATA TRANSAKSI)
            // ══════════════════════════════════════════════════════
            const dataSheet = workbook.addWorksheet(isUsd ? 'Transactions Data' : 'Data Transaksi');
            dataSheet.views = [{ showGridLines: true }];

            // Header columns
            dataSheet.columns = [
                { header: isUsd ? 'No' : 'No',                      key: 'no',          width: 8 },
                { header: isUsd ? 'Date' : 'Tanggal',               key: 'tanggal',     width: 18 },
                { header: isUsd ? 'Type' : 'Tipe',                  key: 'tipe',        width: 16 },
                { header: isUsd ? 'Category' : 'Kategori',          key: 'kategori',    width: 24 },
                { header: isUsd ? 'Amount' : 'Nominal',             key: 'nominal',     width: 20 },
                { header: isUsd ? 'Description' : 'Keterangan',     key: 'keterangan',  width: 36 },
            ];

            // Style Table Header Row
            const dataHeaderRow = dataSheet.getRow(1);
            dataHeaderRow.height = 24;
            ['A','B','C','D','E','F'].forEach((col, i) => {
                const cell = dataSheet.getCell(`${col}1`);
                cell.font  = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
                cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
                cell.alignment = { horizontal: i === 4 ? 'right' : (i === 0 || i === 1 || i === 2 ? 'center' : 'left'), vertical: 'middle' };
                cell.border = thinBorder;
            });

            // Populate Data Rows
            let grandTotalRaw = 0;
            filteredTransactions.forEach((t, idx) => {
                const amtNumber = isUsd ? +(Number(t.amount) / exchangeRate).toFixed(2) : Number(t.amount);
                grandTotalRaw += amtNumber;

                const rowData = {
                    no:         idx + 1,
                    tanggal:    displayDate(t.date),
                    tipe:       t.type === 'pemasukan' ? incomeLabel : expenseLabel,
                    kategori:   t.category ? (t.category.charAt(0).toUpperCase() + t.category.slice(1)) : 'Lainnya',
                    nominal:    amtNumber,
                    keterangan: (t.description && t.description !== '-') ? t.description : '-',
                };
                const row = dataSheet.addRow(rowData);
                row.height = 19;
                const fillArgb = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';

                row.eachCell({ includeEmpty: true }, (cell, colNum) => {
                    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
                    cell.border = thinBorder;
                    cell.font   = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
                    if (colNum === 1 || colNum === 2 || colNum === 3) {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    } else if (colNum === 5) {
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                        cell.numFmt = numFmt;
                    } else {
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    }
                });
            });

            // Table Footer: Grand Total Row with SUM Formula
            const totalRowIndex = filteredTransactions.length + 2;
            const footerRow = dataSheet.getRow(totalRowIndex);
            footerRow.height = 22;

            dataSheet.mergeCells(`A${totalRowIndex}:D${totalRowIndex}`);
            const grandTotalLabel = dataSheet.getCell(`A${totalRowIndex}`);
            grandTotalLabel.value = isUsd ? 'GRAND TOTAL (KESELURUHAN)' : 'TOTAL KESELURUHAN (GRAND TOTAL)';
            grandTotalLabel.font = { bold: true, name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
            grandTotalLabel.alignment = { horizontal: 'center', vertical: 'middle' };

            const grandTotalCell = dataSheet.getCell(`E${totalRowIndex}`);
            grandTotalCell.value = {
                formula: `SUM(E2:E${totalRowIndex - 1})`,
                result: grandTotalRaw
            };
            grandTotalCell.font = { bold: true, name: 'Arial', size: 11, color: { argb: 'FF1D4ED8' } };
            grandTotalCell.numFmt = numFmt;
            grandTotalCell.alignment = { horizontal: 'right', vertical: 'middle' };

            const emptyCellF = dataSheet.getCell(`F${totalRowIndex}`);
            emptyCellF.value = '';

            ['A','B','C','D','E','F'].forEach(col => {
                const c = dataSheet.getCell(`${col}${totalRowIndex}`);
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
                c.border = doubleBottomBorder;
            });

            // ── 5. Write and download ──
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `FinTrack_Report_${currency}_${new Date().toISOString().split('T')[0]}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Laporan Excel profesional & ber-rumus berhasil diunduh!');

        } catch (error) {
            console.error('Error exporting to excel:', error);
            showToast('Gagal mengekspor laporan excel.', 'error');
        }
    };

    const handleUploadExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setIsSubmitting(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);

            // Cerdas mencari worksheet transaksi (bisa Data Transaksi / Transactions Data atau sheet 0)
            let worksheet = workbook.getWorksheet('Data Transaksi') || 
                            workbook.getWorksheet('Transactions Data') || 
                            workbook.worksheets[0];
            
            const transactionsToImport = [];
            const seenSignatures = new Set(
                transactions.map(t => {
                    const tDate = t.date ? t.date.split('T')[0] : '';
                    const tType = (t.type || '').toLowerCase();
                    const tCategory = (t.category || '').trim().toLowerCase();
                    const tAmount = Number(t.amount) || 0;
                    const tDesc = (t.description || '').trim().toLowerCase();
                    return `${tDate}_${tType}_${tCategory}_${tAmount}_${tDesc}`;
                })
            );
            let skippedCount = 0;

            let colIndices = {
                date: 2,
                type: 3,
                category: 4,
                amount: 5,
                description: 6
            };
            let headerFound = false;

            worksheet.eachRow((row, rowNumber) => {
                if (!headerFound) {
                    let hasHeaderMarker = false;
                    row.eachCell((cell, colNumber) => {
                        const headerText = (getCellValue(cell) || '').toString().toLowerCase().trim();
                        if (headerText.includes('tanggal') || headerText.includes('date')) {
                            colIndices.date = colNumber;
                            hasHeaderMarker = true;
                        } else if (headerText.includes('tipe') || headerText.includes('type')) {
                            colIndices.type = colNumber;
                        } else if (headerText.includes('kategori') || headerText.includes('category')) {
                            colIndices.category = colNumber;
                        } else if (headerText.includes('nominal') || headerText.includes('jumlah') || headerText.includes('amount')) {
                            colIndices.amount = colNumber;
                        } else if (headerText.includes('keterangan') || headerText.includes('deskripsi') || headerText.includes('description') || headerText.includes('catatan') || headerText.includes('note')) {
                            colIndices.description = colNumber;
                        }
                    });
                    if (hasHeaderMarker) {
                        headerFound = true;
                    }
                    return;
                }
                
                const typeVal = getCellValue(row.getCell(colIndices.type));
                const typeStr = (typeVal || '').toString().toLowerCase();

                // Abaikan baris total / footer
                const descVal = (getCellValue(row.getCell(colIndices.description)) || '').toString().toLowerCase();
                const firstColVal = (getCellValue(row.getCell(1)) || '').toString().toLowerCase();
                if (firstColVal.includes('total') || descVal.includes('total')) {
                    return;
                }

                const dateVal = getCellValue(row.getCell(colIndices.date));
                const dateStr = parseExcelDate(dateVal);

                const type = (typeStr.includes('pemasukan') || typeStr.includes('income')) ? 'pemasukan' : 'pengeluaran';
                
                const categoryVal = getCellValue(row.getCell(colIndices.category));
                const category = normalizeCategory(categoryVal, type);
                
                const amountVal = getCellValue(row.getCell(colIndices.amount));
                let amount = 0;
                if (typeof amountVal === 'number') {
                    amount = amountVal;
                } else if (amountVal) {
                    const cleaned = amountVal.toString().replace(/\D/g, '');
                    amount = Number(cleaned) || 0;
                }

                if (currency === 'USD' && amount < 1000 && amount > 0) {
                    // Jika diimpor dari USD amount, konversi ke basis IDR jika nilai kecil
                    amount = Math.round(amount * exchangeRate);
                }

                const description = getCellValue(row.getCell(colIndices.description)) || '-';

                if (amount > 0 && dateStr) {
                    const signature = `${dateStr}_${type}_${category}_${amount}_${description.trim().toLowerCase()}`;
                    if (seenSignatures.has(signature)) {
                        skippedCount++;
                    } else {
                        seenSignatures.add(signature);
                        transactionsToImport.push({
                            date: dateStr,
                            type,
                            category,
                            amount,
                            description
                        });
                    }
                }
            });

            if (transactionsToImport.length === 0) {
                if (skippedCount > 0) {
                    showToast(`Semua (${skippedCount}) transaksi di file Excel sudah ada di sistem (duplikat diabaikan).`, 'error');
                } else {
                    showToast('Tidak ada transaksi valid yang ditemukan dalam file.', 'error');
                }
                return;
            }

            for (const t of transactionsToImport) {
                await createTransaction(t);
            }

            const data = await fetchTransactions();
            setTransactions(Array.isArray(data) ? data : []);
            
            let successMsg = `Berhasil mengimpor ${transactionsToImport.length} transaksi!`;
            if (skippedCount > 0) {
                successMsg += ` (${skippedCount} duplikat diabaikan)`;
            }
            showToast(successMsg);

        } catch (error) {
            console.error('Error importing excel:', error);
            showToast('Gagal memproses file Excel.', 'error');
        } finally {
            setIsSubmitting(false);
            e.target.value = null; // Reset input
        }
    };

    const handleDeleteAllTransactions = async () => {
        if (confirm('PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA data transaksi? Tindakan ini tidak dapat dibatalkan.')) {
            if (confirm('Konfirmasi kedua: Apakah Anda benar-benar yakin ingin menghapus seluruh data transaksi?')) {
                setIsSubmitting(true);
                try {
                    const success = await deleteAllTransactions();
                    if (success) {
                        showToast('Semua transaksi berhasil dihapus!');
                        const data = await fetchTransactions();
                        setTransactions(Array.isArray(data) ? data : []);
                    } else {
                        showToast('Gagal menghapus semua transaksi.', 'error');
                    }
                } catch (error) {
                    console.error('Error in handleDeleteAllTransactions:', error);
                    showToast('Terjadi kesalahan saat menghapus data.', 'error');
                } finally {
                    setIsSubmitting(false);
                }
            }
        }
    };

    useEffect(() => {
        loadInitialData();
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.scrollTo(0, 0);
        }
    }, [activeTab]);

    // Filter Logic
    const filteredTransactions = transactions.filter(t => {
        const matchesSearch = (t.category?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (t.description?.toLowerCase() || "").includes(searchTerm.toLowerCase());

        const tDate = parseSafeDate(t.date);
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

        return matchesSearch && matchesPeriod;
    });

    // Stats Calculation
    const totalIncome = filteredTransactions.filter(t => t.type === 'pemasukan').reduce((acc, t) => acc + Number(t.amount), 0);
    const totalExpense = filteredTransactions.filter(t => t.type === 'pengeluaran').reduce((acc, t) => acc + Number(t.amount), 0);
    const balance = totalIncome - totalExpense;

    // Group transactions by date for line chart
    const aggregatedFlow = {};
    filteredTransactions.forEach(t => {
        const dateStr = formatDate(t.date);
        const amount = Number(t.amount);
        const net = t.type === 'pemasukan' ? amount : -amount;
        aggregatedFlow[dateStr] = (aggregatedFlow[dateStr] || 0) + net;
    });

    const distinctDates = [];
    filteredTransactions.forEach(t => {
        const dateStr = formatDate(t.date);
        if (!distinctDates.includes(dateStr)) {
            distinctDates.push(dateStr);
        }
    });

    const chartDates = distinctDates.slice(0, 7).reverse();
    const chartNetFlows = chartDates.map(d => aggregatedFlow[d] || 0);

    // Chart Data
    const chartData = {
        labels: chartDates.length > 0 ? chartDates : ['Belum Ada Data'],
        datasets: [
            {
                label: 'Arus Kas Bersih',
                data: chartNetFlows.length > 0 ? chartNetFlows : [0],
                borderColor: '#3b82f6', // blue-500
                backgroundColor: 'rgba(59, 130, 246, 0.06)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
            }
        ]
    };

    // Doughnut Chart Data for Admin Dashboard (based on filteredTransactions)
    const expenseByCategory = {};
    filteredTransactions.forEach(t => {
        if (t.type === 'pengeluaran') {
            const category = normalizeCategory(t.category, t.type);
            expenseByCategory[category] = (expenseByCategory[category] || 0) + Number(t.amount);
        }
    });

    const doughnutLabels = Object.keys(expenseByCategory);
    const doughnutData = Object.values(expenseByCategory);

    // Sort categories by amount descending
    const sortedCategories = Object.entries(expenseByCategory)
        .sort((a, b) => b[1] - a[1]);

    const totalExpenseAmount = sortedCategories.reduce((acc, curr) => acc + curr[1], 0);

    const topCategories = [];
    let otherSum = 0;
    
    sortedCategories.forEach(([cat, amount], idx) => {
        if (idx < 4) {
            topCategories.push({ category: cat, amount });
        } else {
            otherSum += amount;
        }
    });

    if (otherSum > 0) {
        topCategories.push({ category: 'lainnya', amount: otherSum });
    }

    const colorPalette = [
        '#6366f1', // Indigo-500
        '#3b82f6', // Blue-500
        '#f59e0b', // Amber-500
        '#8b5cf6', // Purple-500
        '#ec4899', // Pink-500
        '#ef4444', // Red-500
        '#06b6d4', // Cyan-500
        '#6b7280', // Gray-500
    ];

    const categoryChartData = {
        labels: doughnutLabels.length > 0 ? doughnutLabels : ['Tidak Ada Pengeluaran'],
        datasets: [
            {
                data: doughnutData.length > 0 ? doughnutData : [1],
                backgroundColor: doughnutData.length > 0 ? [
                    'rgba(99, 102, 241, 0.7)',   // Indigo-500
                    'rgba(59, 130, 246, 0.7)',   // Blue-500
                    'rgba(245, 158, 11, 0.7)',   // Amber-500
                    'rgba(139, 92, 246, 0.7)',   // Purple-500
                    'rgba(236, 72, 153, 0.7)',   // Pink-500
                    'rgba(239, 68, 68, 0.7)',    // Red-500
                    'rgba(6, 182, 212, 0.7)',    // Cyan-500
                    'rgba(107, 114, 128, 0.7)',  // Gray-500
                ] : ['rgba(48, 54, 61, 0.5)'],
                borderColor: doughnutData.length > 0 ? [
                    '#6366f1', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#06b6d4', '#6b7280'
                ] : ['#30363d'],
                borderWidth: 1,
            }
        ]
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08
            }
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 15 },
        show: { 
            opacity: 1, 
            y: 0, 
            transition: { 
                type: 'spring', 
                stiffness: 100, 
                damping: 15 
            } 
        }
    };

    const categoryChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'white',
                titleColor: '#111827',
                bodyColor: '#374151',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                callbacks: {
                    label: (context) => {
                        if (doughnutData.length === 0) return 'Belum ada pengeluaran';
                        const value = context.raw;
                        const total = doughnutData.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${context.label}: ${displayCurrency(value)} (${percentage}%)`;
                    }
                }
            }
        }
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'white',
                titleColor: '#111827',
                bodyColor: '#374151',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                padding: 12,
                callbacks: {
                    label: (context) => {
                        const val = context.raw;
                        if (val === 0) return displayCurrency(0);
                        const sign = val > 0 ? '+' : '-';
                        return `${sign} ${displayCurrency(Math.abs(val))}`;
                    }
                }
            }
        },
        scales: {
            y: {
                grid: { color: '#f3f4f6', borderDash: [5, 5] },
                ticks: {
                    color: '#6b7280',
                    callback: (val) => {
                        if (currency === 'USD') {
                            const usd = Number(val) / exchangeRate;
                            const absUsd = Math.abs(usd);
                            const sign = usd < 0 ? '-' : '';
                            return `${sign}${absUsd >= 1000 ? (absUsd / 1000).toFixed(1) + 'k' : absUsd.toFixed(0)}`;
                        }
                        const absVal = Math.abs(Number(val));
                        const sign = Number(val) < 0 ? '-' : '';
                        return `${sign}Rp${absVal >= 1000000 ? (absVal / 1000000).toFixed(1) + 'jt' : absVal >= 1000 ? (absVal / 1000).toFixed(0) + 'rb' : absVal}`;
                    }
                },
                border: { display: false }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#6b7280' },
                border: { display: false }
            }
        }
    };

    const SidebarItem = ({ id, icon: Icon, label, sublabel }) => (
        <button
            onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }}
            className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-between mb-1 group ${activeTab === id
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
        >
            <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${activeTab === id ? 'text-white' : 'text-gray-400 group-hover:text-gray-700'}`} />
                <div>
                    <span className="block leading-tight">{label}</span>
                    {sublabel && (
                        <span className={`block text-[10px] font-normal leading-tight mt-0.5 ${activeTab === id ? 'text-blue-100' : 'text-gray-400'}`}>
                            {sublabel}
                        </span>
                    )}
                </div>
            </div>
            {activeTab === id && (
                <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
            )}
        </button>
    );

    const FilterButtons = () => (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white p-2 rounded-2xl border border-gray-200/80 shadow-xs">
            <div className="flex flex-wrap gap-1.5">
                {[
                    { id: 'all', label: 'Semua (All)' },
                    { id: 'week', label: 'Minggu Ini (This Week)' },
                    { id: 'month', label: 'Bulan Ini (This Month)' },
                    { id: 'year', label: 'Tahun Ini (This Year)' }
                ].map((period) => (
                    <button
                        key={period.id}
                        onClick={() => setActivePeriod(period.id)}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${activePeriod === period.id
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                    >
                        {period.label}
                    </button>
                ))}
            </div>
            <div className="text-xs text-gray-500 font-medium px-3 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-500" />
                <span>{filteredTransactions.length} records</span>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50/60 text-gray-800 font-sans selection:bg-blue-100 selection:text-blue-900">

            {/* Top Bar */}
            <header className="fixed top-0 w-full h-16 bg-white/95 backdrop-blur-md border-b border-gray-200/80 z-50 flex items-center justify-between px-4 md:px-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="md:hidden text-gray-500 hover:text-gray-900 transition p-2 rounded-lg hover:bg-gray-100 active:scale-95"
                    >
                        {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <img src="/logo.jpg" alt="Logo" className="w-9 h-9 rounded-xl object-cover ring-1 ring-gray-200 shadow-xs" />
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-sm font-extrabold text-gray-900 tracking-tight leading-tight">FinTrack</h1>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/60 rounded">PRO</span>
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium">Financial Intelligence Workspace</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 md:gap-4">
                    {/* Live Currency Switcher (IDR / USD) for Foreign Users / WNA */}
                    <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200/80 shadow-xs">
                        <button
                            type="button"
                            onClick={() => handleSetCurrency('IDR')}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                                currency === 'IDR'
                                    ? 'bg-white text-blue-600 shadow-xs'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                            title="Format Mata Uang: Rupiah (IDR)"
                        >
                            IDR (Rp)
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSetCurrency('USD')}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                                currency === 'USD'
                                    ? 'bg-white text-blue-600 shadow-xs'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                            title="Format Mata Uang: US Dollar (USD) - Ramah Pengguna Internasional / WNA"
                        >
                            USD ($)
                        </button>
                    </div>

                    {/* Clock & Global Timezone */}
                    <div className="hidden lg:flex flex-col items-end mr-1 text-right">
                        <span className="text-xs font-semibold text-gray-700">
                            {currentTime.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            {currentTime.toLocaleTimeString(currency === 'USD' ? 'en-US' : 'id-ID', { hour: '2-digit', minute: '2-digit' })} • {userTimezoneLabel}
                        </span>
                    </div>

                    {/* Profile & Role */}
                    <div className="flex items-center gap-3 border-l border-gray-200 pl-3 md:pl-4 h-9">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            isAdminUtama ? 'bg-amber-100 border border-amber-300 text-amber-900 shadow-xs' : 'bg-blue-50 border border-blue-200 text-blue-600'
                        }`}>
                            {isAdminUtama ? <Crown className="w-4 h-4 text-amber-600" /> : 'MA'}
                        </div>
                        <div className="hidden md:block">
                            <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-gray-950 capitalize">{user?.user_metadata?.full_name || 'Administrator'}</p>
                                {isAdminUtama ? (
                                    <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5 shadow-xs">
                                        ★ SUPER ADMIN
                                    </span>
                                ) : (
                                    <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                                        PRO MEMBER
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] text-gray-400 truncate max-w-[140px]">{user?.email || 'admin@fintrack.id'}</p>
                        </div>
                        <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Log Out / Keluar">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-[80] md:hidden backdrop-blur-xs transition-opacity duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Layout Container */}
            <div className="pt-16 flex min-h-screen relative overflow-hidden">

                {/* Sidebar */}
                <aside className={`fixed top-0 left-0 bottom-0 md:relative z-[90] w-72 md:w-64 h-screen md:h-auto bg-white border-r border-gray-200/80 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col overflow-y-auto shadow-2xl md:shadow-none`}>
                    <div className="p-4 flex flex-col h-full">
                        <div className="space-y-1 flex-1">
                            <p className="px-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2 mt-2">Main Navigation</p>
                            <SidebarItem id="dashboard" icon={LayoutDashboard} label="Dashboard" sublabel="Overview & Analytics" />
                            <SidebarItem id="transactions" icon={CreditCard} label="Transaksi" sublabel="Income & Expenses" />
                            <SidebarItem id="reports" icon={FileText} label="Laporan Keuangan" sublabel="Financial Statements" />
                            {isAdminUtama && (
                                <button
                                    onClick={() => { setActiveTab('subscriptions'); setIsSidebarOpen(false); }}
                                    className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-between mb-1 group ${activeTab === 'subscriptions'
                                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Crown className={`w-4 h-4 ${activeTab === 'subscriptions' ? 'text-slate-950' : 'text-amber-500'}`} />
                                        <div>
                                            <span className="block leading-tight">Kelola Langganan</span>
                                            <span className={`block text-[10px] font-normal leading-tight mt-0.5 ${activeTab === 'subscriptions' ? 'text-amber-950' : 'text-gray-400'}`}>
                                                Subscription Manager
                                            </span>
                                        </div>
                                    </div>
                                    {allOrders.filter(o => o.status === 'PENDING').length > 0 && (
                                        <span className="bg-amber-950 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-xs">
                                            {allOrders.filter(o => o.status === 'PENDING').length}
                                        </span>
                                    )}
                                </button>
                            )}

                            <p className="px-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2 mt-5">Subscription & Account</p>
                            <Link to="/pricing" className="w-full text-left px-3.5 py-2 text-xs font-bold text-amber-700 bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200/60 rounded-xl transition-all flex items-center gap-2.5 mb-1.5 shadow-2xs">
                                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                <div>
                                    <span className="block leading-tight">Upgrade Premium</span>
                                    <span className="block text-[9px] text-amber-600/80 font-normal">Pricing & Plans</span>
                                </div>
                            </Link>
                            <Link to="/my-orders" className="w-full text-left px-3.5 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-all flex items-center gap-3 mb-1">
                                <ShoppingBag className="w-4 h-4 text-gray-400" />
                                <div>
                                    <span className="block leading-tight font-semibold">Pesanan Saya</span>
                                    <span className="block text-[10px] text-gray-400">Order Invoices</span>
                                </div>
                            </Link>
                            <SidebarItem id="profile" icon={User} label="Profil Akun" sublabel="Security & Settings" />
                            <Link to="/" target="_blank" className="w-full text-left px-3.5 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-all flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Globe className="w-4 h-4 text-gray-400" />
                                    <div>
                                        <span className="block leading-tight font-semibold">Portal Publik</span>
                                        <span className="block text-[10px] text-gray-400">Public Website</span>
                                    </div>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                            </Link>
                        </div>

                        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/70 mt-auto shadow-2xs">
                            <div className="flex items-center gap-2.5">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <div className="flex-1">
                                    <p className="text-[11px] font-bold text-gray-900">Cloud Engine Active</p>
                                    <p className="text-[9px] text-gray-500">RLS Encryption • 99.9% Uptime</p>
                                </div>
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 bg-gray-50/60 p-4 md:p-8">
                    <div className="max-w-6xl mx-auto space-y-8">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center min-h-[400px]">
                                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-gray-500 animate-pulse text-sm font-medium">Menyiapkan dashboard FinTrack...</p>
                            </div>
                        ) : (
                            <>
                                {/* Page Header */}
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200/80 pb-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                FINTRACK WORKSPACE
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-mono font-medium">
                                                CURRENCY: {currency}
                                            </span>
                                        </div>
                                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                                            {{
                                                dashboard: 'Dashboard Overview & Analytics',
                                                transactions: 'Transaction Ledger & Records',
                                                reports: 'Financial Statements & Reports',
                                                subscriptions: 'Subscription & User Management',
                                                profile: 'Account Settings & Credentials'
                                            }[activeTab]}
                                        </h2>
                                        <p className="text-gray-500 text-sm mt-1">
                                            {{
                                                dashboard: 'Ringkasan arus kas dan performa keuangan real-time.',
                                                transactions: 'Catat dan kelola riwayat transaksi pemasukan serta pengeluaran.',
                                                reports: 'Analisis mendalam dan cetak lembar kerja keuangan standar.',
                                                subscriptions: 'Kelola status langganan pengguna, kuota, dan hak akses admin.',
                                                profile: 'Perbarui informasi identitas profil dan keamanan kata sandi akun.'
                                            }[activeTab]}
                                        </p>
                                    </div>
                                    {activeTab === 'subscriptions' && isAdminUtama && (
                                        <button
                                            onClick={() => setIsGrantModalOpen(true)}
                                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-sm font-bold rounded-lg hover:from-amber-600 hover:to-amber-700 transition shadow-lg shadow-amber-500/20"
                                        >
                                            <Award className="w-4 h-4" />
                                            + Berikan Premium (Admin)
                                        </button>
                                    )}
                                    {activeTab === 'reports' && (
                                        <button
                                            onClick={exportToExcel}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download Excel
                                        </button>
                                    )}
                                    {activeTab === 'transactions' && (
                                        <div className="flex flex-wrap items-center gap-2">
                                            <input 
                                                id="excel-file-input"
                                                type="file" 
                                                accept=".xlsx, .xls" 
                                                ref={fileInputRef} 
                                                onChange={handleUploadExcel} 
                                                hidden 
                                                aria-label="Unggah file Excel"
                                            />
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isSubmitting}
                                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
                                            >
                                                <Upload className="w-4 h-4" />
                                                {isSubmitting ? 'Memproses...' : 'Upload Excel'}
                                            </button>
                                            <button
                                                onClick={handleDeleteAllTransactions}
                                                disabled={isSubmitting || transactions.length === 0}
                                                className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-lg hover:bg-rose-700 transition shadow-lg shadow-rose-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Hapus Semua Data
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeTab}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                                        className="space-y-8"
                                    >
                                        {activeTab === 'dashboard' && (
                                            <div className="space-y-6">
                                                {/* STATUS AKUN CARD (Hanya untuk Admin Utama) */}
                                                {isAdminUtama && (
                                                    <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                        <div>
                                                            <div className="flex items-center space-x-2 mb-2">
                                                                <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-0.5 rounded-full">
                                                                    STATUS AKUN
                                                                </span>
                                                            {userSub?.plan_code === 'PREMIUM_LIFETIME' ? (
                                                                <span className="text-[10px] font-black uppercase tracking-widest bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full">
                                                                    LIFETIME ACCESS
                                                                </span>
                                                            ) : userSub?.subscription_status === 'ACTIVE' ? (
                                                                <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                                                                    ACTIVE PREMIUM
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] font-black uppercase tracking-widest bg-gray-700 text-gray-300 px-2.5 py-0.5 rounded-full">
                                                                    FREE PLAN
                                                                </span>
                                                            )}
                                                        </div>

                                                        <h3 className="text-xl md:text-2xl font-extrabold text-white">
                                                            {userSub?.plan_code === 'PREMIUM_LIFETIME'
                                                                ? 'Premium Unlimited'
                                                                : userSub?.plan_code === 'PREMIUM_YEARLY' && userSub?.subscription_status === 'ACTIVE'
                                                                ? 'Premium 1 Tahun'
                                                                : userSub?.plan_code === 'PREMIUM_MONTHLY' && userSub?.subscription_status === 'ACTIVE'
                                                                ? 'Premium 1 Bulan'
                                                                : 'FREE PLAN'}
                                                        </h3>

                                                        <p className="text-gray-300 text-xs mt-1">
                                                            {userSub?.plan_code === 'PREMIUM_LIFETIME' ? (
                                                                <span>Masa aktif: <strong>Selamanya (Lifetime)</strong>. ✓ Tidak perlu perpanjangan</span>
                                                            ) : userSub?.subscription_status === 'ACTIVE' && userSub?.subscription_end ? (
                                                                <span>Aktif sampai: <strong>{formatDate(userSub.subscription_end)}</strong></span>
                                                            ) : (
                                                                <span>Anda sedang menggunakan paket Gratis. Penggunaan bulan ini: <strong>{transactions.length} / {usageLimits.free_max_transactions_monthly}</strong></span>
                                                            )}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        {userSub?.plan_code === 'PREMIUM_LIFETIME' ? (
                                                            <div className="text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-4 py-2.5 rounded-xl flex items-center">
                                                                ✓ Lifetime Active
                                                            </div>
                                                        ) : userSub?.subscription_status === 'ACTIVE' ? (
                                                            <Link
                                                                to="/pricing"
                                                                className="inline-flex items-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-600/30"
                                                            >
                                                                Perpanjang Premium
                                                            </Link>
                                                        ) : (
                                                            <Link
                                                                to="/pricing"
                                                                className="inline-flex items-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-xs hover:from-amber-500 hover:to-amber-600 transition shadow-lg shadow-amber-500/20"
                                                            >
                                                                Upgrade Premium
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                                )}

                                                <FilterButtons />

                                                {/* Stats Cards */}
                                                <motion.div 
                                                    variants={containerVariants}
                                                    initial="hidden"
                                                    animate="show"
                                                    className="grid grid-cols-1 md:grid-cols-3 gap-6"
                                                >
                                                     {/* Income */}
                                                     <motion.div variants={cardVariants} className="bg-white border border-gray-200/90 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
                                                         <div className="flex items-start justify-between">
                                                             <div>
                                                                 <div className="flex items-center gap-1.5 mb-1">
                                                                     <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Revenue</p>
                                                                     <span className="text-[10px] text-gray-400">• Pemasukan</span>
                                                                 </div>
                                                                 <h3 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">{displayCurrency(totalIncome)}</h3>
                                                                 <p className="text-[11px] text-emerald-600 font-medium mt-2 flex items-center gap-1">
                                                                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                     Total dana masuk periode ini
                                                                 </p>
                                                             </div>
                                                             <div className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl group-hover:scale-110 transition-transform">
                                                                 <TrendingUp className="w-5 h-5 text-emerald-600" />
                                                             </div>
                                                         </div>
                                                     </motion.div>

                                                     {/* Expense */}
                                                     <motion.div variants={cardVariants} className="bg-white border border-gray-200/90 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
                                                         <div className="flex items-start justify-between">
                                                             <div>
                                                                 <div className="flex items-center gap-1.5 mb-1">
                                                                     <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Expenses</p>
                                                                     <span className="text-[10px] text-gray-400">• Pengeluaran</span>
                                                                 </div>
                                                                 <h3 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">{displayCurrency(totalExpense)}</h3>
                                                                 <p className="text-[11px] text-rose-600 font-medium mt-2 flex items-center gap-1">
                                                                     <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                                                     Total beban pengeluaran tercatat
                                                                 </p>
                                                             </div>
                                                             <div className="p-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl group-hover:scale-110 transition-transform">
                                                                 <TrendingDown className="w-5 h-5 text-rose-600" />
                                                             </div>
                                                         </div>
                                                     </motion.div>

                                                     {/* Balance */}
                                                     <motion.div variants={cardVariants} className="bg-white border border-gray-200/90 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
                                                         <div className="flex items-start justify-between">
                                                             <div>
                                                                 <div className="flex items-center gap-1.5 mb-1">
                                                                     <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Cashflow</p>
                                                                     <span className="text-[10px] text-gray-400">• Saldo Bersih</span>
                                                                 </div>
                                                                 <h3 className={`text-2xl lg:text-3xl font-extrabold tracking-tight ${balance >= 0 ? 'text-gray-900' : 'text-rose-600'}`}>{displayCurrency(balance)}</h3>
                                                                 <p className="text-[11px] text-blue-600 font-medium mt-2 flex items-center gap-1">
                                                                     <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                                     Cadangan kas likuid aktif
                                                                 </p>
                                                             </div>
                                                             <div className="p-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl group-hover:scale-110 transition-transform">
                                                                 <Wallet className="w-5 h-5 text-blue-600" />
                                                             </div>
                                                         </div>
                                                     </motion.div>
                                                </motion.div>

                                                {/* Charts Grid */}
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 15 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.15, duration: 0.4 }}
                                                    className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                                                >
                                                     {/* Line Chart */}
                                                     <div className="lg:col-span-2 bg-white border border-gray-200/90 rounded-2xl p-6 shadow-xs">
                                                         <div className="flex items-center justify-between mb-6">
                                                             <div>
                                                                 <h3 className="text-base font-extrabold text-gray-900">Cashflow Analytics / Arus Kas</h3>
                                                                 <p className="text-xs text-gray-500">Tren pemasukan dan pengeluaran per periode</p>
                                                             </div>
                                                             <span className="text-[10px] font-bold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg">
                                                                 Currency: {currency}
                                                             </span>
                                                         </div>
                                                         <div className="h-72">
                                                             <Line options={chartOptions} data={chartData} />
                                                         </div>
                                                     </div>
  
                                                     {/* Doughnut Chart */}
                                                     <div className="bg-white border border-gray-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                                                         <div className="flex items-center justify-between mb-4">
                                                             <div>
                                                                 <h3 className="text-base font-extrabold text-gray-900">Expense Breakdown / Pengeluaran</h3>
                                                                 <p className="text-xs text-gray-500">Distribusi alokasi per kategori</p>
                                                             </div>
                                                         </div>
                                                         <div className="h-44 flex items-center justify-center">
                                                             <Doughnut options={categoryChartOptions} data={categoryChartData} />
                                                         </div>
                                                         {/* Custom Legend */}
                                                         <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 shrink-0">
                                                             {topCategories.length === 0 ? (
                                                                 <p className="text-xs text-gray-400 text-center">Belum ada data pengeluaran</p>
                                                             ) : (
                                                                 topCategories.map((item, idx) => {
                                                                     const percentage = totalExpenseAmount > 0 ? ((item.amount / totalExpenseAmount) * 100).toFixed(0) : 0;
                                                                     return (
                                                                         <div key={item.category} className="flex items-center justify-between text-xs text-gray-700">
                                                                             <div className="flex items-center gap-2">
                                                                                 <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorPalette[idx % colorPalette.length] }} />
                                                                                 <span className="capitalize truncate max-w-[120px] font-medium">{item.category}</span>
                                                                             </div>
                                                                             <div className="flex items-center gap-3">
                                                                                 <span className="text-gray-400 font-medium font-mono">{displayCurrency(item.amount)}</span>
                                                                                 <span className="font-bold text-gray-900 w-8 text-right">{percentage}%</span>
                                                                             </div>
                                                                         </div>
                                                                     );
                                                                 })
                                                             )}
                                                         </div>
                                                     </div>
                                                </motion.div>

                                                {/* MANAJEMEN PENGGUNA WEBSITE (KHUSUS ADMIN UTAMA) */}
                                                {isAdminUtama && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 15 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.2, duration: 0.4 }}
                                                        className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm overflow-hidden space-y-4"
                                                    >
                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                                                        <Crown className="w-3 h-3 text-amber-600" />
                                                                        KONTROL ADMIN UTAMA
                                                                    </span>
                                                                    <span className="text-xs font-bold text-gray-500">
                                                                        Total {allSubscriptions.length} Pengguna Terdaftar
                                                                    </span>
                                                                </div>
                                                                <h3 className="text-xl font-black text-gray-900">
                                                                    Manajemen & Kontrol Pengguna Website
                                                                </h3>
                                                                <p className="text-xs text-gray-500">
                                                                    Anda dapat mengedit paket, masa aktif, status, atau menghapus pengguna secara langsung dari menu dashboard utama ini.
                                                                </p>
                                                            </div>

                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <div className="relative">
                                                                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                                                    <input
                                                                        type="text"
                                                                        value={dashboardUserSearch}
                                                                        onChange={(e) => setDashboardUserSearch(e.target.value)}
                                                                        placeholder="Cari user / email..."
                                                                        className="pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-44 md:w-56"
                                                                    />
                                                                </div>
                                                                <button
                                                                    onClick={() => handleOpenEditUserModal(null)}
                                                                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                                                                >
                                                                    <Plus className="w-3.5 h-3.5" />
                                                                    Tambah / Beri User
                                                                </button>
                                                                <button
                                                                    onClick={() => setActiveTab('subscriptions')}
                                                                    className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                                                                >
                                                                    <Crown className="w-3.5 h-3.5" />
                                                                    Kelola Lengkap
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* User Table in Main Dashboard */}
                                                        <div className="overflow-x-auto rounded-2xl border border-gray-100">
                                                            <table className="w-full text-left text-xs min-w-[700px]">
                                                                <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-gray-100">
                                                                    <tr>
                                                                        <th className="py-3 px-4">Pengguna</th>
                                                                        <th className="py-3 px-4">Paket</th>
                                                                        <th className="py-3 px-4">Status</th>
                                                                        <th className="py-3 px-4">Masa Berlaku</th>
                                                                        <th className="py-3 px-4 text-center">Aksi (Edit & Hapus)</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100 font-medium">
                                                                    {allSubscriptions.length === 0 ? (
                                                                        <tr>
                                                                            <td colSpan="5" className="py-8 text-center text-gray-400">
                                                                                Belum ada data pengguna yang terdaftar di database.
                                                                            </td>
                                                                        </tr>
                                                                    ) : (
                                                                        allSubscriptions
                                                                            .filter(sub => {
                                                                                const term = dashboardUserSearch.toLowerCase().trim();
                                                                                if (!term) return true;
                                                                                const emailStr = typeof sub.user_email === 'string' ? sub.user_email.toLowerCase() : '';
                                                                                const idStr = typeof sub.user_id === 'string' ? sub.user_id.toLowerCase() : '';
                                                                                return emailStr.includes(term) || idStr.includes(term);
                                                                            })
                                                                            .slice(0, 10)
                                                                            .map((sub) => {
                                                                                const isUserSuper = isSuperAdmin(sub.user_email || sub);
                                                                                return (
                                                                                    <tr key={sub.id || sub.user_id} className="hover:bg-gray-50/60 transition">
                                                                                        <td className="py-3 px-4">
                                                                                            <div className="flex items-center gap-1.5">
                                                                                                <p className="font-bold text-gray-900">{sub.user_email || 'Email belum tercatat'}</p>
                                                                                                {isUserSuper && (
                                                                                                    <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded">
                                                                                                        UTAMA
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                            <p className="font-mono text-[10px] text-gray-400">UID: {sub.user_id}</p>
                                                                                        </td>
                                                                                        <td className="py-3 px-4 font-bold">
                                                                                            <span className={
                                                                                                sub.plan_code === 'PREMIUM_LIFETIME' ? 'text-amber-600' :
                                                                                                sub.plan_code === 'PREMIUM_YEARLY' ? 'text-purple-600' :
                                                                                                sub.plan_code === 'PREMIUM_MONTHLY' ? 'text-blue-600' : 'text-gray-600'
                                                                                            }>
                                                                                                {sub.plan_code === 'PREMIUM_MONTHLY' ? 'Premium 1 Bulan' :
                                                                                                 sub.plan_code === 'PREMIUM_YEARLY' ? 'Premium 1 Tahun' :
                                                                                                 sub.plan_code === 'PREMIUM_LIFETIME' ? 'Premium Unlimited' : 'FREE'}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="py-3 px-4">
                                                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                                                sub.subscription_status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                                                                                                sub.subscription_status === 'EXPIRED' ? 'bg-rose-100 text-rose-800' :
                                                                                                'bg-gray-100 text-gray-700'
                                                                                            }`}>
                                                                                                {sub.subscription_status}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="py-3 px-4 text-gray-600 font-mono text-[11px]">
                                                                                            {sub.plan_code === 'PREMIUM_LIFETIME' ? (
                                                                                                <span className="text-amber-600 font-bold">Selamanya (Lifetime)</span>
                                                                                            ) : sub.subscription_end ? (
                                                                                                formatDate(sub.subscription_end)
                                                                                            ) : '—'}
                                                                                        </td>
                                                                                        <td className="py-3 px-4 text-center">
                                                                                            <div className="flex items-center justify-center gap-1.5">
                                                                                                <button
                                                                                                    onClick={() => handleOpenEditUserModal(sub)}
                                                                                                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-xs"
                                                                                                    title="Edit Data & Paket User"
                                                                                                >
                                                                                                    <Edit2 className="w-3 h-3" />
                                                                                                    Edit
                                                                                                </button>
                                                                                                {!isUserSuper && (
                                                                                                    <button
                                                                                                        onClick={() => handleDeleteUser(sub.user_id, sub.user_email)}
                                                                                                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border border-rose-200"
                                                                                                        title="Hapus User Secara Permanen"
                                                                                                    >
                                                                                                        <Trash2 className="w-3 h-3" />
                                                                                                        Hapus
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
                                                        {allSubscriptions.length > 10 && (
                                                            <div className="text-center pt-1">
                                                                <button
                                                                    onClick={() => setActiveTab('subscriptions')}
                                                                    className="text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline"
                                                                >
                                                                    Lihat Seluruh {allSubscriptions.length} Pengguna di Menu Kelola Langganan →
                                                                </button>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </div>
                                        )}

                                {activeTab === 'transactions' && (
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        {/* Input Form */}
                                        <motion.div 
                                             initial={{ opacity: 0, x: -20 }} 
                                             animate={{ opacity: 1, x: 0 }} 
                                             transition={{ duration: 0.4, ease: 'easeOut' }}
                                             className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 h-fit"
                                         >
                                            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm shadow-gray-100">
                                                <div className="flex items-center justify-between gap-2 mb-4">
                                                    <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Transaksi' : 'Transaksi Baru'}</h3>
                                                    {editingId && <button onClick={cancelEdit} className="text-xs text-rose-400 hover:text-rose-300 hover:underline">Batal Edit</button>}
                                                </div>

                                                <input
                                                    id="receipt-file-input"
                                                    type="file"
                                                    ref={receiptInputRef}
                                                    onChange={handleReceiptPhotoUpload}
                                                    accept="image/*"
                                                    className="hidden"
                                                    aria-label="Unggah foto nota atau struk"
                                                />

                                                <button
                                                    type="button"
                                                    onClick={() => receiptInputRef.current?.click()}
                                                    disabled={isScanningReceipt}
                                                    className="w-full mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 hover:bg-blue-100 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer disabled:opacity-50"
                                                >
                                                    {isScanningReceipt ? (
                                                        <>
                                                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                            <span>{scanProgress || 'Memindai Foto Nota...'}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Camera className="w-4 h-4 text-blue-600" />
                                                            <span>Catat via Foto Struk / AI Scan Receipt</span>
                                                        </>
                                                    )}
                                                </button>

                                                <form onSubmit={handleSubmit} className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-3 p-1 bg-gray-50 rounded-lg border border-gray-200">
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, type: 'pemasukan' })}
                                                            className={`py-2 text-xs font-bold rounded-md transition ${formData.type === 'pemasukan' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-700 hover:text-gray-900'}`}
                                                        >
                                                            Pemasukan (Income)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, type: 'pengeluaran' })}
                                                            className={`py-2 text-xs font-bold rounded-md transition ${formData.type === 'pengeluaran' ? 'bg-rose-600 text-white shadow-sm' : 'text-gray-700 hover:text-gray-900'}`}
                                                        >
                                                            Pengeluaran (Expense)
                                                        </button>
                                                    </div>

                                                    <div>
                                                        <label htmlFor="trans-date" className="block text-xs font-semibold text-gray-700 mb-1.5 pl-1">Tanggal / Date</label>
                                                        <div className="relative">
                                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                            <input
                                                                id="trans-date"
                                                                type="date"
                                                                value={formData.date}
                                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                                className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                                                                required
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label htmlFor="trans-amount" className="block text-xs font-semibold text-gray-700 mb-1.5 pl-1">Nominal / Amount ({currency})</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm font-bold font-mono">{currency === 'USD' ? '$' : 'Rp'}</span>
                                                            <input
                                                                id="trans-amount"
                                                                type="text"
                                                                placeholder="0"
                                                                value={formData.amount}
                                                                onChange={(e) => setFormData({ ...formData, amount: formatNumberInput(e.target.value) })}
                                                                className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition font-medium"
                                                                required
                                                            />
                                                        </div>
                                                        {formData.amount && (
                                                            <p className="text-[10px] text-gray-500 mt-1 pl-1">
                                                                {currency === 'USD' ? (
                                                                    <span>≈ Rp {((Number(formData.amount.replace(/\D/g, '') || 0)) * exchangeRate).toLocaleString('id-ID')} (Kurs: 1 USD = Rp {exchangeRate.toLocaleString('id-ID')})</span>
                                                                ) : (
                                                                    <span>≈ ${(((Number(formData.amount.replace(/\D/g, '') || 0)) / exchangeRate)).toFixed(2)} USD (Kurs: 1 USD = Rp {exchangeRate.toLocaleString('id-ID')})</span>
                                                                )}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div>
                                                         <label htmlFor="trans-category-select" className="block text-xs font-semibold text-gray-700 mb-1.5 pl-1">Kategori / Category</label>
                                                         <select
                                                             id="trans-category-select"
                                                             aria-label="Pilih Kategori Transaksi"
                                                             value={isCustomCategory ? 'Lainnya' : (CATEGORIES.some(c => c.id === formData.category) ? formData.category : (formData.category ? 'Lainnya' : ''))}
                                                             onChange={(e) => {
                                                                 const val = e.target.value;
                                                                 if (val === 'Lainnya') {
                                                                     setIsCustomCategory(true);
                                                                     setFormData({ ...formData, category: '' });
                                                                 } else {
                                                                     setIsCustomCategory(false);
                                                                     setFormData({ ...formData, category: val });
                                                                 }
                                                             }}
                                                             className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg py-2.5 px-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition mb-3 cursor-pointer"
                                                             required
                                                         >
                                                             <option value="" disabled>-- Pilih Kategori --</option>
                                                             {CATEGORIES.map(cat => (
                                                                 <option key={cat.id} value={cat.id}>
                                                                     {cat.icon} {cat.label}
                                                                 </option>
                                                             ))}
                                                         </select>

                                                         {isCustomCategory && (
                                                             <input
                                                                 id="trans-custom-category"
                                                                 type="text"
                                                                 aria-label="Ketik Kategori Kustom"
                                                                 placeholder="Ketik Kategori Kustom..."
                                                                 value={formData.category}
                                                                 onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                                 className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg py-2.5 px-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition mb-3"
                                                                 required
                                                             />
                                                         )}

                                                         <label htmlFor="trans-desc" className="block text-xs font-semibold text-gray-700 mb-1.5 pl-1">Keterangan / Catatan</label>
                                                         <textarea
                                                             id="trans-desc"
                                                             placeholder="Catatan tambahan (opsional)"
                                                             value={formData.description}
                                                             onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                             className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg py-2.5 px-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition min-h-[80px]"
                                                         />
                                                     </div>

                                                     <button 
                                                         type="submit" 
                                                         disabled={isSubmitting}
                                                         className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                     >
                                                         {isSubmitting ? (
                                                             <>
                                                                 <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                 <span>Menyimpan...</span>
                                                             </>
                                                         ) : (
                                                             <>
                                                                 <Save className="w-4 h-4" />
                                                                 <span>{editingId ? 'Simpan Perubahan' : 'Simpan Transaksi'}</span>
                                                             </>
                                                         )}
                                                     </button>
                                                </form>
                                            </div>
                                        </motion.div>

                                        {/* Transaction List */}
                                        <motion.div 
                                             initial={{ opacity: 0, x: 20 }} 
                                             animate={{ opacity: 1, x: 0 }} 
                                             transition={{ duration: 0.4, ease: 'easeOut' }}
                                             className="lg:col-span-2"
                                         >
                                            <div className="bg-white border border-gray-200 rounded-xl shadow-sm shadow-gray-100 overflow-hidden flex flex-col lg:h-[calc(100vh-230px)]">
                                                <div className="p-5 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                                                    <h3 className="font-bold text-gray-900">Riwayat Transaksi</h3>
                                                    <div className="relative w-full md:w-64">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                        <input
                                                            id="search-transactions-input"
                                                            aria-label="Cari data transaksi"
                                                            type="text"
                                                            placeholder="Cari transaksi..."
                                                            value={searchTerm}
                                                            onChange={(e) => setSearchTerm(e.target.value)}
                                                            className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="hidden md:block overflow-x-auto flex-1 lg:h-[calc(100vh-310px)] lg:overflow-y-auto">
                                                    <table className="w-full text-left text-sm text-gray-500">
                                                        <thead className="bg-gray-50/90 text-gray-600 font-bold uppercase tracking-wider text-[11px] border-b border-gray-200 sticky top-0 z-10">
                                                            <tr>
                                                                <th className="px-6 py-3.5 w-1/4">Tanggal / Date</th>
                                                                <th className="px-6 py-3.5 w-1/4">Kategori / Category</th>
                                                                <th className="px-6 py-3.5 w-1/4">Nominal / Amount ({currency})</th>
                                                                <th className="px-6 py-3.5 w-1/4 text-right">Aksi / Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100 bg-white">
                                                            {loading ? (
                                                                <tr><td colSpan="4" className="text-center py-12 text-gray-400">Memuat data...</td></tr>
                                                            ) : filteredTransactions.length === 0 ? (
                                                                <tr><td colSpan="4" className="text-center py-12 text-gray-400">Belum ada transaksi.</td></tr>
                                                            ) : (
                                                                <AnimatePresence initial={false}>
                                                                    {filteredTransactions.map((t) => (
                                                                        <motion.tr 
                                                                            key={t.id}
                                                                            layout
                                                                            initial={{ opacity: 0, y: 10 }}
                                                                            animate={{ opacity: 1, y: 0 }}
                                                                            exit={{ opacity: 0, x: -30 }}
                                                                            transition={{ duration: 0.2 }}
                                                                            className="hover:bg-gray-50/50 transition"
                                                                        >
                                                                            <td className="px-6 py-4">
                                                                                <div className="text-gray-800 font-medium">{displayDate(t.date)}</div>
                                                                                <div className="text-xs text-gray-400 capitalize">
                                                                                    {parseSafeDate(t.date)?.toLocaleDateString(currency === 'USD' ? 'en-US' : 'id-ID', { weekday: 'long' }) || ''}
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-6 py-4">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className={`w-2 h-2 rounded-full ${t.type === 'pemasukan' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                                                    <span className="text-gray-800 font-medium">{capitalizeText(t.category)}</span>
                                                                                </div>
                                                                                {t.description && t.description !== '-' && <div className="text-xs text-gray-400 mt-1 truncate max-w-[150px]">{t.description}</div>}
                                                                            </td>
                                                                            <td className="px-6 py-4">
                                                                                <span className={`font-semibold font-mono ${t.type === 'pemasukan' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                                    {t.type === 'pemasukan' ? '+' : '-'} {displayCurrency(t.amount)}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-6 py-4 text-right">
                                                                                <div className="flex justify-end gap-2">
                                                                                    <button onClick={() => handleEdit(t)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition" title="Edit">
                                                                                        <Edit2 className="w-4 h-4" />
                                                                                    </button>
                                                                                    <button onClick={() => handleDelete(t.id)} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Delete">
                                                                                        <Trash2 className="w-4 h-4" />
                                                                                    </button>
                                                                                </div>
                                                                            </td>
                                                                        </motion.tr>
                                                                    ))}
                                                                </AnimatePresence>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="md:hidden p-4 space-y-4">
                                                    {loading ? (
                                                        <div className="text-center py-4 text-gray-500">Memuat data...</div>
                                                    ) : filteredTransactions.length === 0 ? (
                                                        <div className="text-center py-4 text-gray-500">Belum ada transaksi.</div>
                                                    ) : (
                                                        <AnimatePresence initial={false}>
                                                            {filteredTransactions.map((t) => (
                                                                <motion.div 
                                                                    key={t.id}
                                                                    layout
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    exit={{ opacity: 0, x: -30 }}
                                                                    transition={{ duration: 0.2 }}
                                                                    className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 shadow-sm"
                                                                >
                                                                    <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                                                                        <div>
                                                                            <p className="text-xs text-gray-500 font-medium">
                                                                                {displayDate(t.date)} • {parseSafeDate(t.date)?.toLocaleDateString(currency === 'USD' ? 'en-US' : 'id-ID', { weekday: 'short' }) || ''}
                                                                            </p>
                                                                            <div className="flex items-center gap-2 mt-1">
                                                                                <span className={`w-2 h-2 rounded-full ${t.type === 'pemasukan' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                                                <span className="text-gray-800 font-bold">{capitalizeText(t.category)}</span>
                                                                            </div>
                                                                        </div>
                                                                        <span className={`font-bold font-mono ${t.type === 'pemasukan' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                            {t.type === 'pemasukan' ? '+' : '-'} {displayCurrency(t.amount)}
                                                                        </span>
                                                                    </div>
                                                                    {t.description && t.description !== '-' && <p className="text-xs text-gray-500 italic">{t.description}</p>}
                                                                    <div className="flex justify-end gap-2 pt-1">
                                                                        <button onClick={() => handleEdit(t)} className="flex-1 py-2 bg-gray-50 text-gray-700 rounded flex items-center justify-center gap-2 text-xs font-medium border border-gray-200 hover:bg-gray-100">
                                                                            <Edit2 className="w-3.5 h-3.5" /> Edit
                                                                        </button>
                                                                        <button onClick={() => handleDelete(t.id)} className="flex-1 py-2 bg-rose-50 text-rose-600 rounded flex items-center justify-center gap-2 text-xs font-medium border border-rose-200 hover:bg-rose-100">
                                                                            <Trash2 className="w-3.5 h-3.5" /> Hapus
                                                                        </button>
                                                                    </div>
                                                                </motion.div>
                                                            ))}
                                                        </AnimatePresence>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    </div>
                                )}

                                {activeTab === 'reports' && (
                                    <div className="space-y-6">
                                        {/* ===== ANGGARAN BULANAN - PROFESSIONAL REPORT ===== */}
                                        {(() => {
                                            // Group transactions by category
                                            const incomeByCategory = {};
                                            const expenseByCategory = {};

                                            filteredTransactions.forEach(t => {
                                                const cat = capitalizeText(t.category || 'Lainnya');
                                                const amt = Number(t.amount);
                                                if (t.type === 'pemasukan') {
                                                    incomeByCategory[cat] = (incomeByCategory[cat] || 0) + amt;
                                                } else {
                                                    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + amt;
                                                }
                                            });

                                            const incomeRows = Object.entries(incomeByCategory).sort((a, b) => b[1] - a[1]);
                                            const expenseRows = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);
                                            const totalIncomeCat = incomeRows.reduce((s, [, v]) => s + v, 0);
                                            const totalExpenseCat = expenseRows.reduce((s, [, v]) => s + v, 0);
                                            const saldo = totalIncomeCat - totalExpenseCat;

                                            const periodLabel = activePeriod === 'week' ? (currency === 'USD' ? 'This Week (Minggu Ini)' : 'Minggu Ini')
                                                : activePeriod === 'month' ? new Date().toLocaleString(currency === 'USD' ? 'en-US' : 'id-ID', { month: 'long', year: 'numeric' })
                                                : activePeriod === 'year' ? (currency === 'USD' ? `Year ${new Date().getFullYear()}` : `Tahun ${new Date().getFullYear()}`)
                                                : (currency === 'USD' ? 'All Periods (Semua Periode)' : 'Semua Periode');

                                            return (
                                                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                                                    {/* Header */}
                                                    <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                        <div>
                                                            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Financial Statement / Laporan</p>
                                                            <h2 className="text-white text-xl font-extrabold tracking-tight">Anggaran Bulanan (Monthly Cashflow)</h2>
                                                            <p className="text-slate-300 text-xs mt-1">Periode: <span className="font-bold text-white">{periodLabel}</span> • Mata Uang: <span className="font-bold text-blue-300">{currency}</span></p>
                                                        </div>
                                                        {/* Saldo Box - top right */}
                                                        <div className="flex gap-3 flex-wrap">
                                                            <div className="bg-slate-700/60 border border-slate-600 rounded-xl px-4 py-3 text-center min-w-[120px]">
                                                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Revenue / Masuk</p>
                                                                <p className="text-emerald-400 font-extrabold text-sm mt-0.5 font-mono">{displayCurrency(totalIncomeCat)}</p>
                                                            </div>
                                                            <div className="bg-slate-700/60 border border-slate-600 rounded-xl px-4 py-3 text-center min-w-[120px]">
                                                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Expenses / Keluar</p>
                                                                <p className="text-rose-400 font-extrabold text-sm mt-0.5 font-mono">{displayCurrency(totalExpenseCat)}</p>
                                                            </div>
                                                            <div className={`border rounded-xl px-4 py-3 text-center min-w-[120px] ${saldo >= 0 ? 'bg-emerald-600/20 border-emerald-500/40' : 'bg-rose-600/20 border-rose-500/40'}`}>
                                                                <p className="text-slate-300 text-[10px] font-bold uppercase tracking-wider">Net Cash / Bersih</p>
                                                                <p className={`font-extrabold text-sm mt-0.5 font-mono ${saldo >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{displayCurrency(saldo)}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="p-6 space-y-8">
                                                        {/* PENDAPATAN TABLE */}
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
                                                                <h3 className="font-extrabold text-gray-900 text-sm uppercase tracking-widest">Pendapatan (Income)</h3>
                                                            </div>
                                                            <div className="rounded-xl overflow-hidden border border-gray-200">
                                                                <table className="w-full text-sm text-left">
                                                                    <thead>
                                                                        <tr className="bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider">
                                                                            <th className="px-4 py-3 w-8">#</th>
                                                                            <th className="px-4 py-3">Kategori (Category)</th>
                                                                            <th className="px-4 py-3 text-right">Nominal (Amount)</th>
                                                                            <th className="px-4 py-3 text-right w-32">% Share</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-100">
                                                                        {incomeRows.length === 0 ? (
                                                                            <tr>
                                                                                <td colSpan="4" className="px-4 py-6 text-center text-gray-400 text-xs italic">Belum ada data pendapatan untuk periode ini.</td>
                                                                            </tr>
                                                                        ) : incomeRows.map(([cat, amt], idx) => (
                                                                            <tr key={cat} className={idx % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40'}>
                                                                                <td className="px-4 py-3 text-gray-400 text-xs font-mono">{idx + 1}</td>
                                                                                <td className="px-4 py-3 font-semibold text-gray-800">{cat}</td>
                                                                                <td className="px-4 py-3 text-right font-bold text-emerald-700 tabular-nums">{displayCurrency(amt)}</td>
                                                                                <td className="px-4 py-3 text-right">
                                                                                    <div className="flex items-center justify-end gap-2">
                                                                                        <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                                                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${totalIncomeCat > 0 ? (amt / totalIncomeCat * 100) : 0}%` }}></div>
                                                                                        </div>
                                                                                        <span className="text-xs text-gray-500 font-semibold w-10 text-right">
                                                                                            {totalIncomeCat > 0 ? (amt / totalIncomeCat * 100).toFixed(1) : 0}%
                                                                                        </span>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                    <tfoot>
                                                                        <tr className="bg-emerald-100 border-t-2 border-emerald-300">
                                                                            <td colSpan="2" className="px-4 py-3 font-extrabold text-emerald-800 text-xs uppercase tracking-wider">Total Pendapatan (Total Revenue)</td>
                                                                            <td className="px-4 py-3 text-right font-extrabold text-emerald-800 tabular-nums">{displayCurrency(totalIncomeCat)}</td>
                                                                            <td className="px-4 py-3 text-right font-bold text-emerald-700 text-xs">100%</td>
                                                                        </tr>
                                                                    </tfoot>
                                                                </table>
                                                            </div>
                                                        </div>

                                                        {/* PENGELUARAN TABLE */}
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <div className="w-3 h-3 rounded-sm bg-rose-500"></div>
                                                                <h3 className="font-extrabold text-gray-900 text-sm uppercase tracking-widest">Pengeluaran (Expenses)</h3>
                                                            </div>
                                                            <div className="rounded-xl overflow-hidden border border-gray-200">
                                                                <table className="w-full text-sm text-left">
                                                                    <thead>
                                                                        <tr className="bg-rose-600 text-white text-xs font-bold uppercase tracking-wider">
                                                                            <th className="px-4 py-3 w-8">#</th>
                                                                            <th className="px-4 py-3">Kategori (Category)</th>
                                                                            <th className="px-4 py-3 text-right">Aktual</th>
                                                                            <th className="px-4 py-3 text-right w-32">% dari Total</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-100">
                                                                        {expenseRows.length === 0 ? (
                                                                            <tr>
                                                                                <td colSpan="4" className="px-4 py-6 text-center text-gray-400 text-xs italic">Belum ada data pengeluaran untuk periode ini.</td>
                                                                            </tr>
                                                                        ) : expenseRows.map(([cat, amt], idx) => (
                                                                            <tr key={cat} className={idx % 2 === 0 ? 'bg-white' : 'bg-rose-50/40'}>
                                                                                <td className="px-4 py-3 text-gray-400 text-xs font-mono">{idx + 1}</td>
                                                                                <td className="px-4 py-3 font-semibold text-gray-800">{cat}</td>
                                                                                <td className="px-4 py-3 text-right font-bold text-rose-700 tabular-nums">{displayCurrency(amt)}</td>
                                                                                <td className="px-4 py-3 text-right">
                                                                                    <div className="flex items-center justify-end gap-2">
                                                                                        <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                                                            <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${totalExpenseCat > 0 ? (amt / totalExpenseCat * 100) : 0}%` }}></div>
                                                                                        </div>
                                                                                        <span className="text-xs text-gray-500 font-semibold w-10 text-right">
                                                                                            {totalExpenseCat > 0 ? (amt / totalExpenseCat * 100).toFixed(1) : 0}%
                                                                                        </span>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                    <tfoot>
                                                                        <tr className="bg-rose-100 border-t-2 border-rose-300">
                                                                            <td colSpan="2" className="px-4 py-3 font-extrabold text-rose-800 text-xs uppercase tracking-wider">Total Pengeluaran (Total Expenses)</td>
                                                                            <td className="px-4 py-3 text-right font-extrabold text-rose-800 tabular-nums">{displayCurrency(totalExpenseCat)}</td>
                                                                            <td className="px-4 py-3 text-right font-bold text-rose-700 text-xs">100%</td>
                                                                        </tr>
                                                                    </tfoot>
                                                                </table>
                                                            </div>
                                                        </div>

                                                        {/* RINGKASAN SALDO */}
                                                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                                                            <div className="bg-slate-700 px-4 py-3">
                                                                <h3 className="text-white font-bold text-xs uppercase tracking-widest">Ringkasan Saldo (Cashflow Summary)</h3>
                                                            </div>
                                                            <table className="w-full text-sm text-left">
                                                                <thead>
                                                                    <tr className="bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                                                                        <th className="px-4 py-2.5">Keterangan</th>
                                                                        <th className="px-4 py-2.5 text-right">Aktual</th>
                                                                        <th className="px-4 py-2.5 text-right">Status</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100">
                                                                    <tr className="bg-emerald-50/60">
                                                                        <td className="px-4 py-3 font-semibold text-gray-700">Total Pendapatan</td>
                                                                        <td className="px-4 py-3 text-right font-bold text-emerald-700 tabular-nums">{displayCurrency(totalIncomeCat)}</td>
                                                                        <td className="px-4 py-3 text-right"><span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold">+ Inflow</span></td>
                                                                    </tr>
                                                                    <tr className="bg-rose-50/60">
                                                                        <td className="px-4 py-3 font-semibold text-gray-700">Total Pengeluaran</td>
                                                                        <td className="px-4 py-3 text-right font-bold text-rose-700 tabular-nums">{displayCurrency(totalExpenseCat)}</td>
                                                                        <td className="px-4 py-3 text-right"><span className="text-xs px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full font-bold">- Outflow</span></td>
                                                                    </tr>
                                                                    <tr className={saldo >= 0 ? 'bg-blue-50' : 'bg-amber-50'}>
                                                                        <td className="px-4 py-3 font-extrabold text-gray-900">SALDO BERSIH</td>
                                                                        <td className={`px-4 py-3 text-right font-extrabold tabular-nums text-base ${saldo >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>{displayCurrency(saldo)}</td>
                                                                        <td className="px-4 py-3 text-right">
                                                                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${saldo >= 0 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                                {saldo >= 0 ? '✓ Surplus' : '⚠ Deficit'}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>

                                                        {/* Detail Transaksi Preview */}
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-3 mt-4">
                                                                <div className="w-3 h-3 rounded-sm bg-slate-500"></div>
                                                                <h3 className="font-extrabold text-gray-900 text-sm uppercase tracking-widest">Histori Transaksi (Transaction History)</h3>
                                                            </div>
                                                            <div className="rounded-xl overflow-hidden border border-gray-200">
                                                                <table className="w-full text-sm text-left">
                                                                    <thead>
                                                                        <tr className="bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
                                                                            <th className="px-4 py-3">Tanggal</th>
                                                                            <th className="px-4 py-3">Tipe</th>
                                                                            <th className="px-4 py-3">Kategori</th>
                                                                            <th className="px-4 py-3">Keterangan</th>
                                                                            <th className="px-4 py-3 text-right">Jumlah</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-100">
                                                                        {filteredTransactions.length === 0 ? (
                                                                            <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400 text-xs italic">Tidak ada data untuk periode ini.</td></tr>
                                                                        ) : filteredTransactions.slice(0, 15).map((t, idx) => (
                                                                            <tr key={t.id} className={idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-slate-50/50 hover:bg-slate-100/50'}>
                                                                                <td className="px-4 py-3 text-gray-600 text-xs tabular-nums">{displayDate(t.date)}</td>
                                                                                <td className="px-4 py-3">
                                                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${t.type === 'pemasukan' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                                                        {t.type === 'pemasukan' ? (currency === 'USD' ? 'Income' : 'Masuk') : (currency === 'USD' ? 'Expense' : 'Keluar')}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-4 py-3 font-semibold text-gray-800">{capitalizeText(t.category)}</td>
                                                                                <td className="px-4 py-3 text-gray-500 truncate max-w-xs">{(t.description && t.description !== '-') ? t.description : '—'}</td>
                                                                                <td className={`px-4 py-3 text-right font-bold tabular-nums ${t.type === 'pemasukan' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                                                    {t.type === 'pemasukan' ? '+' : '-'} {displayCurrency(t.amount)}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                                {filteredTransactions.length > 15 && (
                                                                    <div className="bg-slate-50 p-3 text-center border-t border-gray-200">
                                                                        <span className="text-xs text-gray-500 italic">Menampilkan 15 transaksi terbaru...</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {activeTab === 'profile' && (
                                     <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl p-8 shadow-sm shadow-gray-100">
                                         <h2 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-200 pb-4">
                                             Pengaturan Profil
                                         </h2>

                                         {profileMessage && (
                                             <div className="mb-6 p-4 rounded-lg border border-blue-100 bg-blue-50 text-blue-700 text-sm flex items-center gap-2">
                                                 <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                                 {profileMessage}
                                             </div>
                                         )}

                                         <form onSubmit={handleUpdateProfile} className="space-y-6">
                                             <div>
                                                 <label htmlFor="profile-email" className="block text-sm font-medium text-gray-700 mb-2">Email Akun</label>
                                                 <input id="profile-email" type="text" value={profileData.email} disabled className="w-full bg-gray-100 border border-gray-200 text-gray-600 rounded-lg p-3 text-sm cursor-not-allowed" />
                                                 <p className="text-xs text-gray-500 mt-1">Email tidak dapat diubah.</p>
                                             </div>
                                             <div>
                                                 <label htmlFor="profile-fullname" className="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap</label>
                                                 <input id="profile-fullname" type="text" value={profileData.fullName} onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })} className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition" />
                                             </div>
                                             <div>
                                                 <label htmlFor="profile-newpassword" className="block text-sm font-medium text-gray-700 mb-2">Password Baru</label>
                                                 <input id="profile-newpassword" type="password" value={profileData.newPassword} onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })} placeholder="Biarkan kosong jika tidak ingin mengganti" className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition" />
                                             </div>
                                             <div className="pt-4">
                                                 <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 w-full md:w-auto">
                                                     Simpan Perubahan
                                                 </button>
                                             </div>
                                         </form>
                                     </div>
                                 )}

                                 {activeTab === 'subscriptions' && (
                                     <AdminSubscriptionCenter
                                         user={user}
                                         isAdminUtama={isAdminUtama}
                                         allSubscriptions={allSubscriptions}
                                         allOrders={allOrders}
                                         loading={loading}
                                         onRefresh={loadInitialData}
                                         onConfirmPayment={handleConfirmPayment}
                                         onCancelOrder={handleCancelOrder}
                                         onRevokePremium={handleRevokePremium}
                                         onOpenGrantModal={handleOpenEditUserModal}
                                         onDeleteUser={handleDeleteUser}
                                         isConfirmingOrder={isConfirmingOrder}
                                     />
                                 )}

                                     </motion.div>
                                 </AnimatePresence>
                             </>
                        )}
                    </div>
                </main>
            </div>

            {/* Admin Edit & Manage User Modal */}
            {isEditUserModalOpen && (
                 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                     <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative border border-gray-100 max-h-[95vh] overflow-y-auto">
                         <button
                             onClick={() => setIsEditUserModalOpen(false)}
                             className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition"
                         >
                             <X className="w-5 h-5" />
                         </button>

                         <div className="flex items-center gap-3 mb-2">
                             <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
                                 <Edit2 className="w-5 h-5" />
                             </div>
                             <div>
                                 <h3 className="text-xl font-black text-gray-900">
                                     Edit Data & Paket Pengguna
                                 </h3>
                                 <p className="text-xs text-gray-500">
                                     Atur email, paket langganan, status, dan masa berlaku pengguna
                                 </p>
                             </div>
                         </div>

                         <form onSubmit={handleSaveEditUser} className="space-y-4 mt-6">
                             <div>
                                 <label className="block text-xs font-bold text-gray-700 mb-1">User ID Target (UUID)</label>
                                 <input
                                     type="text"
                                     required
                                     value={editUserForm.userId}
                                     onChange={(e) => setEditUserForm({ ...editUserForm, userId: e.target.value })}
                                     placeholder="Masukkan UUID User"
                                     className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                 />
                             </div>

                             <div>
                                 <label className="block text-xs font-bold text-gray-700 mb-1">Email Pengguna</label>
                                 <input
                                     type="email"
                                     value={editUserForm.userEmail}
                                     onChange={(e) => setEditUserForm({ ...editUserForm, userEmail: e.target.value })}
                                     placeholder="user@example.com"
                                     className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                 />
                             </div>

                             <div className="grid grid-cols-2 gap-3">
                                 <div>
                                     <label className="block text-xs font-bold text-gray-700 mb-1">Pilihan Paket</label>
                                     <select
                                         value={editUserForm.planCode}
                                         onChange={(e) => {
                                             const plan = e.target.value;
                                             let newEnd = editUserForm.subscriptionEnd;
                                             if (plan === 'PREMIUM_MONTHLY') {
                                                 const d = new Date();
                                                 d.setDate(d.getDate() + 30);
                                                 newEnd = d.toISOString().split('T')[0];
                                             } else if (plan === 'PREMIUM_YEARLY') {
                                                 const d = new Date();
                                                 d.setDate(d.getDate() + 365);
                                                 newEnd = d.toISOString().split('T')[0];
                                             } else if (plan === 'PREMIUM_LIFETIME' || plan === 'FREE') {
                                                 newEnd = '';
                                             }
                                             setEditUserForm({
                                                 ...editUserForm,
                                                 planCode: plan,
                                                 subscriptionStatus: plan === 'FREE' ? 'FREE' : 'ACTIVE',
                                                 subscriptionEnd: newEnd
                                             });
                                         }}
                                         className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                     >
                                         <option value="FREE">FREE (Gratis)</option>
                                         <option value="PREMIUM_MONTHLY">Premium 1 Bulan (30 Hari)</option>
                                         <option value="PREMIUM_YEARLY">Premium 1 Tahun (365 Hari)</option>
                                         <option value="PREMIUM_LIFETIME">Premium Unlimited (Lifetime)</option>
                                     </select>
                                 </div>

                                 <div>
                                     <label className="block text-xs font-bold text-gray-700 mb-1">Status Langganan</label>
                                     <select
                                         value={editUserForm.subscriptionStatus}
                                         onChange={(e) => setEditUserForm({ ...editUserForm, subscriptionStatus: e.target.value })}
                                         className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                     >
                                         <option value="ACTIVE">ACTIVE (Aktif)</option>
                                         <option value="FREE">FREE (Biasa)</option>
                                         <option value="EXPIRED">EXPIRED (Kadaluarsa)</option>
                                     </select>
                                 </div>
                             </div>

                             {editUserForm.planCode !== 'PREMIUM_LIFETIME' && (
                                 <div>
                                     <label className="block text-xs font-bold text-gray-700 mb-1">Masa Berlaku Sampai Tanggal</label>
                                     <input
                                         type="date"
                                         value={editUserForm.subscriptionEnd}
                                         onChange={(e) => setEditUserForm({ ...editUserForm, subscriptionEnd: e.target.value })}
                                         className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                     />
                                 </div>
                             )}

                             <div>
                                 <label className="block text-xs font-bold text-gray-700 mb-1">Catatan Admin (Opsional)</label>
                                 <textarea
                                     rows={2}
                                     value={editUserForm.note}
                                     onChange={(e) => setEditUserForm({ ...editUserForm, note: e.target.value })}
                                     placeholder="Alasan perubahan atau catatan..."
                                     className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                 />
                             </div>

                             <div className="pt-2 flex gap-3">
                                 <button
                                     type="button"
                                     onClick={() => setIsEditUserModalOpen(false)}
                                     className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
                                 >
                                     Batal
                                 </button>
                                 <button
                                     type="submit"
                                     disabled={isSubmitting}
                                     className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                                 >
                                     {isSubmitting ? (
                                         <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                     ) : (
                                         <>
                                             <Save className="w-3.5 h-3.5" />
                                             Simpan Perubahan
                                         </>
                                     )}
                                 </button>
                             </div>
                         </form>
                     </div>
                 </div>
            )}

             {/* Limit Exceeded Modal */}
             {limitModal && (
                 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                     <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl relative border border-gray-100">
                         <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                             <AlertCircle className="w-8 h-8" />
                         </div>
                         <h3 className="text-xl font-bold text-gray-900 mb-2">{limitModal.title}</h3>
                         <p className="text-xs text-gray-600 mb-6 leading-relaxed">{limitModal.message}</p>
                         
                         <div className="flex gap-3">
                             <button
                                 onClick={() => setLimitModal(null)}
                                 className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
                             >
                                 Tutup
                             </button>
                             <Link
                                 to="/pricing"
                                 className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center"
                             >
                                 Upgrade Premium
                             </Link>
                         </div>
                     </div>
                 </div>
             )}

            {/* Toast System Rendering */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className={`fixed bottom-6 right-6 z-[100] px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border font-medium text-sm ${
                            toast.type === 'error'
                                ? 'bg-white text-rose-600 border-rose-100 shadow-xl shadow-gray-200/50'
                                : 'bg-white text-blue-700 border-blue-100 shadow-xl shadow-gray-200/50'
                        }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${toast.type === 'error' ? 'bg-rose-500' : 'bg-blue-500 animate-ping'}`} />
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;
