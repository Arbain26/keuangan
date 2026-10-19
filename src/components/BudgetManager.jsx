import { useState, useMemo } from 'react';
import { 
    Target, 
    Plus, 
    Edit2, 
    Trash2, 
    AlertTriangle, 
    CheckCircle2, 
    TrendingUp, 
    TrendingDown, 
    PieChart, 
    Sparkles, 
    X,
    Wallet,
    HelpCircle
} from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { KNOWN_CATEGORIES } from '../i18n/translations';
import { motion, AnimatePresence } from 'framer-motion';

export const BudgetManager = ({
    budgets = {},
    transactions = [],
    userId = null,
    onSaveBudget,
    onDeleteBudget,
    displayCurrency,
    formatNumberInput,
    showToast
}) => {
    const { t, lang } = useLanguage();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('makanan & minuman');
    const [limitInput, setLimitInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Current month & year reference
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calculate real-time budget progress
    const budgetStats = useMemo(() => {
        const categorySpending = {};

        transactions.forEach(tx => {
            if (tx.type !== 'pengeluaran' || !tx.date) return;
            const d = new Date(tx.date);
            if (isNaN(d.getTime())) return;

            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                const cat = (tx.category || 'lainnya').toLowerCase().trim();
                categorySpending[cat] = (categorySpending[cat] || 0) + (Number(tx.amount) || 0);
            }
        });

        let totalBudget = 0;
        let totalSpent = 0;
        let alertCategories = [];

        const list = Object.entries(budgets).map(([cat, limit]) => {
            const spent = categorySpending[cat] || 0;
            const remaining = Math.max(0, limit - spent);
            const overspent = Math.max(0, spent - limit);
            const percentage = limit > 0 ? (spent / limit) * 100 : 0;

            let status = 'safe';
            if (percentage >= 100) {
                status = 'danger';
                alertCategories.push({ cat, percentage, spent, limit });
            } else if (percentage >= 80) {
                status = 'warning';
                alertCategories.push({ cat, percentage, spent, limit });
            }

            totalBudget += limit;
            totalSpent += spent;

            return {
                category: cat,
                limit,
                spent,
                remaining,
                overspent,
                percentage,
                status
            };
        });

        // Sort: highest percentage usage first
        list.sort((a, b) => b.percentage - a.percentage);

        const overallPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

        return {
            items: list,
            totalBudget,
            totalSpent,
            totalRemaining: Math.max(0, totalBudget - totalSpent),
            overallPercent,
            alertCategories
        };
    }, [budgets, transactions, currentMonth, currentYear]);

    const openAddModal = (cat = null) => {
        if (cat) {
            setEditingCategory(cat);
            setSelectedCategory(cat);
            setLimitInput(formatNumberInput(budgets[cat] || ''));
        } else {
            setEditingCategory(null);
            // Default to first unused standard category
            const unusedCat = Object.keys(KNOWN_CATEGORIES).find(k => k !== 'gaji' && !budgets[k]);
            setSelectedCategory(unusedCat || 'makanan & minuman');
            setLimitInput('1.000.000');
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const rawLimit = Number(limitInput.replace(/\D/g, '')) || 0;
        if (rawLimit <= 0) {
            showToast('Nominal batas anggaran harus lebih besar dari 0.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            await onSaveBudget(selectedCategory, rawLimit);
            showToast(t('budgets.saveSuccess') || 'Batas anggaran berhasil disimpan!');
            setIsModalOpen(false);
            setEditingCategory(null);
        } catch {
            showToast('Gagal menyimpan anggaran.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (category) => {
        const confirmMsg = t('budgets.deleteConfirm') || `Hapus batas anggaran untuk kategori ${category}?`;
        if (!window.confirm(confirmMsg)) return;

        try {
            await onDeleteBudget(category);
            showToast(t('budgets.deleteSuccess') || 'Batas anggaran berhasil dihapus!');
        } catch {
            showToast('Gagal menghapus anggaran.', 'error');
        }
    };

    const applyPreset = (amount) => {
        setLimitInput(formatNumberInput(amount));
    };

    const getCategoryDetails = (cat) => {
        const info = KNOWN_CATEGORIES[cat] || {
            id: cat.charAt(0).toUpperCase() + cat.slice(1),
            en: cat.charAt(0).toUpperCase() + cat.slice(1),
            icon: '📌'
        };
        return {
            name: lang === 'en' ? info.en : info.id,
            icon: info.icon
        };
    };

    return (
        <div className="space-y-6">
            {/* Header Title & Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <Target className="w-5 h-5" />
                        </span>
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">{t('budgets.title')}</h2>
                    </div>
                    <p className="text-xs text-gray-500 max-w-xl">
                        {t('budgets.subtitle')}
                    </p>
                </div>

                <button
                    onClick={() => openAddModal()}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition shadow-sm shrink-0"
                >
                    <Plus className="w-4 h-4" />
                    <span>{t('budgets.addBudget')}</span>
                </button>
            </div>

            {/* Alert Banner if any category exceeds 80% or 100% */}
            {budgetStats.alertCategories.length > 0 && (
                <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3.5 shadow-xs">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1 text-xs">
                        <h4 className="font-bold text-amber-900 mb-0.5">
                            {t('budgets.alertBannerTitle')}
                        </h4>
                        <p className="text-amber-800 leading-relaxed">
                            {budgetStats.alertCategories.map(a => {
                                const details = getCategoryDetails(a.cat);
                                return `${details.icon} ${details.name} (${Math.round(a.percentage)}%)`;
                            }).join(', ')}
                        </p>
                    </div>
                </div>
            )}

            {/* Executive KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Monthly Budget */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            {t('budgets.totalBudget')}
                        </p>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                            {displayCurrency(budgetStats.totalBudget)}
                        </h3>
                        <p className="text-[11px] text-gray-500 mt-1">
                            {budgetStats.items.length} {t('budgets.category')} terpantau
                        </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                        <Wallet className="w-6 h-6" />
                    </div>
                </div>

                {/* Total Spent */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            {t('budgets.totalSpent')}
                        </p>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                            {displayCurrency(budgetStats.totalSpent)}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className={`text-[11px] font-bold ${
                                budgetStats.overallPercent >= 100 
                                    ? 'text-rose-600' 
                                    : budgetStats.overallPercent >= 80 
                                        ? 'text-amber-600' 
                                        : 'text-emerald-600'
                            }`}>
                                {Math.round(budgetStats.overallPercent)}% {t('budgets.utilization')}
                            </span>
                        </div>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        budgetStats.overallPercent >= 100 
                            ? 'bg-rose-50 text-rose-600' 
                            : 'bg-emerald-50 text-emerald-600'
                    }`}>
                        <TrendingDown className="w-6 h-6" />
                    </div>
                </div>

                {/* Remaining Budget */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            {t('budgets.remaining')}
                        </p>
                        <h3 className={`text-2xl font-black tracking-tight ${
                            budgetStats.totalRemaining === 0 && budgetStats.totalSpent > budgetStats.totalBudget 
                                ? 'text-rose-600' 
                                : 'text-gray-900'
                        }`}>
                            {displayCurrency(budgetStats.totalRemaining)}
                        </h3>
                        <p className="text-[11px] text-gray-500 mt-1">
                            {budgetStats.totalSpent > budgetStats.totalBudget 
                                ? `Defisit: ${displayCurrency(budgetStats.totalSpent - budgetStats.totalBudget)}` 
                                : 'Tersedia untuk sisa bulan ini'}
                        </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
                        <PieChart className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Overall Monthly Progress Bar */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-gray-700 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        Realisasi Anggaran Total Bulan Ini
                    </span>
                    <span className="font-mono font-bold text-gray-900">
                        {Math.round(budgetStats.overallPercent)}% ({displayCurrency(budgetStats.totalSpent)} / {displayCurrency(budgetStats.totalBudget)})
                    </span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, budgetStats.overallPercent)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full transition-colors ${
                            budgetStats.overallPercent >= 100 
                                ? 'bg-rose-500' 
                                : budgetStats.overallPercent >= 80 
                                    ? 'bg-amber-500' 
                                    : 'bg-blue-600'
                        }`}
                    />
                </div>
            </div>

            {/* Category Budget Cards Grid */}
            {budgetStats.items.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center shadow-xs">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Target className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">{t('budgets.emptyTitle')}</h3>
                    <p className="text-xs text-gray-500 max-w-md mx-auto mb-6">
                        {t('budgets.emptyDesc')}
                    </p>
                    <button
                        onClick={() => openAddModal()}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                    >
                        <Plus className="w-4 h-4" />
                        <span>{t('budgets.addBudget')}</span>
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {budgetStats.items.map((item) => {
                        const details = getCategoryDetails(item.category);
                        const isOver = item.percentage >= 100;
                        const isNear = item.percentage >= 80 && !isOver;

                        return (
                            <div 
                                key={item.category}
                                className={`bg-white border rounded-2xl p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between ${
                                    isOver 
                                        ? 'border-rose-200 ring-1 ring-rose-100' 
                                        : isNear 
                                            ? 'border-amber-200 ring-1 ring-amber-100' 
                                            : 'border-gray-100'
                                }`}
                            >
                                <div>
                                    {/* Card Header: Icon, Category Name, and Actions */}
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-2xl p-1 bg-gray-50 rounded-xl border border-gray-100">
                                                {details.icon}
                                            </span>
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-900">
                                                    {details.name}
                                                </h4>
                                                <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    isOver 
                                                        ? 'bg-rose-100 text-rose-700' 
                                                        : isNear 
                                                            ? 'bg-amber-100 text-amber-700' 
                                                            : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    {isOver ? t('budgets.statusDanger') : isNear ? t('budgets.statusWarning') : t('budgets.statusSafe')}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => openAddModal(item.category)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                title={t('budgets.editBudget')}
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.category)}
                                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                title={t('budgets.deleteBudget')}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Spending vs Limit Numbers */}
                                    <div className="space-y-1 mb-3">
                                        <div className="flex items-baseline justify-between">
                                            <span className="text-xs text-gray-500">{t('budgets.totalSpent')}:</span>
                                            <span className={`text-sm font-black ${isOver ? 'text-rose-600' : 'text-gray-900'}`}>
                                                {displayCurrency(item.spent)}
                                            </span>
                                        </div>
                                        <div className="flex items-baseline justify-between text-xs text-gray-500">
                                            <span>{t('budgets.totalBudget')}:</span>
                                            <span className="font-semibold text-gray-700">
                                                {displayCurrency(item.limit)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                                        <div
                                            style={{ width: `${Math.min(100, item.percentage)}%` }}
                                            className={`h-full rounded-full transition-all ${
                                                isOver 
                                                    ? 'bg-rose-500' 
                                                    : isNear 
                                                        ? 'bg-amber-500' 
                                                        : 'bg-emerald-500'
                                            }`}
                                        />
                                    </div>
                                </div>

                                {/* Footer Remaining Indicator */}
                                <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-[11px]">
                                    <span className="text-gray-500">
                                        {isOver ? t('budgets.overBudget') : t('budgets.remaining')}:
                                    </span>
                                    <span className={`font-bold ${isOver ? 'text-rose-600 font-mono' : 'text-emerald-700 font-mono'}`}>
                                        {isOver ? `+${displayCurrency(item.overspent)}` : displayCurrency(item.remaining)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal: Set / Edit Category Budget */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-xs">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative"
                        >
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-5 right-5 p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-2 mb-4">
                                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                    <Target className="w-5 h-5" />
                                </span>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900">
                                        {editingCategory ? t('budgets.editBudget') : t('budgets.addBudget')}
                                    </h3>
                                    <p className="text-[11px] text-gray-500">
                                        Tentukan batas maksimal belanja per bulan
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleSave} className="space-y-4">
                                {/* Category Selector */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        {t('budgets.category')}
                                    </label>
                                    <select
                                        value={selectedCategory}
                                        disabled={Boolean(editingCategory)}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition"
                                    >
                                        {Object.entries(KNOWN_CATEGORIES)
                                            .filter(([k]) => k !== 'gaji')
                                            .map(([key, info]) => (
                                                <option key={key} value={key}>
                                                    {info.icon} {lang === 'en' ? info.en : info.id}
                                                </option>
                                            ))
                                        }
                                    </select>
                                </div>

                                {/* Monthly Limit Input */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        {t('budgets.monthlyLimit')}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-xs font-bold text-gray-400">
                                            Rp
                                        </span>
                                        <input
                                            type="text"
                                            required
                                            value={limitInput}
                                            onChange={(e) => setLimitInput(formatNumberInput(e.target.value))}
                                            placeholder="1.000.000"
                                            className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition"
                                        />
                                    </div>
                                </div>

                                {/* Quick Presets */}
                                <div>
                                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                                        {t('budgets.quickPreset')}
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[300000, 500000, 1000000, 1500000, 2000000, 3000000, 5000000].map(amt => (
                                            <button
                                                key={amt}
                                                type="button"
                                                onClick={() => applyPreset(amt)}
                                                className="px-2.5 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 rounded-lg text-[10px] font-bold transition"
                                            >
                                                Rp {amt >= 1000000 ? `${amt / 1000000} Jt` : `${amt / 1000} Rb`}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
                                    >
                                        {t('cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1"
                                    >
                                        {isSaving ? t('processing') : t('save')}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
