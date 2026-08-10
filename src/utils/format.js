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
        return type === 'pemasukan' ? 'gaji' : 'makanan & minuman';
    }

    const c = categoryInput.toString().trim().toLowerCase();

    // Standard category direct matches
    if (['makanan & minuman', 'makanan dan minuman', 'makanan&minuman', 'makanan', 'minuman', 'kuliner', 'resto', 'snack', 'cafe', 'kafe', 'warung'].includes(c)) {
        return 'makanan & minuman';
    }
    if (['transportasi', 'transport', 'bensin', 'spbu', 'pertamina', 'shell'].includes(c)) return 'transportasi';
    if (['pendidikan', 'pendidikan / kuliah', 'kuliah', 'pendidikan/kuliah', 'spp', 'ukt', 'kampus'].includes(c)) return 'pendidikan';
    if (['belanja', 'supermarket', 'minimarket', 'indomaret', 'alfamart', 'toko'].includes(c)) return 'belanja';
    if (['hiburan', 'hiburan/rekreasi', 'rekreasi', 'nonton', 'bioskop'].includes(c)) return 'hiburan';
    if (['utilitas', 'tagihan & utilitas', 'tagihan', 'utilitas & tagihan', 'pln', 'pdam', 'pulsa', 'wifi', 'internet'].includes(c)) return 'utilitas';
    if (['kesehatan', 'obat', 'apotek', 'klinik', 'dokter'].includes(c)) return 'kesehatan';
    if (['gaji', 'gaji/pendapatan', 'pendapatan', 'pemasukan'].includes(c)) return 'gaji';
    if (['investasi'].includes(c)) return 'investasi';

    // Keywords check
    if (['spp', 'berkas', 'kuliah', 'kampus', 'seminar', 'skripsi', 'turnitin', 'wisuda', 'ijazah', 'ukt'].some(k => c.includes(k))) return 'pendidikan';
    if (['makan', 'minum', 'kopi', 'jajan', 'bukber', 'takjil', 'telur', 'nasi', 'ayam', 'warung', 'restoran', 'kafe', 'popmie', 'indomie', 'sedaap', 'snack', 'roti', 'teh', 'boba', 'jus', 'susu'].some(k => c.includes(k))) return 'makanan & minuman';
    if (['bensin', 'parkir', 'bengkel', 'oli', 'ojek', 'grab', 'gojek', 'tol'].some(k => c.includes(k))) return 'transportasi';
    if (['pulsa', 'paket data', 'internet', 'listrik', 'pln', 'pdam', 'wifi', 'air'].some(k => c.includes(k))) return 'utilitas';
    if (['game', 'nonton', 'tiket', 'cukur'].some(k => c.includes(k))) return 'hiburan';
    if (['sabun', 'shampoo', 'pasta gigi', 'odol', 'minyak', 'parfum', 'baju', 'celana', 'sepatu', 'indomaret', 'alfamart', 'superindo', 'mart'].some(k => c.includes(k))) return 'belanja';
    if (['obat', 'dokter', 'klinik', 'rumahsakit', 'apotek'].some(k => c.includes(k))) return 'kesehatan';
    if (type === 'pemasukan' || ['gaji', 'pemasukan', 'transfer', 'thr', 'cashback', 'bonus'].some(k => c.includes(k))) return 'gaji';
    if (['investasi', 'saham', 'reksadana', 'crypto', 'tabungan'].some(k => c.includes(k))) return 'investasi';

    // ALWAYS fallback to standard valid category ID! Never return raw OCR garbage!
    return type === 'pemasukan' ? 'gaji' : 'makanan & minuman';
};


