import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
    fetchTransactions, 
    createTransaction, 
    createBulkTransactions, 
    deleteTransaction, 
    updateTransaction, 
    deleteAllTransactions 
} from '../lib/api';
import { 
    Trash2, Upload, Award, Printer, Download, Target 
} from 'lucide-react';
import { formatCurrency, formatDate, normalizeCategory, formatNumberInput } from '../utils/format';
import { scanReceiptImage } from '../utils/receiptScanner';
import { useLanguage } from '../hooks/useLanguage';
import { usePageTitle } from '../hooks/usePageTitle';
import { 
    getUserSubscriptionStatus, 
    checkFeatureAccess, 
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
import { fetchUserBudgets, saveCategoryBudget, deleteCategoryBudget } from '../utils/budgetEngine';
import { exportToPdf } from '../utils/pdfExport';
import { exportTransactionsToExcel, parseExcelTransactions } from '../utils/excelEngine';
import { validateTransaction } from '../schemas/transactionSchema';
import { parseSafeDate } from '../utils/calculations';

// Modular Sub-components (Conforming to HANDBOOK_CLEANCODE.md Section 4.1)
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar';
import { TransactionStatsCards } from '../components/dashboard/TransactionStatsCards';
import { TransactionFilterBar } from '../components/dashboard/TransactionFilterBar';
import { TransactionForm } from '../components/dashboard/TransactionForm';
import { TransactionTable } from '../components/dashboard/TransactionTable';
import { DashboardCharts } from '../components/dashboard/DashboardCharts';
import { FinancialReportsView } from '../components/dashboard/FinancialReportsView';
import { DashboardAdminUserTable } from '../components/dashboard/DashboardAdminUserTable';
import { EditUserModal } from '../components/dashboard/EditUserModal';
import { LimitModal } from '../components/dashboard/LimitModal';
import { ProfileSettingsView } from '../components/dashboard/ProfileSettingsView';
import { BudgetManager } from '../components/BudgetManager';
import { AdminSubscriptionCenter } from '../components/AdminSubscriptionCenter';

import { motion, AnimatePresence } from 'framer-motion';
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

const AdminDashboard = () => {
    const { t, lang } = useLanguage();
    usePageTitle('adminDashboard');

    // Navigation & View States
    const [activeTab, setActiveTab] = useState('dashboard');
    const [activePeriod, setActivePeriod] = useState('month');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());

    // Financial Data States
    const [transactions, setTransactions] = useState([]);
    const [budgets, setBudgets] = useState({});
    const [currency, setCurrency] = useState(() => localStorage.getItem('keuangan_currency') || 'IDR');
    const [exchangeRate] = useState(16200);

    // Form States
    const [editingId, setEditingId] = useState(null);
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [formData, setFormData] = useState({
        type: 'pengeluaran',
        category: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
    });

    // Receipt Scanner State
    const [isScanningReceipt, setIsScanningReceipt] = useState(false);
    const [scanProgress, setScanProgress] = useState('');

    // Feedback & Modals
    const [toast, setToast] = useState(null);
    const [limitModal, setLimitModal] = useState(null);

    // Auth & Subscription States
    const [user, setUser] = useState(null);
    const [userSub, setUserSub] = useState(null);
    const [usageLimits, setUsageLimits] = useState(DEFAULT_LIMITS);
    const [plans, setPlans] = useState(DEFAULT_PLANS);
    const [allSubscriptions, setAllSubscriptions] = useState([]);
    const [allOrders, setAllOrders] = useState([]);
    const [isConfirmingOrder, setIsConfirmingOrder] = useState(null);

    // Super Admin Edit User Modal
    const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
    const [editUserForm, setEditUserForm] = useState({
        userId: '',
        userEmail: '',
        planCode: 'FREE',
        subscriptionStatus: 'FREE',
        subscriptionEnd: '',
        note: ''
    });

    // Profile Settings
    const [profileData, setProfileData] = useState({ email: '', fullName: '', newPassword: '' });
    const [profileMessage, setProfileMessage] = useState('');

    // File input refs
    const fileInputRef = useRef(null);
    const receiptInputRef = useRef(null);

    const isAdminUtama = isSuperAdmin(user?.email);

    // Helpers
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSetCurrency = (newCurr) => {
        setCurrency(newCurr);
        localStorage.setItem('keuangan_currency', newCurr);
    };

    const displayCurrency = (amount) => {
        const num = Number(amount) || 0;
        if (currency === 'USD') {
            const usd = num / exchangeRate;
            return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return `Rp ${num.toLocaleString('id-ID')}`;
    };

    const displayDate = (dateString) => {
        if (!dateString) return '-';
        const d = parseSafeDate(dateString);
        return d.toLocaleDateString(currency === 'USD' ? 'en-US' : 'id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getCategoryLabel = (cat) => {
        if (!cat) return '-';
        const raw = cat.toLowerCase();
        return t(`categories.${raw}`) || (cat.charAt(0).toUpperCase() + cat.slice(1));
    };

    const getWeekdayLabel = (dateString, isShort = false) => {
        if (!dateString) return '';
        const d = parseSafeDate(dateString);
        return d.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
            weekday: isShort ? 'short' : 'long'
        });
    };

    const userTimezoneLabel = (() => {
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
            if (currency === 'USD') {
                return tz.replace('_', ' ');
            }
            if (tz.includes('Makassar') || tz.includes('Ujung_Pandang')) return 'WITA';
            if (tz.includes('Jayapura')) return 'WIT';
            return 'WIB';
        } catch {
            return currency === 'USD' ? 'UTC' : 'WIB';
        }
    })();

    // Initial Data Loader
    const loadInitialData = async () => {
        setLoading(true);
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                window.location.href = '/admin-login';
                return;
            }
            setUser(authUser);
            setProfileData({
                email: authUser.email || '',
                fullName: authUser.user_metadata?.full_name || '',
                newPassword: ''
            });

            const txData = await fetchTransactions();
            setTransactions(Array.isArray(txData) ? txData : []);

            const [subStatus, activePlans, limits, budgetMap] = await Promise.all([
                getUserSubscriptionStatus(authUser.id),
                fetchPlans(),
                fetchUsageLimits(),
                fetchUserBudgets(authUser.id)
            ]);

            setUserSub(subStatus);
            setPlans(activePlans);
            setUsageLimits(limits);
            setBudgets(budgetMap);

            if (isSuperAdmin(authUser.email)) {
                const adminData = await fetchAdminData();
                setAllSubscriptions(adminData.subscriptions || []);
                setAllOrders(adminData.orders || []);
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
            showToast('Gagal memuat data.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInitialData();
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Transaction Form Handlers
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const rawDigits = Number(formData.amount.toString().replace(/\D/g, '')) || 0;
        const amountCleaned = currency === 'USD' ? Math.round(rawDigits * exchangeRate) : rawDigits;

        const rawDataToValidate = {
            type: formData.type,
            category: (isCustomCategory && formData.category.trim() !== '')
                ? formData.category.trim()
                : normalizeCategory(formData.category.trim(), formData.type, isCustomCategory),
            amount: amountCleaned,
            date: formData.date,
            description: formData.description ? formData.description.trim().toLowerCase() : ''
        };

        // Zod validation per clean code handbook
        const validation = validateTransaction(rawDataToValidate);
        if (!validation.success) {
            showToast(validation.error || 'Data transaksi tidak valid.', 'error');
            return;
        }

        if (!editingId) {
            const access = await checkFeatureAccess(user, 'transaction', transactions.length);
            if (!access.allowed) {
                setLimitModal({
                    title: lang === 'en' ? 'Monthly Transaction Limit Exceeded' : 'Batas Transaksi Bulanan Terlampaui',
                    message: t('limits.transactionLimit', { limit: access.limit }) || `Pengguna FREE memiliki batas ${access.limit} transaksi per bulan. Upgrade ke Paket Premium untuk transaksi tanpa batas!`
                });
                return;
            }
        }

        setIsSubmitting(true);
        try {
            if (editingId) {
                await updateTransaction(editingId, validation.data);
                showToast('Transaksi berhasil diperbarui!');
            } else {
                await createTransaction(validation.data);
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
            const freshData = await fetchTransactions();
            setTransactions(Array.isArray(freshData) ? freshData : []);
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

    const handleEdit = (tx) => {
        if (!tx) return;
        setActiveTab('transactions');
        setEditingId(tx.id);
        setFormData({
            type: tx.type,
            category: tx.category || '',
            amount: formatNumberInput(currency === 'USD' ? Math.round(Number(tx.amount) / exchangeRate) : tx.amount) || '',
            description: tx.description || '',
            date: tx.date || new Date().toISOString().split('T')[0]
        });
        setIsCustomCategory(!CATEGORIES_MAP[tx.category?.toLowerCase()]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) return;
        try {
            await deleteTransaction(id);
            setTransactions(prev => prev.filter(t => t.id !== id));
            showToast('Transaksi berhasil dihapus.');
        } catch (error) {
            console.error('Error deleting transaction:', error);
            showToast('Gagal menghapus transaksi.', 'error');
        }
    };

    const handleDeleteAllTransactions = async () => {
        if (!window.confirm('PERINGATAN: Seluruh riwayat transaksi Anda akan dihapus permanen! Lanjutkan?')) return;
        setIsSubmitting(true);
        try {
            await deleteAllTransactions();
            setTransactions([]);
            showToast('Seluruh riwayat transaksi berhasil dibersihkan.');
        } catch (error) {
            console.error('Error deleting all transactions:', error);
            showToast('Gagal menghapus data transaksi.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Receipt OCR Upload
    const handleReceiptPhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsScanningReceipt(true);
        setScanProgress('Mempersiapkan OCR...');
        try {
            const scanResult = await scanReceiptImage(file, (p) => setScanProgress(p));
            if (scanResult.success) {
                const amountVal = scanResult.totalAmount || scanResult.estimatedAmount || 0;
                setFormData(prev => ({
                    ...prev,
                    type: 'pengeluaran',
                    amount: amountVal > 0 ? formatNumberInput(currency === 'USD' ? Math.round(amountVal / exchangeRate) : amountVal) : prev.amount,
                    date: scanResult.date || prev.date,
                    category: scanResult.category || 'belanja',
                    description: scanResult.merchantName ? `Struk: ${scanResult.merchantName}` : prev.description
                }));
                showToast(`Nota terdeteksi! Kategori: ${scanResult.category || 'Belanja'}`);
            } else {
                showToast('Tidak dapat mendeteksi total nota secara akurat.', 'error');
            }
        } catch (error) {
            console.error('Error OCR receipt scan:', error);
            showToast('Gagal memindai nota.', 'error');
        } finally {
            setIsScanningReceipt(false);
            setScanProgress('');
            e.target.value = null;
        }
    };

    // Budget Engine Handlers
    const handleSaveBudget = async (category, limit) => {
        if (!user) return;
        await saveCategoryBudget(user.id, category, limit);
        const updated = await fetchUserBudgets(user.id);
        setBudgets(updated);
    };

    const handleDeleteBudget = async (category) => {
        if (!user) return;
        await deleteCategoryBudget(user.id, category);
        const updated = await fetchUserBudgets(user.id);
        setBudgets(updated);
    };

    // Excel Export & Import
    const handleExportExcel = async () => {
        try {
            const currentMonthKey = new Date().toISOString().slice(0, 7);
            const exportStorageKey = `keuangan_export_count_${user?.id || 'anon'}_${currentMonthKey}`;
            const currentExports = parseInt(localStorage.getItem(exportStorageKey) || '0', 10);

            const access = await checkFeatureAccess(user, 'export', currentExports);
            if (!access.allowed) {
                setLimitModal({
                    title: lang === 'en' ? 'Monthly Export Limit Exceeded' : 'Batas Ekspor Excel Terlampaui',
                    message: t('limits.exportLimit', { limit: access.limit }) || `Pengguna FREE memiliki batas ${access.limit} ekspor per bulan. Upgrade ke Paket Premium untuk ekspor tanpa batas!`
                });
                return;
            }

            await exportTransactionsToExcel({
                transactions: filteredTransactions,
                currency,
                exchangeRate,
                userEmail: user?.email || 'admin@keuangan.id',
                displayDateFn: displayDate,
                ChartJS
            });

            localStorage.setItem(exportStorageKey, (currentExports + 1).toString());
            showToast(t('export.success') || 'Laporan Excel berhasil diekspor!');
        } catch (error) {
            console.error('Error exporting to excel:', error);
            showToast(t('export.failed') || 'Gagal mengekspor laporan excel.', 'error');
        }
    };

    const handleUploadExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsSubmitting(true);
        try {
            const { transactionsToImport, skippedCount } = await parseExcelTransactions({
                file,
                existingTransactions: transactions,
                currency,
                exchangeRate
            });

            if (transactionsToImport.length === 0) {
                if (skippedCount > 0) {
                    showToast(`Semua (${skippedCount}) transaksi di file Excel sudah ada di sistem (duplikat diabaikan).`, 'error');
                } else {
                    showToast('Tidak ada transaksi valid yang ditemukan dalam file.', 'error');
                }
                return;
            }

            await createBulkTransactions(transactionsToImport);
            const fresh = await fetchTransactions();
            setTransactions(Array.isArray(fresh) ? fresh : []);

            let msg = `Berhasil mengimpor ${transactionsToImport.length} transaksi!`;
            if (skippedCount > 0) msg += ` (${skippedCount} duplikat diabaikan)`;
            showToast(msg);
        } catch (error) {
            console.error('Error importing excel:', error);
            showToast('Gagal memproses file Excel.', 'error');
        } finally {
            setIsSubmitting(false);
            e.target.value = null;
        }
    };

    const handleExportPdf = async () => {
        if (!filteredTransactions || filteredTransactions.length === 0) {
            showToast('Tidak ada transaksi untuk diekspor ke PDF.', 'error');
            return;
        }
        setIsExportingPdf(true);
        try {
            await exportToPdf({
                transactions: filteredTransactions,
                currency,
                exchangeRate,
                activePeriod,
                userEmail: user?.email || 'admin@keuangan.id'
            });
            showToast('Laporan PDF berhasil diunduh!');
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            showToast('Gagal membuat laporan PDF.', 'error');
        } finally {
            setIsExportingPdf(false);
        }
    };

    // Super Admin Order & Subscription Handlers
    const handleConfirmPayment = async (orderId) => {
        setIsConfirmingOrder(orderId);
        try {
            const result = await adminConfirmPayment(orderId, user?.id);
            if (result.success) {
                showToast('Pembayaran berhasil dikonfirmasi! Langganan user telah diaktifkan.');
                const adminData = await fetchAdminData();
                setAllSubscriptions(adminData.subscriptions || []);
                setAllOrders(adminData.orders || []);
            } else {
                showToast(result.error || 'Gagal mengonfirmasi pembayaran.', 'error');
            }
        } catch (err) {
            console.error('Error confirming payment:', err);
            showToast('Terjadi kesalahan.', 'error');
        } finally {
            setIsConfirmingOrder(null);
        }
    };

    const handleCancelOrder = async (orderId) => {
        if (!window.confirm('Tolak pesanan ini?')) return;
        try {
            const result = await adminCancelPayment(orderId, 'Ditolak oleh admin');
            if (result.success) {
                showToast('Pesanan berhasil dibatalkan.');
                const adminData = await fetchAdminData();
                setAllOrders(adminData.orders || []);
            } else {
                showToast(result.error || 'Gagal membatalkan pesanan.', 'error');
            }
        } catch (err) {
            console.error('Error cancelling order:', err);
            showToast('Terjadi kesalahan.', 'error');
        }
    };

    const handleRevokePremium = async (userId, userEmail) => {
        if (!window.confirm(`Cabut status Premium dari ${userEmail}?`)) return;
        try {
            const result = await adminRevokePremium(userId);
            if (result.success) {
                showToast(`Status Premium ${userEmail} berhasil dicabut.`);
                const adminData = await fetchAdminData();
                setAllSubscriptions(adminData.subscriptions || []);
            } else {
                showToast(result.error || 'Gagal mencabut langganan.', 'error');
            }
        } catch (err) {
            console.error('Error revoking premium:', err);
            showToast('Terjadi kesalahan.', 'error');
        }
    };

    const handleOpenEditUserModal = (targetUser) => {
        if (targetUser) {
            setEditUserForm({
                userId: targetUser.user_id || '',
                userEmail: targetUser.user_email || '',
                planCode: targetUser.plan_code || 'FREE',
                subscriptionStatus: targetUser.subscription_status || 'FREE',
                subscriptionEnd: targetUser.subscription_end ? targetUser.subscription_end.split('T')[0] : '',
                note: ''
            });
        } else {
            setEditUserForm({
                userId: '',
                userEmail: '',
                planCode: 'PREMIUM_MONTHLY',
                subscriptionStatus: 'ACTIVE',
                subscriptionEnd: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                note: 'Diberikan langsung oleh Super Admin'
            });
        }
        setIsEditUserModalOpen(true);
    };

    const handleSaveEditUser = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const result = await adminEditUserSubscription({
                userId: editUserForm.userId,
                userEmail: editUserForm.userEmail,
                planCode: editUserForm.planCode,
                subscriptionStatus: editUserForm.subscriptionStatus,
                subscriptionEnd: editUserForm.subscriptionEnd || null,
                note: editUserForm.note
            });
            if (result.success) {
                showToast('Data langganan user berhasil diperbarui!');
                setIsEditUserModalOpen(false);
                const adminData = await fetchAdminData();
                setAllSubscriptions(adminData.subscriptions || []);
            } else {
                showToast(result.error || 'Gagal menyimpan data user.', 'error');
            }
        } catch (err) {
            console.error('Error saving user edit:', err);
            showToast('Terjadi kesalahan.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async (userId, userEmail) => {
        if (!window.confirm(`PERINGATAN KERAS: Hapus akun ${userEmail} dan seluruh riwayatnya?`)) return;
        try {
            const result = await adminDeleteUserSubscription(userId);
            if (result.success) {
                showToast(`User ${userEmail} berhasil dihapus.`);
                const adminData = await fetchAdminData();
                setAllSubscriptions(adminData.subscriptions || []);
            } else {
                showToast(result.error || 'Gagal menghapus user.', 'error');
            }
        } catch (err) {
            console.error('Error deleting user:', err);
            showToast('Terjadi kesalahan.', 'error');
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            const updates = { data: { full_name: profileData.fullName } };
            if (profileData.newPassword) updates.password = profileData.newPassword;
            const { error } = await supabase.auth.updateUser(updates);
            if (error) throw error;
            setProfileMessage('Profil berhasil diperbarui.');
            setTimeout(() => setProfileMessage(''), 3000);
        } catch (error) {
            console.error('Error updating profile:', error);
            setProfileMessage('Gagal memperbarui profil: ' + error.message);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/admin-login';
    };

    // Filter Logic
    const filteredTransactions = transactions.filter(tx => {
        const matchesSearch = (tx.category?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (tx.description?.toLowerCase() || "").includes(searchTerm.toLowerCase());

        const tDate = parseSafeDate(tx.date);
        const now = new Date();

        let matchesPeriod = true;
        if (activePeriod === 'week') {
            const startOfWeek = new Date(now);
            const day = now.getDay() || 7;
            startOfWeek.setDate(now.getDate() - day + 1);
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
    const totalIncome = filteredTransactions
        .filter(tx => tx.type === 'pemasukan')
        .reduce((acc, tx) => acc + Number(tx.amount), 0);
    const totalExpense = filteredTransactions
        .filter(tx => tx.type === 'pengeluaran')
        .reduce((acc, tx) => acc + Number(tx.amount), 0);
    const balance = totalIncome - totalExpense;

    // Line Chart Aggregation
    const aggregatedFlow = {};
    filteredTransactions.forEach(tx => {
        const dateStr = formatDate(tx.date);
        const amount = Number(tx.amount);
        const net = tx.type === 'pemasukan' ? amount : -amount;
        aggregatedFlow[dateStr] = (aggregatedFlow[dateStr] || 0) + net;
    });

    const distinctDates = [];
    filteredTransactions.forEach(tx => {
        const dateStr = formatDate(tx.date);
        if (!distinctDates.includes(dateStr)) distinctDates.push(dateStr);
    });

    const chartDates = distinctDates.slice(0, 7).reverse();
    const chartNetFlows = chartDates.map(d => aggregatedFlow[d] || 0);

    const chartData = {
        labels: chartDates.length > 0 ? chartDates : [t('public.noExpenseData') || 'Belum Ada Data'],
        datasets: [{
            label: t('public.netCashflow') || 'Arus Kas Bersih',
            data: chartNetFlows.length > 0 ? chartNetFlows : [0],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.06)',
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6
        }]
    };

    // Doughnut Chart Data
    const expenseByCategory = {};
    filteredTransactions.forEach(tx => {
        if (tx.type === 'pengeluaran') {
            const category = normalizeCategory(tx.category, tx.type);
            expenseByCategory[category] = (expenseByCategory[category] || 0) + Number(tx.amount);
        }
    });

    const doughnutLabels = Object.keys(expenseByCategory).map(cat => getCategoryLabel(cat));
    const doughnutData = Object.values(expenseByCategory);
    const sortedCategories = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);
    const totalExpenseAmount = sortedCategories.reduce((acc, curr) => acc + curr[1], 0);

    const topCategories = [];
    let otherSum = 0;
    sortedCategories.forEach(([cat, amount], idx) => {
        if (idx < 4) topCategories.push({ category: cat, amount });
        else otherSum += amount;
    });
    if (otherSum > 0) topCategories.push({ category: 'lainnya', amount: otherSum });

    const colorPalette = [
        '#6366f1', '#3b82f6', '#f59e0b', '#8b5cf6',
        '#ec4899', '#ef4444', '#06b6d4', '#6b7280',
    ];

    const categoryChartData = {
        labels: doughnutLabels.length > 0 ? doughnutLabels : ['Tidak Ada Pengeluaran'],
        datasets: [{
            data: doughnutData.length > 0 ? doughnutData : [1],
            backgroundColor: doughnutData.length > 0 ? [
                'rgba(99, 102, 241, 0.7)', 'rgba(59, 130, 246, 0.7)',
                'rgba(245, 158, 11, 0.7)', 'rgba(139, 92, 246, 0.7)',
                'rgba(236, 72, 153, 0.7)', 'rgba(239, 68, 68, 0.7)',
                'rgba(6, 182, 212, 0.7)', 'rgba(107, 114, 128, 0.7)'
            ] : ['rgba(48, 54, 61, 0.5)'],
            borderColor: doughnutData.length > 0 ? [
                '#6366f1', '#3b82f6', '#f59e0b', '#8b5cf6',
                '#ec4899', '#ef4444', '#06b6d4', '#6b7280'
            ] : ['#30363d'],
            borderWidth: 1,
        }]
    };

    const categoryChartOptions = {
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
                            return `${sign}$${absUsd >= 1000 ? (absUsd / 1000).toFixed(1) + 'k' : absUsd.toFixed(0)}`;
                        }
                        const absVal = Math.abs(Number(val));
                        const sign = Number(val) < 0 ? '-' : '';
                        return `${sign}Rp ${absVal >= 1000000 ? (absVal / 1000000).toFixed(1) + 'jt' : absVal >= 1000 ? (absVal / 1000).toFixed(0) + 'rb' : absVal}`;
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

    return (
        <div className="min-h-screen bg-gray-50/60 text-gray-800 font-sans selection:bg-blue-100 selection:text-blue-900">
            {/* Top Navigation Bar */}
            <DashboardHeader
                user={user}
                isAdminUtama={isAdminUtama}
                currency={currency}
                onSetCurrency={handleSetCurrency}
                userTimezoneLabel={userTimezoneLabel}
                currentTime={currentTime}
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                onLogout={handleLogout}
                t={t}
                lang={lang}
            />

            {/* Layout Container */}
            <div className="pt-16 flex min-h-screen relative overflow-hidden">
                {/* Navigation Sidebar */}
                <DashboardSidebar
                    activeTab={activeTab}
                    onSelectTab={setActiveTab}
                    isSidebarOpen={isSidebarOpen}
                    onCloseSidebar={() => setIsSidebarOpen(false)}
                    isAdminUtama={isAdminUtama}
                    pendingOrdersCount={allOrders.filter(o => o.status === 'PENDING').length}
                    t={t}
                />

                {/* Main Content Area */}
                <main className="flex-1 bg-gray-50/60 p-4 md:p-8">
                    <div className="max-w-6xl mx-auto space-y-8">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center min-h-[400px]">
                                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                                <p className="text-gray-500 animate-pulse text-sm font-medium">{t('admin.loadingDashboard')}</p>
                            </div>
                        ) : (
                            <>
                                {/* Page Header Bar */}
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200/80 pb-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                {t('admin.workspace')}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-mono font-medium">
                                                CURRENCY: {currency}
                                            </span>
                                        </div>
                                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                                            {{
                                                dashboard: 'Dashboard Overview & Analytics',
                                                transactions: 'Transaction Ledger & Records',
                                                budgets: 'Monthly Budget Planning & Category Limits',
                                                reports: 'Financial Statements & Reports',
                                                subscriptions: 'Subscription Center & Access Control',
                                                profile: 'Account & Security Settings'
                                            }[activeTab]}
                                        </h2>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {{
                                                dashboard: 'Pantau arus kas real-time, grafik tren likuiditas, dan rincian alokasi belanja.',
                                                transactions: 'Pencatatan mutasi transaksi, filter tanggal, dan sinkronisasi laporan.',
                                                budgets: 'Kendalikan pengeluaran bulanan Anda dengan menentukan batas anggaran per kategori.',
                                                reports: 'Analisis mendalam dan cetak lembar kerja keuangan standar.',
                                                subscriptions: 'Kelola status langganan pengguna, kuota, dan hak akses admin.',
                                                profile: 'Perbarui informasi identitas profil dan keamanan kata sandi akun.'
                                            }[activeTab]}
                                        </p>
                                    </div>

                                    {activeTab === 'subscriptions' && isAdminUtama && (
                                        <button
                                            onClick={() => handleOpenEditUserModal(null)}
                                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-sm font-bold rounded-lg hover:from-amber-600 hover:to-amber-700 transition shadow-lg shadow-amber-500/20"
                                        >
                                            <Award className="w-4 h-4" />
                                            + Berikan Premium (Admin)
                                        </button>
                                    )}

                                    {activeTab === 'reports' && (
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <button
                                                onClick={handleExportPdf}
                                                disabled={isExportingPdf}
                                                className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-lg hover:bg-rose-700 transition shadow-lg shadow-rose-600/20 disabled:opacity-50"
                                            >
                                                <Printer className="w-4 h-4" />
                                                <span>{isExportingPdf ? 'Mencetak...' : 'Cetak / Unduh PDF'}</span>
                                            </button>
                                            <button
                                                onClick={handleExportExcel}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
                                            >
                                                <Download className="w-4 h-4" />
                                                Download Excel
                                            </button>
                                        </div>
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
                                        {/* TAB 1: DASHBOARD OVERVIEW */}
                                        {activeTab === 'dashboard' && (
                                            <div className="space-y-6">
                                                <TransactionFilterBar
                                                    activePeriod={activePeriod}
                                                    onSelectPeriod={setActivePeriod}
                                                    recordsCount={filteredTransactions.length}
                                                    t={t}
                                                />

                                                <TransactionStatsCards
                                                    totalIncome={totalIncome}
                                                    totalExpense={totalExpense}
                                                    balance={balance}
                                                    displayCurrency={displayCurrency}
                                                />

                                                <DashboardCharts
                                                    chartOptions={chartOptions}
                                                    chartData={chartData}
                                                    categoryChartOptions={categoryChartOptions}
                                                    categoryChartData={categoryChartData}
                                                    topCategories={topCategories}
                                                    totalExpenseAmount={totalExpenseAmount}
                                                    colorPalette={colorPalette}
                                                    currency={currency}
                                                    displayCurrency={displayCurrency}
                                                />

                                                {/* Monthly Budget Widget */}
                                                <motion.div
                                                    initial={{ opacity: 0, y: 15 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.15, duration: 0.4 }}
                                                    className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                                                >
                                                    <div className="flex items-center gap-3.5">
                                                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                                            <Target className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                                    {t('budgets.title')}
                                                                </span>
                                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                                                                    {Object.keys(budgets).length} Kategori Terpantau
                                                                </span>
                                                            </div>
                                                            <h4 className="text-base font-bold text-gray-900">
                                                                Status Batas & Alokasi Anggaran Bulanan
                                                            </h4>
                                                            <p className="text-xs text-gray-500">
                                                                Pantau dan kendalikan pengeluaran agar selalu berada di bawah target anggaran.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => setActiveTab('budgets')}
                                                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 shrink-0"
                                                    >
                                                        <Target className="w-3.5 h-3.5" />
                                                        <span>Kelola Anggaran</span>
                                                    </button>
                                                </motion.div>

                                                {/* Super Admin User Management Table */}
                                                {isAdminUtama && (
                                                    <DashboardAdminUserTable
                                                        allSubscriptions={allSubscriptions}
                                                        onOpenEditModal={handleOpenEditUserModal}
                                                        onDeleteUser={handleDeleteUser}
                                                        onNavigateToSubscriptions={() => setActiveTab('subscriptions')}
                                                    />
                                                )}
                                            </div>
                                        )}

                                        {/* TAB 2: TRANSACTIONS LEDGER */}
                                        {activeTab === 'transactions' && (
                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                                <TransactionForm
                                                    formData={formData}
                                                    setFormData={setFormData}
                                                    editingId={editingId}
                                                    onCancelEdit={() => {
                                                        setEditingId(null);
                                                        setFormData({
                                                            type: 'pengeluaran',
                                                            category: '',
                                                            amount: '',
                                                            description: '',
                                                            date: new Date().toISOString().split('T')[0]
                                                        });
                                                    }}
                                                    onSubmit={handleSubmit}
                                                    isSubmitting={isSubmitting}
                                                    currency={currency}
                                                    exchangeRate={exchangeRate}
                                                    formatNumberInput={formatNumberInput}
                                                    isCustomCategory={isCustomCategory}
                                                    setIsCustomCategory={setIsCustomCategory}
                                                    receiptInputRef={receiptInputRef}
                                                    onReceiptPhotoUpload={handleReceiptPhotoUpload}
                                                    isScanningReceipt={isScanningReceipt}
                                                    scanProgress={scanProgress}
                                                    t={t}
                                                />

                                                <TransactionTable
                                                    transactions={filteredTransactions}
                                                    loading={loading}
                                                    searchTerm={searchTerm}
                                                    onSearchChange={setSearchTerm}
                                                    onEdit={handleEdit}
                                                    onDelete={handleDelete}
                                                    displayDate={displayDate}
                                                    displayCurrency={displayCurrency}
                                                    getCategoryLabel={getCategoryLabel}
                                                    getWeekdayLabel={getWeekdayLabel}
                                                    currency={currency}
                                                    t={t}
                                                />
                                            </div>
                                        )}

                                        {/* TAB 3: BUDGET MANAGER */}
                                        {activeTab === 'budgets' && (
                                            <BudgetManager
                                                budgets={budgets}
                                                transactions={transactions}
                                                userId={user?.id}
                                                onSaveBudget={handleSaveBudget}
                                                onDeleteBudget={handleDeleteBudget}
                                                displayCurrency={displayCurrency}
                                                formatNumberInput={formatNumberInput}
                                                showToast={showToast}
                                            />
                                        )}

                                        {/* TAB 4: FINANCIAL REPORTS */}
                                        {activeTab === 'reports' && (
                                            <FinancialReportsView
                                                transactions={filteredTransactions}
                                                activePeriod={activePeriod}
                                                currency={currency}
                                                displayCurrency={displayCurrency}
                                            />
                                        )}

                                        {/* TAB 5: PROFILE & SECURITY */}
                                        {activeTab === 'profile' && (
                                            <ProfileSettingsView
                                                profileData={profileData}
                                                setProfileData={setProfileData}
                                                profileMessage={profileMessage}
                                                onSubmit={handleUpdateProfile}
                                            />
                                        )}

                                        {/* TAB 6: SUBSCRIPTION CENTER */}
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

            {/* Modals */}
            <EditUserModal
                isOpen={isEditUserModalOpen}
                onClose={() => setIsEditUserModalOpen(false)}
                editUserForm={editUserForm}
                setEditUserForm={setEditUserForm}
                onSave={handleSaveEditUser}
                isSubmitting={isSubmitting}
            />

            <LimitModal
                limitModal={limitModal}
                onClose={() => setLimitModal(null)}
                lang={lang}
            />

            {/* Toast Notifications */}
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

const CATEGORIES_MAP = {
    'makanan & minuman': true,
    'transportasi': true,
    'pendidikan': true,
    'belanja': true,
    'hiburan': true,
    'utilitas': true,
    'kesehatan': true,
    'gaji': true,
    'investasi': true,
    'lainnya': true
};

export default AdminDashboard;
