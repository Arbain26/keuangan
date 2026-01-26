import { supabase } from './supabaseClient';

export const fetchTransactions = async () => {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
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
        const { data, error } = await supabase
            .from('transactions')
            .insert([transaction])
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
