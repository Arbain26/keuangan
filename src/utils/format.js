export const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return 'Rp0';
    try {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    } catch (e) {
        return 'Rp' + amount;
    }
};

export const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString || '-';
    try {
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    } catch (e) {
        return dateString;
    }
};
