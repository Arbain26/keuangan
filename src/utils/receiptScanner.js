import { normalizeCategory } from './format';

export const scanReceiptImage = async (imageFile, onProgress) => {
    try {
        if (onProgress) {
            onProgress('Menginisialisasi pemindai OCR...');
        }

        // Dynamic import of tesseract.js to save bundle size on initial page load
        const { createWorker } = await import('tesseract.js');
        
        let worker;
        try {
            worker = await createWorker('ind+eng');
        } catch {
            // Fallback to English if ind language traineddata download fails
            worker = await createWorker('eng');
        }
        
        if (onProgress) {
            onProgress('Membaca teks dari foto struk...');
        }

        const { data: { text } } = await worker.recognize(imageFile);
        await worker.terminate();

        const cleanText = text || '';
        const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);

        // 1. Detect Amount (Nominal) - Preference for "Total Belanja" / "Grand Total" / "Total Netto"
        let amount = 0;
        
        // Priority 1: Net Total lines like "Total Belanja", "Grand Total", "Total Netto", "Total Tagihan", "Total Bayar"
        const netTotalRegex = /(total\s*belanja|total\s*netto|grand\s*total|total\s*tagihan|total\s*bayar)\s*:?\s*r?p?\.?\s*([\d\.,\s]+)/i;
        for (const line of lines) {
            const match = line.match(netTotalRegex);
            if (match && match[2]) {
                const digitsOnly = match[2].replace(/\D/g, '');
                const parsedAmt = parseInt(digitsOnly, 10);
                if (parsedAmt > 0) {
                    amount = parsedAmt;
                    break;
                }
            }
        }

        // Priority 2: General total lines (excluding Tunai / Kembalian)
        if (amount === 0) {
            const totalLineRegex = /(total|subtotal|jumlah|bayar|netto|tagihan|harga\s*total)\s*:?\s*r?p?\.?\s*([\d\.,\s]+)/i;
            for (const line of lines) {
                if (/tunai|kembali|kembalian|cash/i.test(line)) continue; // skip cash tendered / change lines
                const match = line.match(totalLineRegex);
                if (match && match[2]) {
                    const digitsOnly = match[2].replace(/\D/g, '');
                    const parsedAmt = parseInt(digitsOnly, 10);
                    if (parsedAmt > 0 && parsedAmt > amount) {
                        amount = parsedAmt;
                    }
                }
            }
        }

        // Priority 3 Fallback: Pick largest numeric value between 1,000 and 500,000,000
        if (amount === 0) {
            for (const line of lines) {
                if (/tunai|kembali|kembalian|cash/i.test(line)) continue;
                const numberMatches = line.match(/\b\d{1,3}(?:\.\d{3})+(?!\d)|\b\d{4,8}\b/g);
                if (numberMatches) {
                    for (const numStr of numberMatches) {
                        const parsed = parseInt(numStr.replace(/\D/g, ''), 10);
                        if (parsed >= 1000 && parsed <= 500000000 && parsed > amount) {
                            amount = parsed;
                        }
                    }
                }
            }
        }

        // 2. Detect Date (Tanggal) - Format Tgl. DD-MM-YYYY
        let dateStr = new Date().toISOString().split('T')[0];
        const dateRegex = /\b(?:tgl|tanggal|date)[\.\s:]*\s*(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2,4})\b|\b(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2,4})\b|\b(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})\b/i;
        
        for (const line of lines) {
            const dateMatch = line.match(dateRegex);
            if (dateMatch) {
                const day = (dateMatch[1] || dateMatch[4] || dateMatch[9]).padStart(2, '0');
                const month = (dateMatch[2] || dateMatch[5] || dateMatch[8]).padStart(2, '0');
                let year = dateMatch[3] || dateMatch[6] || dateMatch[7];
                if (year && year.length === 2) year = '20' + year;
                
                if (year && year.length === 4 && parseInt(month) <= 12 && parseInt(day) <= 31) {
                    dateStr = `${year}-${month}-${day}`;
                    break;
                }
            }
        }

        // 3. Detect Type (Pemasukan vs Pengeluaran)
        let type = 'pengeluaran';
        if (/\b(pemasukan|gaji|income|transfer masuk|cr|kredit|saldo masuk|penjualan)\b/i.test(cleanText)) {
            type = 'pemasukan';
        }

        // 4. Detect Category
        const category = normalizeCategory(cleanText, type);

        // 5. Detect Items Purchased & Merchant Store Name -> Combine into Description
        let description = '-';
        const isIgnoredLine = (l) => 
            /\b\d{1,2}[\.:]\d{2}\b/.test(l) ||                      // Time format like 12.45 or 12:45
            /%/.test(l) ||                                          // Battery percentage like 49%
            /\b(4g|5g|lte|volte|ge|wifi|3g)\b/i.test(l) ||           // Phone network indicators
            /^\d+$/.test(l) ||                                      // Pure numbers
            /^[^\w\s]+$/.test(l) ||                                 // Pure symbols
            /\b(total|disc|diskon|tunai|kembali|kembalian|ppn|dpp|tgl|tanggal|jam|kasir|member|kritik|saran|scan|qr|alamat|telp|faktur|nota|receipt|struk|selamat|terima|kASIR)\b/i.test(l);

        // Extract Store Name (First valid non-ignored header line)
        let storeName = '';
        const headerCandidate = lines.find(l => l.length >= 3 && !isIgnoredLine(l));
        if (headerCandidate) {
            const cleanedHeader = headerCandidate.replace(/[©®™|~*^\\<>{}[\]]/g, '').replace(/\s+/g, ' ').trim();
            if (cleanedHeader && cleanedHeader.length >= 3 && !isIgnoredLine(cleanedHeader)) {
                storeName = cleanedHeader;
            }
        }

        // Extract Itemized Purchased List
        const items = [];
        for (const line of lines) {
            // Check if line looks like an item description
            if (
                line.length >= 3 && 
                /[a-zA-Z]{2,}/.test(line) && 
                !isIgnoredLine(line) &&
                !/\b(disc|diskon)\b/i.test(line)
            ) {
                // Clean quantity & price tail from item line (e.g. "TWISTKO XGG 70G 1 16,600" -> "TWISTKO XGG 70G")
                let cleanItem = line
                    .replace(/[©®™|~*^\\<>{}[\]]/g, '')
                    .replace(/\s+\d+\s+[\d\.,\s]+$/, '')
                    .replace(/\s+[\d\.,]+$/, '')
                    .replace(/\s+/g, ' ')
                    .trim();

                if (
                    cleanItem && 
                    cleanItem.length >= 3 && 
                    cleanItem !== storeName && 
                    !items.includes(cleanItem) &&
                    !isIgnoredLine(cleanItem)
                ) {
                    items.push(cleanItem);
                }
            }
        }

        if (items.length > 0) {
            const itemString = items.slice(0, 15).join(', ');
            description = storeName ? `${storeName}: ${itemString}` : itemString;
        } else if (storeName) {
            description = storeName;
        }

        return {
            amount,
            date: dateStr,
            type,
            category: category || 'lainnya',
            description: description || '-',
            rawText: cleanText
        };
    } catch (error) {
        console.error('Error scanning receipt image:', error);
        throw error;
    }
};
