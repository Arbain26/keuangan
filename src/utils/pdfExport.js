import { formatCurrency, formatDate } from './format';

/**
 * Generate and download a corporate-grade PDF Financial Report
 */
export const exportToPdf = async ({
    transactions = [],
    user = null,
    currency = 'IDR',
    lang = 'id',
    exchangeRate = 16200,
    periodLabel = 'Semua Periode'
}) => {
    // 1. Dynamic import of jsPDF & autoTable on-demand to save bundle size
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default || (await import('jspdf-autotable'));

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const isUsd = currency === 'USD';
    const isEn = lang === 'en';

    const fmtVal = (val) => {
        const num = Number(val) || 0;
        if (isUsd) {
            const usd = num / exchangeRate;
            return '$' + usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return formatCurrency(num);
    };

    // Calculate totals
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals = {};

    transactions.forEach(t => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'pemasukan') {
            totalIncome += amt;
        } else if (t.type === 'pengeluaran') {
            totalExpense += amt;
            const cat = (t.category || 'lainnya').toLowerCase().trim();
            categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
        }
    });

    const netBalance = totalIncome - totalExpense;

    // ── PAGE HEADER & BRANDING ──
    const pageWidth = doc.internal.pageSize.getWidth();

    // Dark Navy Top Banner
    doc.setFillColor(30, 41, 59); // #1e293b
    doc.rect(0, 0, pageWidth, 28, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('KEUANGAN', 14, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225); // #cbd5e1
    doc.text(isEn ? 'Official Financial Statement & Ledger' : 'Laporan Keuangan & Buku Besar Kas Resmi', 14, 18);

    // Meta right side
    doc.setFontSize(8);
    const dateStr = new Date().toLocaleDateString(isEn ? 'en-US' : 'id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
    doc.text(`${isEn ? 'Date' : 'Tanggal'}: ${dateStr}`, pageWidth - 14, 11, { align: 'right' });
    doc.text(`${isEn ? 'Currency' : 'Mata Uang'}: ${currency} | ${periodLabel}`, pageWidth - 14, 16, { align: 'right' });
    doc.text(`${isEn ? 'Account' : 'Pengguna'}: ${user?.email || 'User'}`, pageWidth - 14, 21, { align: 'right' });

    let currentY = 36;

    // ── EXECUTIVE SUMMARY CARDS ──
    const cardWidth = (pageWidth - 28 - 8) / 3;
    const cardHeight = 22;

    // Card 1: Pemasukan (Income)
    doc.setFillColor(240, 253, 244); // light green
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(14, currentY, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(22, 101, 52); // green 800
    doc.text(isEn ? 'TOTAL INCOME' : 'TOTAL PEMASUKAN', 18, currentY + 6);

    doc.setFontSize(11);
    doc.setTextColor(21, 128, 61); // green 700
    doc.text(fmtVal(totalIncome), 18, currentY + 14);

    // Card 2: Pengeluaran (Expense)
    const card2X = 14 + cardWidth + 4;
    doc.setFillColor(254, 242, 242); // light red
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(card2X, currentY, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setTextColor(153, 27, 27); // red 800
    doc.text(isEn ? 'TOTAL EXPENSES' : 'TOTAL PENGELUARAN', card2X + 4, currentY + 6);

    doc.setFontSize(11);
    doc.setTextColor(185, 28, 28); // red 700
    doc.text(fmtVal(totalExpense), card2X + 4, currentY + 14);

    // Card 3: Saldo Bersih (Net Cash Flow)
    const card3X = card2X + cardWidth + 4;
    doc.setFillColor(239, 246, 255); // light blue
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(card3X, currentY, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setTextColor(30, 64, 175); // blue 800
    doc.text(isEn ? 'NET SURPLUS / BALANCE' : 'SALDO BERSIH KAS', card3X + 4, currentY + 6);

    doc.setFontSize(11);
    doc.setTextColor(netBalance >= 0 ? 37 : 185, netBalance >= 0 ? 99 : 28, netBalance >= 0 ? 235 : 28);
    doc.text(fmtVal(netBalance), card3X + 4, currentY + 14);

    currentY += cardHeight + 8;

    // ── SECTION: REKAP PENGELUARAN PER KATEGORI (TOP SPENDING) ──
    const sortedCats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

    if (sortedCats.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42); // slate 900
        doc.text(isEn ? 'Top Spending Breakdown by Category' : 'Rincian Pengeluaran Terbesar per Kategori', 14, currentY);

        currentY += 4;

        const catRows = sortedCats.slice(0, 6).map(([cat, amt], idx) => {
            const pct = totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(1) : '0';
            const catName = cat.charAt(0).toUpperCase() + cat.slice(1);
            return [String(idx + 1), catName, fmtVal(amt), `${pct}%`];
        });

        autoTable(doc, {
            startY: currentY,
            head: [[isEn ? 'No' : 'No', isEn ? 'Category' : 'Kategori', isEn ? 'Amount' : 'Nominal', isEn ? 'Share' : 'Porsi']],
            body: catRows,
            theme: 'grid',
            headStyles: {
                fillColor: [71, 85, 105], // #475569
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8,
                cellPadding: 2
            },
            bodyStyles: {
                fontSize: 8,
                cellPadding: 1.8
            },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 60 },
                2: { cellWidth: 50, halign: 'right' },
                3: { cellWidth: 30, halign: 'right' }
            },
            margin: { left: 14, right: 14 }
        });

        currentY = doc.lastAutoTable.finalY + 8;
    }

    // ── SECTION: RINCIAN BUKU BESAR TRANSAKSI ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(isEn ? 'Comprehensive Transaction Ledger' : 'Buku Besar Rincian Transaksi', 14, currentY);

    currentY += 4;

    let runningBalance = 0;
    const tableBody = transactions.map((t, idx) => {
        const amt = Number(t.amount) || 0;
        const isIncome = t.type === 'pemasukan';
        if (isIncome) {
            runningBalance += amt;
        } else {
            runningBalance -= amt;
        }

        const dateStr = t.date ? formatDate(t.date) : '-';
        const catName = (t.category || 'lainnya').charAt(0).toUpperCase() + (t.category || 'lainnya').slice(1);
        const desc = t.description || '-';

        return [
            String(idx + 1),
            dateStr,
            catName,
            desc.length > 35 ? desc.slice(0, 32) + '...' : desc,
            isIncome ? fmtVal(amt) : '-',
            !isIncome ? fmtVal(amt) : '-',
            fmtVal(runningBalance)
        ];
    });

    // Add totals summary footer row
    tableBody.push([
        '',
        isEn ? 'TOTAL' : 'TOTAL KESELURUHAN',
        '',
        '',
        fmtVal(totalIncome),
        fmtVal(totalExpense),
        fmtVal(netBalance)
    ]);

    autoTable(doc, {
        startY: currentY,
        head: [[
            isEn ? 'No' : 'No',
            isEn ? 'Date' : 'Tanggal',
            isEn ? 'Category' : 'Kategori',
            isEn ? 'Description' : 'Keterangan',
            isEn ? 'Income' : 'Pemasukan',
            isEn ? 'Expense' : 'Pengeluaran',
            isEn ? 'Balance' : 'Saldo'
        ]],
        body: tableBody,
        theme: 'striped',
        headStyles: {
            fillColor: [29, 78, 216], // Blue 700
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
            cellPadding: 2.2
        },
        bodyStyles: {
            fontSize: 7.5,
            cellPadding: 1.8
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252] // slate 50
        },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 22, halign: 'center' },
            2: { cellWidth: 26 },
            3: { cellWidth: 44 },
            4: { cellWidth: 26, halign: 'right', textColor: [22, 101, 52] },
            5: { cellWidth: 26, halign: 'right', textColor: [185, 28, 28] },
            6: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: (data) => {
            // Bold & style total summary row at end
            if (data.row.index === tableBody.length - 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [241, 245, 249];
            }
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
            // Footer with page numbering
            const totalPages = doc.internal.getNumberOfPages();
            const pageNum = data.pageNumber;
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184); // #94a3b8
            doc.text(
                `Keuangan App • ${isEn ? 'Page' : 'Halaman'} ${pageNum} ${isEn ? 'of' : 'dari'} ${totalPages}`,
                pageWidth / 2,
                doc.internal.pageSize.getHeight() - 8,
                { align: 'center' }
            );
        }
    });

    // ── SAVE / DOWNLOAD THE PDF FILE ──
    const fileName = `Keuangan_Laporan_${currency}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    return true;
};
