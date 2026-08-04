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

export const normalizeCategory = (categoryInput, type = 'pengeluaran') => {
    if (!categoryInput || categoryInput.toString().trim() === '-' || categoryInput.toString().trim() === '') {
        return type === 'pemasukan' ? 'gaji' : 'lainnya';
    }

    const c = categoryInput.toString().trim().toLowerCase();

    // Standard category direct matches
    if (['makanan & minuman', 'makanan dan minuman', 'makanan&minuman', 'makanan', 'minuman'].includes(c)) {
        return 'makanan & minuman';
    }
    if (['transportasi', 'transport'].includes(c)) return 'transportasi';
    if (['belanja'].includes(c)) return 'belanja';
    if (['hiburan', 'hiburan/rekreasi', 'rekreasi'].includes(c)) return 'hiburan';
    if (['utilitas', 'tagihan & utilitas', 'tagihan', 'utilitas & tagihan'].includes(c)) return 'utilitas';
    if (['kesehatan'].includes(c)) return 'kesehatan';
    if (['gaji', 'gaji/pendapatan', 'pendapatan', 'pemasukan'].includes(c)) return 'gaji';
    if (['investasi'].includes(c)) return 'investasi';

    // Makanan & Minuman keywords
    if (['makan', 'minum', 'kopi', 'jajan', 'bukber', 'takjil', 'telur', 'nasi', 'ayam', 'warung', 'restoran', 'kafe', 'seporsi'].some(k => c.includes(k))) {
        return 'makanan & minuman';
    }

    // Transportasi keywords
    if (['bensin', 'parkir', 'tambal ban', 'bengkel', 'ganti oli', 'perbaikan', 'ojek', 'grab', 'gojek', 'servis', 'tol'].some(k => c.includes(k))) {
        return 'transportasi';
    }

    // Utilitas keywords
    if (['pulsa', 'paket data', 'internet', 'listrik', 'pln', 'pdam', 'wifi', 'air'].some(k => c.includes(k))) {
        return 'utilitas';
    }

    // Hiburan keywords
    if (['game', 'nonton', 'tiket', 'wisuda', 'acaraan', 'rama tama', 'foto', 'cukur'].some(k => c.includes(k))) {
        return 'hiburan';
    }

    // Belanja keywords
    if (['sabun', 'kaos kaki', 'odol', 'minyak', 'farfum', 'parfum', 'baju', 'celana', 'sepatu', 'kertas', 'berkas', 'selempang'].some(k => c.includes(k))) {
        return 'belanja';
    }

    // Kesehatan keywords
    if (['obat', 'dokter', 'klinik', 'rumahsakit', 'apotek'].some(k => c.includes(k))) {
        return 'kesehatan';
    }

    // Gaji / Income keywords
    if (type === 'pemasukan' || ['gaji', 'pemasukan', 'transfer', 'thr', 'cashback', 'bonus', 'uang kertas'].some(k => c.includes(k))) {
        return 'gaji';
    }

    // Investasi keywords
    if (['investasi', 'saham', 'reksadana', 'crypto', 'tabungan'].some(k => c.includes(k))) {
        return 'investasi';
    }

    return c;
};

