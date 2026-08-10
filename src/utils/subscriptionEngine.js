import { supabase } from '../lib/supabaseClient';

export const DEFAULT_PLANS = [
    {
        id: 'plan-free',
        name: 'FREE',
        code: 'FREE',
        price: 0,
        duration_days: null,
        subscription_type: 'FREE',
        is_active: true
    },
    {
        id: 'plan-monthly',
        name: 'Premium 1 Bulan',
        code: 'PREMIUM_MONTHLY',
        price: 29000,
        duration_days: 30,
        subscription_type: 'FIXED_DURATION',
        is_active: true
    },
    {
        id: 'plan-yearly',
        name: 'Premium 1 Tahun',
        code: 'PREMIUM_YEARLY',
        price: 79000,
        duration_days: 365,
        subscription_type: 'FIXED_DURATION',
        is_active: true
    },
    {
        id: 'plan-lifetime',
        name: 'Premium Unlimited',
        code: 'PREMIUM_LIFETIME',
        price: 119999,
        duration_days: null,
        subscription_type: 'LIFETIME',
        is_active: true
    }
];

export const DEFAULT_LIMITS = {
    free_max_transactions_monthly: 100,
    free_max_exports_monthly: 5,
    free_max_analytics_monthly: 3
};

// 1. Fetch Plan configurations from Database (or default fallback)
export const fetchPlans = async () => {
    try {
        if (!supabase) return DEFAULT_PLANS;
        const { data, error } = await supabase.from('plans').select('*').order('price', { ascending: true });
        if (error || !data || data.length === 0) return DEFAULT_PLANS;
        return data;
    } catch {
        return DEFAULT_PLANS;
    }
};

// 2. Fetch Usage Limits for Free Users from Database
export const fetchUsageLimits = async () => {
    try {
        if (!supabase) return DEFAULT_LIMITS;
        const { data, error } = await supabase.from('usage_limits').select('*').limit(1).maybeSingle();
        if (error || !data) return DEFAULT_LIMITS;
        return data;
    } catch {
        return DEFAULT_LIMITS;
    }
};

// 3. Get User Subscription Status & Expiration Check
export const getUserSubscriptionStatus = async (userId) => {
    if (!userId) {
        return {
            plan_code: 'FREE',
            subscription_status: 'FREE',
            subscription_start: null,
            subscription_end: null
        };
    }

    try {
        let subData = null;

        if (supabase) {
            const { data, error } = await supabase
                .from('user_subscriptions')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (!error && data) {
                subData = data;
            }
        }

        // LocalStorage fallback if DB table not created yet or empty
        if (!subData) {
            const localSub = localStorage.getItem(`local_sub_${userId}`);
            if (localSub) {
                try {
                    subData = JSON.parse(localSub);
                } catch {}
            }
        }

        if (!subData) {
            return {
                plan_code: 'FREE',
                subscription_status: 'FREE',
                subscription_start: null,
                subscription_end: null
            };
        }

        // Unlimited Lifetime Check
        if (subData.plan_code === 'PREMIUM_LIFETIME') {
            return {
                ...subData,
                subscription_status: 'ACTIVE',
                subscription_end: null
            };
        }

        // Expiration Check for Fixed Duration Plans
        if (subData.subscription_end) {
            const endDate = new Date(subData.subscription_end);
            const now = new Date();
            if (endDate < now) {
                const expiredSub = {
                    ...subData,
                    subscription_status: 'EXPIRED',
                    is_expired_reverted_to_free: true
                };

                if (supabase) {
                    supabase
                        .from('user_subscriptions')
                        .update({ subscription_status: 'EXPIRED' })
                        .eq('id', subData.id);
                }
                localStorage.setItem(`local_sub_${userId}`, JSON.stringify(expiredSub));

                return expiredSub;
            }
        }

        return subData;
    } catch (err) {
        console.error('Error getting user subscription status:', err);
        return {
            plan_code: 'FREE',
            subscription_status: 'FREE',
            subscription_start: null,
            subscription_end: null
        };
    }
};

