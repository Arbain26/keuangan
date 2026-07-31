export const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return 'Rp0';
    try {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    } catch {
        return 'Rp' + amount;
    }
};

export const formatDate = (dateString) => {
    if (!dateString) return '-';
    
    // Parse YYYY-MM-DD format safely to avoid timezone shifting
    if (typeof dateString === 'string' && dateString.includes('-')) {
        const parts = dateString.split('T')[0].split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            const date = new Date(year, month, day);
            if (!isNaN(date.getTime())) {
                try {
                    return date.toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                    });
                } catch {
                    return dateString;
                }
            }
        }
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString || '-';
    try {
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    } catch {
        return dateString;
    }
};
