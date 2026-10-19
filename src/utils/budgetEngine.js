import { supabase } from '../lib/supabaseClient';

export const DEFAULT_CATEGORY_BUDGETS = {
    'makanan & minuman': 1500000,
    'transportasi': 500000,
    'belanja': 1000000,
    'utilitas': 600000,
    'hiburan': 400000,
};

const getLocalStorageKey = (userId) => `keuangan_budgets_${userId || 'guest'}`;

/**
 * Fetch all category budgets for a user
 */
export const fetchUserBudgets = async (userId) => {
    const localKey = getLocalStorageKey(userId);
    let cachedBudgets = {};

    try {
        const stored = localStorage.getItem(localKey);
        if (stored) {
            cachedBudgets = JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Could not read cached budgets:', e);
    }

    if (!supabase || !userId) {
        return Object.keys(cachedBudgets).length > 0 ? cachedBudgets : DEFAULT_CATEGORY_BUDGETS;
    }

    try {
        const { data, error } = await supabase
            .from('category_budgets')
            .select('category, monthly_limit')
            .eq('user_id', userId);

        if (error || !data || data.length === 0) {
            return Object.keys(cachedBudgets).length > 0 ? cachedBudgets : DEFAULT_CATEGORY_BUDGETS;
        }

        const map = {};
        data.forEach(item => {
            if (item.category) {
                map[item.category.toLowerCase().trim()] = Number(item.monthly_limit) || 0;
            }
        });

        // Sync back to local storage
        try {
            localStorage.setItem(localKey, JSON.stringify(map));
        } catch { /* ignore */ }

        return map;
    } catch {
        return Object.keys(cachedBudgets).length > 0 ? cachedBudgets : DEFAULT_CATEGORY_BUDGETS;
    }
};

/**
 * Save or update a category budget limit
 */
export const saveCategoryBudget = async (userId, category, limit) => {
    if (!category) return false;
    const catClean = category.toLowerCase().trim();
    const limitNum = Math.max(0, Number(limit) || 0);
    const localKey = getLocalStorageKey(userId);

    // Update local cache
    try {
        const current = JSON.parse(localStorage.getItem(localKey) || '{}');
        current[catClean] = limitNum;
        localStorage.setItem(localKey, JSON.stringify(current));
    } catch (e) {
        console.warn('Local storage budget update failed:', e);
    }

    // Upsert into Supabase if available
    if (supabase && userId) {
        try {
            await supabase
                .from('category_budgets')
                .upsert({
                    user_id: userId,
                    category: catClean,
                    monthly_limit: limitNum,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,category' });
        } catch (e) {
            console.warn('Supabase budget save failed (using local fallback):', e);
        }
    }

    return true;
};

/**
 * Delete a category budget limit
 */
export const deleteCategoryBudget = async (userId, category) => {
    if (!category) return false;
    const catClean = category.toLowerCase().trim();
    const localKey = getLocalStorageKey(userId);

    try {
        const current = JSON.parse(localStorage.getItem(localKey) || '{}');
        delete current[catClean];
        localStorage.setItem(localKey, JSON.stringify(current));
    } catch (e) { /* ignore */ }

    if (supabase && userId) {
        try {
            await supabase
                .from('category_budgets')
                .delete()
                .eq('user_id', userId)
                .eq('category', catClean);
        } catch (e) {
            console.warn('Supabase budget delete failed:', e);
        }
    }

    return true;
};

/**
 * Calculate budget utilization progress for a specific month
 */
export const calculateBudgetProgress = (budgets = {}, transactions = [], refMonth = new Date().getMonth(), refYear = new Date().getFullYear()) => {
    // 1. Calculate spending per category in target month
    const categorySpending = {};

    transactions.forEach(tx => {
        if (tx.type !== 'pengeluaran' || !tx.date) return;
        const d = new Date(tx.date);
        if (isNaN(d.getTime())) return;
        
        if (d.getMonth() === refMonth && d.getFullYear() === refYear) {
            const cat = (tx.category || 'lainnya').toLowerCase().trim();
            categorySpending[cat] = (categorySpending[cat] || 0) + (Number(tx.amount) || 0);
        }
    });

    let totalBudget = 0;
    let totalSpentInBudgeted = 0;
    let alertCount = 0;

    const items = Object.entries(budgets).map(([cat, limit]) => {
        const spent = categorySpending[cat] || 0;
        const remaining = Math.max(0, limit - spent);
        const overspent = Math.max(0, spent - limit);
        const percentage = limit > 0 ? (spent / limit) * 100 : (spent > 0 ? 100 : 0);

        let status = 'good'; // good | warning | danger
        if (percentage >= 100) {
            status = 'danger';
            alertCount++;
        } else if (percentage >= 80) {
            status = 'warning';
            alertCount++;
        }

        totalBudget += limit;
        totalSpentInBudgeted += spent;

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

    // Sort items: danger first, then warning, then good
    items.sort((a, b) => b.percentage - a.percentage);

    const overallPercentage = totalBudget > 0 ? (totalSpentInBudgeted / totalBudget) * 100 : 0;

    return {
        items,
        totalBudget,
        totalSpentInBudgeted,
        totalRemaining: Math.max(0, totalBudget - totalSpentInBudgeted),
        totalOverspent: Math.max(0, totalSpentInBudgeted - totalBudget),
        overallPercentage,
        alertCount
    };
};
