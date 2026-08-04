import { supabase } from './supabaseClient';

export const fetchTransactions = async () => {
    try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        
        if (!userId) return []; // Jangan fetch jika belum login

        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId) // Filter hanya milik user ini
            .order('date', { ascending: false });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching transactions:', error.message);
        return [];
    }
};

export const createTransaction = async (transaction) => {
    try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        
        if (!userId) throw new Error("User not authenticated");

        const transactionWithUser = {
            ...transaction,
            user_id: userId // Otomatis masukkan ID user
        };

        const { data, error } = await supabase
            .from('transactions')
            .insert([transactionWithUser])
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error creating transaction:', error.message);
        return null;
    }
};

export const deleteTransaction = async (id) => {
    try {
        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting transaction:', error.message);
        return false;
    }
};

export const updateTransaction = async (id, updates) => {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error updating transaction:', error.message);
        return null;
    }
};

export const deleteAllTransactions = async () => {
    try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        
        if (!userId) throw new Error("User not authenticated");

        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('user_id', userId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting all transactions:', error.message);
        return false;
    }
};