// 4. Central Authorization Access Check (checkFeatureAccess)
export const checkFeatureAccess = async (user, featureType = 'transaction', currentUsageCount = 0) => {
    const limits = await fetchUsageLimits();
    
    if (!user) {
        // Anon user limit check
        const maxLimit = featureType === 'export' 
            ? limits.free_max_exports_monthly 
            : featureType === 'analytics' 
            ? limits.free_max_analytics_monthly 
            : limits.free_max_transactions_monthly;

        const allowed = currentUsageCount < maxLimit;
        return {
            allowed,
            isPremium: false,
            limit: maxLimit,
            usage: currentUsageCount,
            reason: allowed ? 'FREE_WITHIN_LIMIT' : 'LIMIT_EXCEEDED'
        };
    }

    const sub = await getUserSubscriptionStatus(user.id);

    // Lifetime Premium Check
    if (sub.plan_code === 'PREMIUM_LIFETIME' && sub.subscription_status !== 'CANCELLED') {
        return { allowed: true, isPremium: true, planCode: 'PREMIUM_LIFETIME', reason: 'LIFETIME' };
    }

    // Active Fixed Duration Premium Check
    if (
        (sub.plan_code === 'PREMIUM_MONTHLY' || sub.plan_code === 'PREMIUM_YEARLY') &&
        sub.subscription_status === 'ACTIVE'
    ) {
        return { allowed: true, isPremium: true, planCode: sub.plan_code, reason: 'ACTIVE' };
    }

    // FREE user limit check
    const maxLimit = featureType === 'export' 
        ? limits.free_max_exports_monthly 
        : featureType === 'analytics' 
        ? limits.free_max_analytics_monthly 
        : limits.free_max_transactions_monthly;

    const allowed = currentUsageCount < maxLimit;
    return {
        allowed,
        isPremium: false,
        limit: maxLimit,
        usage: currentUsageCount,
        reason: allowed ? 'FREE_WITHIN_LIMIT' : 'LIMIT_EXCEEDED'
    };
};

// 5. Renewal Date Accumulation Logic
export const calculateRenewalDates = (currentSubscription, newPlanCode) => {
    if (currentSubscription && currentSubscription.plan_code === 'PREMIUM_LIFETIME') {
        throw new Error('Anda sudah memiliki Premium Unlimited.');
    }

    let baseDate = new Date();
    
    // If currently active fixed duration and end date is in the future, accumulate from previous expiration date
    if (
        currentSubscription &&
        currentSubscription.subscription_status === 'ACTIVE' &&
        currentSubscription.subscription_end
    ) {
        const activeEndDate = new Date(currentSubscription.subscription_end);
        if (activeEndDate > baseDate) {
            baseDate = activeEndDate;
        }
    }

    const startDate = new Date();

    if (newPlanCode === 'PREMIUM_LIFETIME') {
        return {
            subscription_start: startDate.toISOString(),
            subscription_end: null
        };
    }

    const addedDays = newPlanCode === 'PREMIUM_YEARLY' ? 365 : 30;
    const endDate = new Date(baseDate.getTime() + addedDays * 24 * 60 * 60 * 1000);

    return {
        subscription_start: startDate.toISOString(),
        subscription_end: endDate.toISOString()
    };
};

