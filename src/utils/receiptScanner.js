import { createWorker } from 'tesseract.js';
import { normalizeCategory } from './format';

export const scanReceiptImage = async (imageFile, onProgress) => {
    try {
        const worker = await createWorker('ind+eng');
        
        if (onProgress) {
            onProgress('Membaca gambar nota...');
        }

        const { data: { text } } = await worker.recognize(imageFile);
        await worker.terminate();

        const cleanText = text || '';
        const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);

        // 1. Detect Amount (Nominal)
        let amount = 0;
        const totalLineRegex = /(total|grand\s*total|bayar|jumlah|subtotal|rp\.?|cash|dibayar)\s*:?\s*r?p?\.?\s*([\d\.,\s]+)/i;
        
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

        // Fallback: If no explicit TOTAL keyword line found, pick the largest numeric value
        if (amount === 0) {
            for (const line of lines) {
                const numberMatches = line.match(/\b\d{1,3}(?:\.\d{3})+(?!\d)|\b\d{4,8}\b/g);
                if (numberMatches) {
                    for (const numStr of numberMatches) {
                        const parsed = parseInt(numStr.replace(/\D/g, ''), 10);
                        if (parsed > 1000 && parsed < 100000000 && parsed > amount) {
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
        if (/\b(pemasukan|gaji|income|transfer masuk|cr|kredit|saldo masuk)\b/i.test(cleanText)) {
            type = 'pemasukan';
        }

        // 4. Detect Category
        const category = normalizeCategory(cleanText, type);

        // 5. Detect Description (Store/Merchant Name or Top line)
        let description = '';
        if (lines.length > 0) {
            // First non-numeric line usually contains store name
            const storeLine = lines.find(l => !/^\d+$/.test(l) && l.length > 3 && !/nota|receipt|struk/i.test(l));
            description = storeLine ? storeLine.substring(0, 50).trim() : 'Transaksi Foto Nota';
        }

        return {
            amount,
            date: dateStr,
            type,
            category,
            description,
            rawText: cleanText
        };
    } catch (error) {
        console.error('Error scanning receipt image:', error);
        throw error;
    }
};
