import { supabase } from '../lib/supabaseClient';

export const SUPER_ADMIN_EMAIL = 'arbain@gmail.com';

export const isSuperAdmin = (emailOrUser) => {
    if (!emailOrUser) return false;
    let emailStr = '';
    if (typeof emailOrUser === 'string') {
        emailStr = emailOrUser;
    } else if (typeof emailOrUser === 'object' && emailOrUser !== null) {
        emailStr = emailOrUser.email || emailOrUser.user_email || '';
    }
    if (!emailStr || typeof emailStr !== 'string') return false;
    return emailStr.toLowerCase().trim() === SUPER_ADMIN_EMAIL;
};

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
export const getUserSubscriptionStatus = async (userId, userEmail = null) => {
    // Super Admin Arbain always has active lifetime access
    if (isSuperAdmin(userEmail)) {
        return {
            plan_code: 'PREMIUM_LIFETIME',
            subscription_status: 'ACTIVE',
            subscription_start: new Date(2024, 0, 1).toISOString(),
            subscription_end: null,
            source: 'ADMIN_GRANTED',
            role: 'SUPER_ADMIN'
        };
    }

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
            // Check auth user email if not supplied
            if (!userEmail) {
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user && user.id === userId && isSuperAdmin(user.email)) {
                        return {
                            plan_code: 'PREMIUM_LIFETIME',
                            subscription_status: 'ACTIVE',
                            subscription_start: new Date(2024, 0, 1).toISOString(),
                            subscription_end: null,
                            source: 'ADMIN_GRANTED',
                            role: 'SUPER_ADMIN'
                        };
                    }
                } catch {}
            }

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
    // Super Admin Arbain has NO restrictions ever
    if (user && isSuperAdmin(user.email)) {
        return { 
            allowed: true, 
            isPremium: true, 
            planCode: 'PREMIUM_LIFETIME', 
            reason: 'SUPER_ADMIN' 
        };
    }

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

    const sub = await getUserSubscriptionStatus(user.id, user.email);

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
        throw new Error('Pengguna sudah memiliki Premium Unlimited.');
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
export const createCheckoutOrder = async ({ 
    userId, 
    userEmail, 
    planCode, 
    paymentMethod = 'QRIS', 
    promoCode, 
    customerPhone = '', 
    notes = '' 
}) => {
    const plans = await fetchPlans();
    const targetPlan = plans.find(p => p.code === planCode);
    
    if (!targetPlan || targetPlan.code === 'FREE') {
        throw new Error('Paket tidak valid untuk pembelian.');
    }

    // Check if user already has Unlimited
    const currentSub = await getUserSubscriptionStatus(userId, userEmail);
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
        user_email: (typeof userEmail === 'string' ? userEmail : userEmail?.email || '').toLowerCase().trim(),
        plan_code: targetPlan.code,
        price: targetPlan.price,
        promo_code: promoRes.valid ? promoRes.code : null,
        discount_amount: promoRes.discount_amount || 0,
        total_amount: promoRes.total_amount,
        payment_method: paymentMethod || 'QRIS',
        status: 'PENDING',  // Always PENDING. Requires Admin Approval.
        notes: notes || (customerPhone ? `No HP: ${customerPhone}` : null),
        expired_at: expiredAt,
        created_at: new Date().toISOString()
    };

    if (supabase) {
        let { error } = await supabase.from('orders').insert([orderData]);
        if (error && error.message?.includes('user_email')) {
            // Fallback if user_email column is not yet in DB schema
            const { user_email, ...fallbackOrder } = orderData;
            await supabase.from('orders').insert([fallbackOrder]);
        }
    }

    // Save to local orders cache
    try {
        const localOrdersStr = localStorage.getItem('local_user_orders') || '[]';
        const localOrders = JSON.parse(localOrdersStr);
        localOrders.unshift(orderData);
        localStorage.setItem('local_user_orders', JSON.stringify(localOrders.slice(0, 50)));
    } catch {}

    return orderData;
};