// 6. Verify Promo Code and Calculate Discount
export const verifyPromoCode = async (code, originalPrice) => {
    if (!code || !code.trim()) {
        return { valid: false, discount_amount: 0, total_amount: originalPrice };
    }

    const cleanCode = code.trim().toUpperCase();

    // Fallback promos if table not created yet in Supabase SQL editor
    const FALLBACK_PROMOS = {
        'HEMAT20': { discount_type: 'PERCENTAGE', discount_value: 20 },
        'PROMO50': { discount_type: 'PERCENTAGE', discount_value: 50 }
    };

    try {
        let promo = null;

        if (supabase) {
            const { data, error } = await supabase
                .from('promo_codes')
                .select('*')
                .eq('code', cleanCode)
                .eq('is_active', true)
                .maybeSingle();

            if (!error && data) {
                promo = data;
            }
        }

        if (!promo && FALLBACK_PROMOS[cleanCode]) {
            promo = FALLBACK_PROMOS[cleanCode];
        }

        if (!promo) {
            return { valid: false, discount_amount: 0, total_amount: originalPrice, message: 'Kode promo tidak ditemukan atau tidak aktif' };
        }

        let discount = 0;
        if (promo.discount_type === 'PERCENTAGE') {
            discount = Math.round((originalPrice * promo.discount_value) / 100);
        } else {
            discount = promo.discount_value;
        }

        discount = Math.min(discount, originalPrice);
        const total = Math.max(0, originalPrice - discount);

        return {
            valid: true,
            code: cleanCode,
            discount_type: promo.discount_type,
            discount_value: promo.discount_value,
            discount_amount: discount,
            total_amount: total
        };
    } catch {
        if (FALLBACK_PROMOS[cleanCode]) {
            const promo = FALLBACK_PROMOS[cleanCode];
            const discount = Math.round((originalPrice * promo.discount_value) / 100);
            return {
                valid: true,
                code: cleanCode,
                discount_type: promo.discount_type,
                discount_value: promo.discount_value,
                discount_amount: discount,
                total_amount: originalPrice - discount
            };
        }
        return { valid: false, discount_amount: 0, total_amount: originalPrice, message: 'Gagal memverifikasi kode promo' };
    }
};

// 7. Create Subscription Checkout Order
// ⚠️ IMPORTANT: This function ONLY creates a PENDING order.
// It NEVER activates Premium or changes subscription status.
// Premium is only activated by adminConfirmPayment() after manual verification.
export const createCheckoutOrder = async ({ userId, planCode, paymentMethod, promoCode }) => {
    const plans = await fetchPlans();
    const targetPlan = plans.find(p => p.code === planCode);
    
    if (!targetPlan || targetPlan.code === 'FREE') {
        throw new Error('Paket tidak valid untuk pembelian.');
    }

    // Check if user already has Unlimited
    const currentSub = await getUserSubscriptionStatus(userId);
    if (currentSub && currentSub.plan_code === 'PREMIUM_LIFETIME') {
        throw new Error('Anda sudah memiliki Premium Unlimited.');
    }

    const promoRes = await verifyPromoCode(promoCode, targetPlan.price);
    const orderId = 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    // Payment expired at 24 hours from now
    const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const orderData = {
        order_id: orderId,
        user_id: userId,
        plan_code: targetPlan.code,
        price: targetPlan.price,
        promo_code: promoRes.valid ? promoRes.code : null,
        discount_amount: promoRes.discount_amount || 0,
        total_amount: promoRes.total_amount,
        payment_method: paymentMethod || 'QRIS',
        status: 'PENDING',  // ← Always PENDING. Never PAID here.
        expired_at: expiredAt,
        created_at: new Date().toISOString()
    };

    if (supabase) {
        const { error } = await supabase.from('orders').insert([orderData]);
        if (error) {
            console.error('Error inserting order:', error);
            // Still return orderData for localStorage fallback
        }
    }

    // Save to local orders cache (status PENDING only)
    try {
        const localOrdersStr = localStorage.getItem('local_user_orders') || '[]';
        const localOrders = JSON.parse(localOrdersStr);
        localOrders.unshift(orderData);
        localStorage.setItem('local_user_orders', JSON.stringify(localOrders.slice(0, 50)));
    } catch {}

    return orderData;
};

// 7b. Check Payment Status (for frontend polling)
// Returns current status of an order from database.
// Frontend polls this every 3-5 seconds to detect when Admin confirms payment.
export const checkPaymentStatus = async (orderId) => {
    if (!orderId) return null;

    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('order_id, status, plan_code, total_amount, payment_method, paid_at, expired_at, created_at')
                .eq('order_id', orderId)
                .maybeSingle();

            if (!error && data) return data;
        } catch {}
    }

    // Fallback: check localStorage
    try {
        const localOrdersStr = localStorage.getItem('local_user_orders') || '[]';
        const localOrders = JSON.parse(localOrdersStr);
        return localOrders.find(o => o.order_id === orderId) || null;
    } catch {
        return null;
    }
};

