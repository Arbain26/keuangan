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

        // 1. Detect Amount (Nominal)
        let amount = 0;
        const totalLineRegex = /(total|grand\s*total|bayar|jumlah|subtotal|rp\.?|cash|tunai|dibayar|netto|tagihan|harga\s*total)\s*:?\s*r?p?\.?\s*([\d\.,\s]+)/i;
        
        for (const line of lines) {
            const match = line.match(totalLineRegex);
            if (match && match[2]) {
                const digitsOnly = match[2].replace(/\D/g, '');
                const parsedAmt = parseInt(digitsOnly, 10);
                if (parsedAmt > 0 && parsedAmt > amount) {
                    amount = parsedAmt;
                }
            }
        }

        // Fallback: If no explicit TOTAL keyword line found, pick the largest plausible numeric value
        if (amount === 0) {
            for (const line of lines) {
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

        // 2. Detect Date (Tanggal)
        let dateStr = new Date().toISOString().split('T')[0];
        const dateRegex = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b|\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/;
        for (const line of lines) {
            const dateMatch = line.match(dateRegex);
            if (dateMatch) {
                if (dateMatch[1] && dateMatch[2] && dateMatch[3]) {
                    const day = dateMatch[1].padStart(2, '0');
                    const month = dateMatch[2].padStart(2, '0');
                    let year = dateMatch[3];
                    if (year.length === 2) year = '20' + year;
                    if (parseInt(month) <= 12 && parseInt(day) <= 31) {
                        dateStr = `${year}-${month}-${day}`;
                        break;
                    }
                } else if (dateMatch[4] && dateMatch[5] && dateMatch[6]) {
                    const year = dateMatch[4];
                    const month = dateMatch[5].padStart(2, '0');
                    const day = dateMatch[6].padStart(2, '0');
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

        // 5. Detect Description (Store/Merchant Name) - ignoring phone status bar noise
        let description = '-';
        if (lines.length > 0) {
            const isStatusBarLine = (l) => 
                /\b\d{1,2}[\.:]\d{2}\b/.test(l) ||            // Time format like 12.45 or 12:45
                /%/.test(l) ||                                // Battery percentage like 49%
                /\b(4g|5g|lte|volte|ge|wifi|3g)\b/i.test(l) || // Phone network indicators
                /^\d+$/.test(l) ||                            // Pure numbers
                /nota|receipt|struk|faktur|bill|invoice|selamat\s*datang/i.test(l);

            const storeLine = lines.find(l => l.length >= 3 && !isStatusBarLine(l));
            if (storeLine) {
                const cleanedStore = storeLine.substring(0, 60).trim();
                // Ensure cleanedStore doesn't contain status bar noise
                if (cleanedStore && !isStatusBarLine(cleanedStore)) {
                    description = cleanedStore;
                }
            }
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