// 7b. Check Payment Status (for frontend polling)
export const checkPaymentStatus = async (orderId) => {
    if (!orderId) return null;

    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
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

// 8. Admin Confirm Payment (ADMIN-ONLY — called from Admin Dashboard to APPROVE order)
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
    const currentSub = await getUserSubscriptionStatus(order.user_id, order.user_email);
    const newDates = calculateRenewalDates(currentSub, order.plan_code);

    const subPayload = {
        user_id: order.user_id,
        user_email: order.user_email || null,
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
        let updateRes = await supabase
            .from('user_subscriptions')
            .update(subPayload)
            .eq('id', existingSub.id);
        if (updateRes.error && updateRes.error.message?.includes('user_email')) {
            const { user_email, ...fallbackSub } = subPayload;
            await supabase.from('user_subscriptions').update(fallbackSub).eq('id', existingSub.id);
        }
    } else {
        let insertRes = await supabase
            .from('user_subscriptions')
            .insert([subPayload]);
        if (insertRes.error && insertRes.error.message?.includes('user_email')) {
            const { user_email, ...fallbackSub } = subPayload;
            await supabase.from('user_subscriptions').insert([fallbackSub]);
        }
    }

    // Update local cache if available
    try {
        const localKey = `local_sub_${order.user_id}`;
        localStorage.setItem(localKey, JSON.stringify(subPayload));
    } catch {}

    return { success: true, order: { ...order, status: 'PAID', paid_at: now }, subPayload };
};

// 8b. Admin Reject/Cancel Payment (ADMIN-ONLY)
export const adminCancelPayment = async (orderId, reason = '') => {
    if (!orderId) throw new Error('Order ID diperlukan.');
    if (!supabase) throw new Error('Database tidak tersedia.');

    const { error } = await supabase
        .from('orders')
        .update({ status: 'CANCELLED', notes: reason || 'Dibatalkan oleh Admin Utama' })
        .eq('order_id', orderId)
        .neq('status', 'PAID'); // Cannot cancel already PAID orders

    if (error) throw new Error('Gagal membatalkan order.');
    return { success: true };
};

// 9. Admin Grant / Modify Premium Directly
export const adminGrantPremium = async ({ adminUserId, targetUserId, targetUserEmail, planCode, note = '' }) => {
    if (!['PREMIUM_MONTHLY', 'PREMIUM_YEARLY', 'PREMIUM_LIFETIME'].includes(planCode)) {
        throw new Error('Paket grant admin hanya boleh Premium 1 Bulan, Premium 1 Tahun, atau Premium Unlimited.');
    }

    const currentSub = await getUserSubscriptionStatus(targetUserId, targetUserEmail);
    const newDates = calculateRenewalDates(currentSub, planCode);

    const subPayload = {
        user_id: targetUserId,
        user_email: targetUserEmail || null,
        plan_code: planCode,
        subscription_status: 'ACTIVE',
        subscription_start: newDates.subscription_start,
        subscription_end: newDates.subscription_end,
        source: 'ADMIN_GRANTED',
        granted_by: adminUserId || 'SUPER_ADMIN',
        granted_at: new Date().toISOString(),
        note: note || 'Diberikan langsung oleh Admin Utama arbain@gmail.com',
        updated_at: new Date().toISOString()
    };

    if (supabase) {
        const { data: existingSub } = await supabase
            .from('user_subscriptions')
            .select('id')
            .eq('user_id', targetUserId)
            .maybeSingle();

        if (existingSub) {
            let res = await supabase
                .from('user_subscriptions')
                .update(subPayload)
                .eq('id', existingSub.id);
            if (res.error && res.error.message?.includes('user_email')) {
                const { user_email, ...fallbackSub } = subPayload;
                await supabase.from('user_subscriptions').update(fallbackSub).eq('id', existingSub.id);
            }
        } else {
            let res = await supabase
                .from('user_subscriptions')
                .insert([subPayload]);
            if (res.error && res.error.message?.includes('user_email')) {
                const { user_email, ...fallbackSub } = subPayload;
                await supabase.from('user_subscriptions').insert([fallbackSub]);
            }
        }
    }

    try {
        const localKey = `local_sub_${targetUserId}`;
        localStorage.setItem(localKey, JSON.stringify(subPayload));
    } catch {}

    return subPayload;
};

// 10. Admin Revoke Premium (Revert to FREE)
export const adminRevokePremium = async (targetUserId) => {
    if (!targetUserId) throw new Error('User ID diperlukan.');
    if (!supabase) throw new Error('Database tidak tersedia.');

    const subPayload = {
        plan_code: 'FREE',
        subscription_status: 'FREE',
        subscription_end: new Date().toISOString(),
        note: 'Dicabut oleh Admin Utama',
        updated_at: new Date().toISOString()
    };

    await supabase
        .from('user_subscriptions')
        .update(subPayload)
        .eq('user_id', targetUserId);

    try {
        const localKey = `local_sub_${targetUserId}`;
        localStorage.removeItem(localKey);
    } catch {}

    return { success: true };
};