// 8. Admin Confirm Payment (ADMIN-ONLY — called from Admin Dashboard after manual verification)
// ⚠️ This function must NEVER be called from user-facing checkout UI.
// It is only called when an admin manually confirms a transfer in the Admin Dashboard.
export const adminConfirmPayment = async (orderId) => {
    if (!orderId) throw new Error('Order ID diperlukan.');
    if (!supabase) throw new Error('Database tidak tersedia.');

    // Fetch order from DB
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();

    if (orderError || !order) throw new Error('Order tidak ditemukan.');

    // Idempotency: if already PAID, skip activation
    if (order.status === 'PAID') {
        return { success: true, message: 'Order sudah berstatus PAID sebelumnya.', alreadyPaid: true };
    }

    const now = new Date().toISOString();

    // Mark Order as PAID
    await supabase
        .from('orders')
        .update({ status: 'PAID', paid_at: now })
        .eq('order_id', orderId);

    // Activate subscription
    const currentSub = await getUserSubscriptionStatus(order.user_id);
    const newDates = calculateRenewalDates(currentSub, order.plan_code);

    const subPayload = {
        user_id: order.user_id,
        plan_code: order.plan_code,
        subscription_status: 'ACTIVE',
        subscription_start: newDates.subscription_start,
        subscription_end: newDates.subscription_end,
        source: 'PAID',
        updated_at: now
    };

    const { data: existingSub } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', order.user_id)
        .maybeSingle();

    if (existingSub) {
        await supabase
            .from('user_subscriptions')
            .update(subPayload)
            .eq('id', existingSub.id);
    } else {
        await supabase
            .from('user_subscriptions')
            .insert([subPayload]);
    }

    return { success: true, order: { ...order, status: 'PAID' }, subPayload };
};

// 8b. Admin Reject/Cancel Payment (ADMIN-ONLY)
export const adminCancelPayment = async (orderId, reason = '') => {
    if (!orderId) throw new Error('Order ID diperlukan.');
    if (!supabase) throw new Error('Database tidak tersedia.');

    const { error } = await supabase
        .from('orders')
        .update({ status: 'CANCELLED', notes: reason || 'Dibatalkan oleh admin' })
        .eq('order_id', orderId)
        .neq('status', 'PAID'); // Cannot cancel already PAID orders

    if (error) throw new Error('Gagal membatalkan order.');
    return { success: true };
};

// 9. Admin Grant Premium (Strictly 3 options: PREMIUM_MONTHLY, PREMIUM_YEARLY, PREMIUM_LIFETIME)
export const adminGrantPremium = async ({ adminUserId, targetUserId, planCode, note = '' }) => {
    if (!['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'PREMIUM_LIFETIME'].includes(planCode)) {
        throw new Error('Paket grant admin hanya boleh Premium 1 Bulan, Premium 1 Tahun, atau Premium Unlimited.');
    }

    const currentSub = await getUserSubscriptionStatus(targetUserId);
    const newDates = calculateRenewalDates(currentSub, planCode);

    const subPayload = {
        user_id: targetUserId,
        plan_code: planCode,
        subscription_status: 'ACTIVE',
        subscription_start: newDates.subscription_start,
        subscription_end: newDates.subscription_end,
        source: 'ADMIN_GRANTED',
        granted_by: adminUserId || 'ADMIN',
        granted_at: new Date().toISOString(),
        note,
        updated_at: new Date().toISOString()
    };

    if (supabase) {
        const { data: existingSub } = await supabase
            .from('user_subscriptions')
            .select('id')
            .eq('user_id', targetUserId)
            .maybeSingle();

        if (existingSub) {
            await supabase
                .from('user_subscriptions')
                .update(subPayload)
                .eq('id', existingSub.id);
        } else {
            await supabase
                .from('user_subscriptions')
                .insert([subPayload]);
        }
    }

    return subPayload;
};