// 10b. Admin Edit User (Email, Plan, Status, End Date, Note)
export const adminEditUserSubscription = async ({ userId, userEmail, planCode, subscriptionStatus, subscriptionEnd, note }) => {
    if (!userId) throw new Error('User ID diperlukan.');
    if (!supabase) throw new Error('Database tidak tersedia.');

    if (isSuperAdmin(userEmail) && planCode !== 'PREMIUM_LIFETIME') {
        throw new Error('Akun Admin Utama (arbain@gmail.com) harus selalu memiliki paket PREMIUM_LIFETIME.');
    }

    const payload = {
        user_email: userEmail || null,
        plan_code: planCode || 'FREE',
        subscription_status: subscriptionStatus || 'FREE',
        subscription_end: planCode === 'PREMIUM_LIFETIME' ? null : (subscriptionEnd || null),
        note: note || '',
        updated_at: new Date().toISOString()
    };

    let res = await supabase
        .from('user_subscriptions')
        .update(payload)
        .eq('user_id', userId);

    if (res.error && res.error.message?.includes('user_email')) {
        const { user_email, ...fallbackPayload } = payload;
        await supabase
            .from('user_subscriptions')
            .update(fallbackPayload)
            .eq('user_id', userId);
    }

    try {
        const localKey = `local_sub_${userId}`;
        localStorage.setItem(localKey, JSON.stringify({ ...payload, user_id: userId }));
    } catch {}

    return { success: true };
};

// 10c. Admin Delete User completely (from subscriptions and orders)
export const adminDeleteUserSubscription = async (userId, userEmail) => {
    if (!userId) throw new Error('User ID diperlukan.');
    if (!supabase) throw new Error('Database tidak tersedia.');

    if (isSuperAdmin(userEmail)) {
        throw new Error('Akun Admin Utama (arbain@gmail.com) diproteksi dan TIDAK BISA dihapus.');
    }

    // 1. Delete subscription record
    const { error: subErr } = await supabase
        .from('user_subscriptions')
        .delete()
        .eq('user_id', userId);

    if (subErr) {
        throw new Error(`Gagal menghapus langganan: ${subErr.message}`);
    }

    // 2. Delete orders record
    try {
        await supabase
            .from('orders')
            .delete()
            .eq('user_id', userId);
    } catch (e) {
        console.warn('Orders cleanup non-critical error:', e);
    }

    // 3. Clean up cache
    try {
        const localKey = `local_sub_${userId}`;
        localStorage.removeItem(localKey);
    } catch {}

    return { success: true };
};

// 11. Sync User Profile upon Registration or Login
// Ensures every user is present in user_subscriptions with email so Admin Utama can control them
export const recordUserLoginOrRegister = async (user) => {
    if (!user || !user.id || !supabase) return;
    try {
        const email = typeof user?.email === 'string' ? user.email.toLowerCase().trim() : '';
        const isAdmin = isSuperAdmin(email);

        const { data: existing } = await supabase
            .from('user_subscriptions')
            .select('id, user_email, plan_code')
            .eq('user_id', user.id)
            .maybeSingle();

        if (!existing) {
            const initialSub = {
                user_id: user.id,
                user_email: email,
                plan_code: isAdmin ? 'PREMIUM_LIFETIME' : 'FREE',
                subscription_status: isAdmin ? 'ACTIVE' : 'FREE',
                subscription_start: new Date().toISOString(),
                subscription_end: null,
                source: isAdmin ? 'ADMIN_GRANTED' : 'PAID',
                granted_by: isAdmin ? 'SYSTEM' : null,
                note: isAdmin ? 'Admin Utama System Account' : 'Pengguna Baru',
                updated_at: new Date().toISOString()
            };

            let res = await supabase.from('user_subscriptions').insert([initialSub]);
            if (res.error && res.error.message?.includes('user_email')) {
                const { user_email, ...fallbackSub } = initialSub;
                await supabase.from('user_subscriptions').insert([fallbackSub]);
            }
        } else if (!existing.user_email && email) {
            await supabase
                .from('user_subscriptions')
                .update({ user_email: email })
                .eq('id', existing.id);
        }
    } catch (e) {
        console.warn('recordUserLoginOrRegister non-blocking warning:', e);
    }
};

// 12. Fetch All Subscriptions & Orders exclusively for Admin Utama
export const fetchAdminData = async () => {
    if (!supabase) return { subscriptions: [], orders: [] };

    try {
        const [subRes, orderRes] = await Promise.all([
            supabase.from('user_subscriptions').select('*').order('updated_at', { ascending: false }),
            supabase.from('orders').select('*').order('created_at', { ascending: false })
        ]);

        return {
            subscriptions: subRes.data || [],
            orders: orderRes.data || []
        };
    } catch (err) {
        console.error('Error fetching admin data:', err);
        return { subscriptions: [], orders: [] };
    }
};
