import { normalizeCategory } from './format';

/**
 * Utility helpers for Excel cell and date parsing.
 * Conforms to HANDBOOK_CLEANCODE.md Section 3 (Single Responsibility & Clean Functions).
 */

export const getLocalDateString = (dateObj) => {
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '';
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const getUTCDateString = (dateObj) => {
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '';
    const year = dateObj.getUTCFullYear();
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const getCellValue = (cell) => {
    if (!cell) return '';
    const val = cell.value;
    if (val === null || val === undefined) return '';

    // If it is a formula
    if (typeof val === 'object' && val.formula !== undefined && val.result !== undefined) {
        return val.result;
    }

    // If it is a hyperlink
    if (typeof val === 'object' && val.text !== undefined && val.hyperlink !== undefined) {
        return val.text;
    }

    // If it is rich text
    if (typeof val === 'object' && Array.isArray(val.richText)) {
        return val.richText.map(item => item.text || '').join('');
    }

    return val;
};

export const parseIndonesianDate = (str) => {
    if (!str) return null;
    const cleaned = str.toString().toLowerCase().trim()
        .replace(/[\s\-,]+/g, ' ');

    const monthsMap = {
        jan: '01', januari: '01',
        feb: '02', februari: '02',
        mar: '03', maret: '03',
        apr: '04', april: '04',
        mei: '05',
        jun: '06', juni: '06',
        jul: '07', juli: '07',
        agt: '08', agust: '08', agustus: '08',
        sep: '09', september: '09',
        okt: '10', oktober: '10',
        nov: '11', november: '11',
        des: '12', desember: '12'
    };

    const words = cleaned.split(' ');
    if (words.length >= 3) {
        const dayPart = words[0];
        const monthPart = words[1];
        let yearPart = words[2];

        const dayNum = parseInt(dayPart, 10);
        const monthNum = monthsMap[monthPart];

        if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31 && monthNum && yearPart) {
            let year = yearPart;
            if (year.length === 2) {
                year = (Number(year) < 70 ? '20' : '19') + year;
            }
            if (year.length === 4) {
                const day = String(dayNum).padStart(2, '0');
                return `${year}-${monthNum}-${day}`;
            }
        }
    }
    return null;
};

export const parseExcelDate = (val) => {
    if (val instanceof Date) {
        return getUTCDateString(val);
    }
    if (val === null || val === undefined) {
        return getLocalDateString(new Date());
    }
    if (typeof val === 'string') {
        const cleaned = val.trim();
        const indoParsed = parseIndonesianDate(cleaned);
        if (indoParsed) return indoParsed;

        const match = cleaned.match(/^(\d{2,4})[-/](\d{1,2})[-/](\d{1,2})/);
        if (match) {
            let year = match[1];
            if (year.length === 2) {
                year = (Number(year) < 70 ? '20' : '19') + year;
            }
            const month = match[2].padStart(2, '0');
            const day = match[3].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        const matchDDMM = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
        if (matchDDMM) {
            const day = matchDDMM[1].padStart(2, '0');
            const month = matchDDMM[2].padStart(2, '0');
            let year = matchDDMM[3];
            if (year.length === 2) {
                year = (Number(year) < 70 ? '20' : '19') + year;
            }
            return `${year}-${month}-${day}`;
        }

        const parsed = new Date(cleaned);
        if (!isNaN(parsed.getTime())) {
            return getLocalDateString(parsed);
        }
    }
    if (typeof val === 'number') {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const dateVal = new Date(excelEpoch.getTime() + val * 24 * 60 * 60 * 1000);
        return getUTCDateString(dateVal);
    }
    return getLocalDateString(new Date());
};

/**
 * Exports financial ledger to styled professional multi-sheet Excel workbook.
 */
export async function exportTransactionsToExcel({
    transactions,
    currency = 'IDR',
    exchangeRate = 16200,
    userEmail = 'admin@keuangan.id',
    displayDateFn,
    ChartJS
}) {
    const isUsd = currency === 'USD';
    const numFmt = isUsd ? '$#,##0.00' : '#,##0';

    // 1. Aggregate category spending
    const categoryTotals = {};
    transactions
        .filter(tx => tx.type === 'pengeluaran')
        .forEach(tx => {
            const cat = tx.category || 'Lainnya';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(tx.amount);
        });
    const sortedCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    // 2. Render chart on hidden off-screen canvas if ChartJS provided
    let imageBase64 = null;
    if (sortedCategories.length > 0 && typeof document !== 'undefined' && ChartJS) {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        canvas.style.position = 'absolute';
        canvas.style.left = '-9999px';
        document.body.appendChild(canvas);

        const chartColors = [
            '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd',
            '#f59e0b', '#ec4899', '#8b5cf6', '#10b981'
        ];

        const chartInstance = new ChartJS(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: sortedCategories.map(([cat]) =>
                    cat.charAt(0).toUpperCase() + cat.slice(1)
                ),
                datasets: [{
                    label: isUsd ? 'Expenses (USD)' : 'Pengeluaran (Rp)',
                    data: sortedCategories.map(([, amt]) => isUsd ? +(amt / exchangeRate).toFixed(2) : amt),
                    backgroundColor: chartColors.slice(0, sortedCategories.length),
                    borderRadius: 6,
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: false,
                animation: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: isUsd ? 'Top Expenses by Category' : 'Pengeluaran Terbanyak per Kategori',
                        font: { size: 14, weight: 'bold' },
                        padding: { bottom: 12 }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            callback: (v) => isUsd ? '$' + Number(v).toLocaleString('en-US') : 'Rp ' + Number(v).toLocaleString('id-ID')
                        },
                        grid: { color: '#f1f5f9' }
                    },
                    y: { grid: { display: false } }
                }
            }
        });

        await new Promise(r => setTimeout(r, 250));
        imageBase64 = canvas.toDataURL('image/png').split(',')[1];
        chartInstance.destroy();
        document.body.removeChild(canvas);
    }

    // 3. Build Multi-Sheet Workbook
    const ExcelJSModule = await import('exceljs');
    const ExcelJS = ExcelJSModule.default || ExcelJSModule;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Keuangan Financial Intelligence';
    workbook.lastModifiedBy = userEmail;
    workbook.created = new Date();
    workbook.modified = new Date();

    const thinBorder = {
        top:    { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left:   { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right:  { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };

    const doubleBottomBorder = {
        top:    { style: 'thin', color: { argb: 'FF475569' } },
        bottom: { style: 'double', color: { argb: 'FF0F172A' } },
        left:   { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right:  { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };

    // SHEET 1: EXECUTIVE FINANCIAL SUMMARY & CHARTS
    const summarySheet = workbook.addWorksheet(isUsd ? 'Executive Summary' : 'Ringkasan Eksekutif');
    summarySheet.views = [{ showGridLines: true }];

    summarySheet.mergeCells('A1:H1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'KEUANGAN FINANCIAL INTELLIGENCE REPORT';
    titleCell.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(1).height = 36;

    summarySheet.mergeCells('A2:H2');
    const subTitleCell = summarySheet.getCell('A2');
    subTitleCell.value = `Export Date: ${new Date().toLocaleDateString('en-GB')} | Currency: ${currency} | User: ${userEmail}`;
    subTitleCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
    subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(2).height = 20;

    summarySheet.mergeCells('A4:H4');
    const kpiHeader = summarySheet.getCell('A4');
    kpiHeader.value = isUsd ? 'KEY FINANCIAL METRICS (REAL-TIME EXCEL FORMULAS)' : 'METRIK KEUANGAN UTAMA (RUMUS EXCEL REAL-TIME)';
    kpiHeader.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
    summarySheet.getRow(4).height = 20;

    const totalRowsData = transactions.length;
    const dataEndRow = Math.max(totalRowsData + 1, 2);
    const dataSheetName = isUsd ? 'Transactions Data' : 'Data Transaksi';
    const dataSheetRef = `'${dataSheetName}'`;

    const calcTotalIncome = transactions
        .filter(tx => tx.type === 'pemasukan')
        .reduce((s, tx) => s + (isUsd ? +(Number(tx.amount) / exchangeRate) : Number(tx.amount)), 0);

    const calcTotalExpense = transactions
        .filter(tx => tx.type === 'pengeluaran')
        .reduce((s, tx) => s + (isUsd ? +(Number(tx.amount) / exchangeRate) : Number(tx.amount)), 0);

    const calcNet = calcTotalIncome - calcTotalExpense;

    // KPI Cards
    summarySheet.mergeCells('A5:B5');
    summarySheet.getCell('A5').value = isUsd ? 'TOTAL REVENUE (INCOME)' : 'TOTAL PEMASUKAN';
    summarySheet.getCell('A5').font = { size: 9, bold: true, color: { argb: 'FF065F46' } };
    summarySheet.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    summarySheet.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };

    summarySheet.mergeCells('A6:B6');
    const revValCell = summarySheet.getCell('A6');
    revValCell.value = { formula: `SUM(${dataSheetRef}!E$2:E$${dataEndRow})`, result: calcTotalIncome };
    revValCell.font = { size: 14, bold: true, color: { argb: 'FF047857' } };
    revValCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
    revValCell.alignment = { horizontal: 'center', vertical: 'middle' };
    revValCell.numFmt = numFmt;

    summarySheet.mergeCells('C5:D5');
    summarySheet.getCell('C5').value = isUsd ? 'TOTAL EXPENSES' : 'TOTAL PENGELUARAN';
    summarySheet.getCell('C5').font = { size: 9, bold: true, color: { argb: 'FF9F1239' } };
    summarySheet.getCell('C5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } };
    summarySheet.getCell('C5').alignment = { horizontal: 'center', vertical: 'middle' };

    summarySheet.mergeCells('C6:D6');
    const expValCell = summarySheet.getCell('C6');
    expValCell.value = { formula: `SUM(${dataSheetRef}!F$2:F$${dataEndRow})`, result: calcTotalExpense };
    expValCell.font = { size: 14, bold: true, color: { argb: 'FFBE123C' } };
    expValCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } };
    expValCell.alignment = { horizontal: 'center', vertical: 'middle' };
    expValCell.numFmt = numFmt;

    summarySheet.mergeCells('E5:F5');
    summarySheet.getCell('E5').value = isUsd ? 'NET CASHFLOW (BALANCE)' : 'SALDO BERSIH (NET)';
    summarySheet.getCell('E5').font = { size: 9, bold: true, color: { argb: 'FF1E40AF' } };
    summarySheet.getCell('E5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
    summarySheet.getCell('E5').alignment = { horizontal: 'center', vertical: 'middle' };

    summarySheet.mergeCells('E6:F6');
    const netValCell = summarySheet.getCell('E6');
    netValCell.value = { formula: 'A6-C6', result: calcNet };
    netValCell.font = { size: 14, bold: true, color: { argb: 'FF1D4ED8' } };
    netValCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
    netValCell.alignment = { horizontal: 'center', vertical: 'middle' };
    netValCell.numFmt = numFmt;

    summarySheet.mergeCells('G5:H5');
    summarySheet.getCell('G5').value = isUsd ? 'TRANSACTIONS COUNT' : 'JUMLAH TRANSAKSI';
    summarySheet.getCell('G5').font = { size: 9, bold: true, color: { argb: 'FF78350F' } };
    summarySheet.getCell('G5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    summarySheet.getCell('G5').alignment = { horizontal: 'center', vertical: 'middle' };

    summarySheet.mergeCells('G6:H6');
    const countValCell = summarySheet.getCell('G6');
    countValCell.value = { formula: `COUNTA(${dataSheetRef}!B$2:B$${dataEndRow})`, result: totalRowsData };
    countValCell.font = { size: 14, bold: true, color: { argb: 'FFB45309' } };
    countValCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
    countValCell.alignment = { horizontal: 'center', vertical: 'middle' };
    countValCell.numFmt = '#,##0';

    ['A','B','C','D','E','F','G','H'].forEach(col => {
        summarySheet.getCell(`${col}5`).border = thinBorder;
        summarySheet.getCell(`${col}6`).border = thinBorder;
    });

    // Category Breakdown Table
    const catStartRow = 9;
    summarySheet.mergeCells(`A${catStartRow}:D${catStartRow}`);
    const catHeaderCell = summarySheet.getCell(`A${catStartRow}`);
    catHeaderCell.value = isUsd ? 'EXPENSE BREAKDOWN BY CATEGORY' : 'RINCIAN PENGELUARAN PER KATEGORI';
    catHeaderCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
    summarySheet.getRow(catStartRow).height = 22;

    const catHeaderRow = catStartRow + 1;
    summarySheet.getRow(catHeaderRow).values = [
        '#',
        isUsd ? 'Category' : 'Kategori Pos',
        isUsd ? 'Total Amount' : 'Total Pengeluaran',
        isUsd ? '% Share' : '% dari Total'
    ];
    summarySheet.getRow(catHeaderRow).height = 20;

    ['A','B','C','D'].forEach(col => {
        const c = summarySheet.getCell(`${col}${catHeaderRow}`);
        c.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
        c.alignment = { horizontal: (col === 'C' || col === 'D') ? 'right' : 'center', vertical: 'middle' };
        c.border = thinBorder;
    });

    let currentCatRow = catHeaderRow + 1;
    sortedCategories.forEach(([cat, rawAmt], idx) => {
        const amtVal = isUsd ? +(rawAmt / exchangeRate).toFixed(2) : rawAmt;
        const r = summarySheet.getRow(currentCatRow);
        r.height = 18;

        const cellIdx = summarySheet.getCell(`A${currentCatRow}`);
        cellIdx.value = idx + 1;
        cellIdx.alignment = { horizontal: 'center' };

        const catDisplay = cat.charAt(0).toUpperCase() + cat.slice(1);
        const cellCat = summarySheet.getCell(`B${currentCatRow}`);
        cellCat.value = catDisplay;
        cellCat.font = { bold: true };

        const cellAmt = summarySheet.getCell(`C${currentCatRow}`);
        cellAmt.value = {
            formula: `SUMIF(${dataSheetRef}!C$2:C$${dataEndRow}, "${catDisplay}", ${dataSheetRef}!F$2:F$${dataEndRow})`,
            result: amtVal
        };
        cellAmt.numFmt = numFmt;
        cellAmt.alignment = { horizontal: 'right' };

        const cellPct = summarySheet.getCell(`D${currentCatRow}`);
        cellPct.value = {
            formula: `C${currentCatRow}/C$6`,
            result: calcTotalExpense > 0 ? (amtVal / calcTotalExpense) : 0
        };
        cellPct.numFmt = '0.0%';
        cellPct.alignment = { horizontal: 'right' };

        ['A','B','C','D'].forEach(col => {
            const cell = summarySheet.getCell(`${col}${currentCatRow}`);
            cell.border = thinBorder;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC' } };
        });

        currentCatRow++;
    });

    // Category Total
    const catTotalRow = currentCatRow;
    summarySheet.getCell(`A${catTotalRow}`).value = '';
    summarySheet.getCell(`B${catTotalRow}`).value = isUsd ? 'TOTAL EXPENSES' : 'TOTAL PENGELUARAN';
    summarySheet.getCell(`B${catTotalRow}`).font = { bold: true, size: 9 };

    const catTotalAmtCell = summarySheet.getCell(`C${catTotalRow}`);
    catTotalAmtCell.value = { formula: `SUM(C${catHeaderRow + 1}:C${catTotalRow - 1})`, result: calcTotalExpense };
    catTotalAmtCell.font = { bold: true };
    catTotalAmtCell.numFmt = numFmt;
    catTotalAmtCell.alignment = { horizontal: 'right' };

    const catTotalPctCell = summarySheet.getCell(`D${catTotalRow}`);
    catTotalPctCell.value = { formula: `SUM(D${catHeaderRow + 1}:D${catTotalRow - 1})`, result: 1.0 };
    catTotalPctCell.font = { bold: true };
    catTotalPctCell.numFmt = '0.0%';
    catTotalPctCell.alignment = { horizontal: 'right' };

    ['A','B','C','D'].forEach(col => {
        const cell = summarySheet.getCell(`${col}${catTotalRow}`);
        cell.border = doubleBottomBorder;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    });

    summarySheet.getColumn('A').width = 6;
    summarySheet.getColumn('B').width = 24;
    summarySheet.getColumn('C').width = 20;
    summarySheet.getColumn('D').width = 16;
    summarySheet.getColumn('E').width = 16;
    summarySheet.getColumn('F').width = 16;
    summarySheet.getColumn('G').width = 16;
    summarySheet.getColumn('H').width = 16;

    if (imageBase64) {
        const imageId = workbook.addImage({ base64: imageBase64, extension: 'png' });
        summarySheet.addImage(imageId, {
            tl: { col: 4.8, row: 8 },
            br: { col: 8.5, row: Math.max(currentCatRow + 5, 24) },
            editAs: 'oneCell',
        });
    }

    // SHEET 2: RAW TRANSACTIONS DATA
    const dataSheet = workbook.addWorksheet(dataSheetName);
    dataSheet.views = [{ showGridLines: true }];

    dataSheet.columns = [
        { header: isUsd ? 'No' : 'No',                  key: 'no',          width: 8 },
        { header: isUsd ? 'Date' : 'Tanggal',           key: 'tanggal',     width: 16 },
        { header: isUsd ? 'Category' : 'Kategori',      key: 'kategori',    width: 22 },
        { header: isUsd ? 'Description' : 'Keterangan', key: 'keterangan',  width: 34 },
        { header: isUsd ? 'Income' : 'Pemasukan',       key: 'pemasukan',   width: 18 },
        { header: isUsd ? 'Expense' : 'Pengeluaran',    key: 'pengeluaran', width: 18 },
        { header: isUsd ? 'Balance' : 'Saldo',          key: 'saldo',       width: 20 },
    ];

    const dataHeaderRow = dataSheet.getRow(1);
    dataHeaderRow.height = 24;
    ['A','B','C','D','E','F','G'].forEach((col, i) => {
        const cell = dataSheet.getCell(`${col}1`);
        cell.font  = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
        cell.alignment = {
            horizontal: (i === 4 || i === 5 || i === 6) ? 'right' : ((i === 0 || i === 1) ? 'center' : 'left'),
            vertical: 'middle'
        };
        cell.border = thinBorder;
    });

    let runningBalance = 0;
    transactions.forEach((tx, idx) => {
        const rowNum = idx + 2;
        const amtNumber = isUsd ? +(Number(tx.amount) / exchangeRate).toFixed(2) : Number(tx.amount);
        const isIncome = tx.type === 'pemasukan';
        const incomeVal = isIncome ? amtNumber : 0;
        const expenseVal = isIncome ? 0 : amtNumber;
        runningBalance += (isIncome ? amtNumber : -amtNumber);

        const saldoFormula = rowNum === 2 ? `E2-F2` : `G${rowNum - 1}+E${rowNum}-F${rowNum}`;
        const catDisplay = tx.category ? (tx.category.charAt(0).toUpperCase() + tx.category.slice(1)) : 'Lainnya';

        const rowData = {
            no: idx + 1,
            tanggal: displayDateFn ? displayDateFn(tx.date) : tx.date,
            kategori: catDisplay,
            keterangan: (tx.description && tx.description !== '-') ? tx.description : '-',
            pemasukan: incomeVal,
            pengeluaran: expenseVal,
            saldo: { formula: saldoFormula, result: runningBalance }
        };
        const row = dataSheet.addRow(rowData);
        row.height = 19;
        const fillArgb = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';

        row.eachCell({ includeEmpty: true }, (cell, colNum) => {
            cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
            cell.border = thinBorder;
            cell.font   = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
            if (colNum === 1 || colNum === 2) {
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            } else if (colNum === 5 || colNum === 6 || colNum === 7) {
                cell.alignment = { horizontal: 'right', vertical: 'middle' };
                cell.numFmt = numFmt;
            } else {
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
            }
        });
    });

    const totalRowIndex = transactions.length + 2;
    const lastDataRow = Math.max(totalRowIndex - 1, 2);
    const footerRow = dataSheet.getRow(totalRowIndex);
    footerRow.height = 24;

    dataSheet.mergeCells(`A${totalRowIndex}:D${totalRowIndex}`);
    const grandTotalLabel = dataSheet.getCell(`A${totalRowIndex}`);
    grandTotalLabel.value = isUsd ? 'TOTAL KESELURUHAN (GRAND TOTAL)' : 'TOTAL KESELURUHAN';
    grandTotalLabel.font = { bold: true, name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
    grandTotalLabel.alignment = { horizontal: 'center', vertical: 'middle' };

    const totalIncomeCell = dataSheet.getCell(`E${totalRowIndex}`);
    totalIncomeCell.value = { formula: `SUM(E2:E${lastDataRow})`, result: calcTotalIncome };
    totalIncomeCell.font = { bold: true, name: 'Arial', size: 10, color: { argb: 'FF047857' } };
    totalIncomeCell.numFmt = numFmt;
    totalIncomeCell.alignment = { horizontal: 'right', vertical: 'middle' };

    const totalExpenseCell = dataSheet.getCell(`F${totalRowIndex}`);
    totalExpenseCell.value = { formula: `SUM(F2:F${lastDataRow})`, result: calcTotalExpense };
    totalExpenseCell.font = { bold: true, name: 'Arial', size: 10, color: { argb: 'FFBE123C' } };
    totalExpenseCell.numFmt = numFmt;
    totalExpenseCell.alignment = { horizontal: 'right', vertical: 'middle' };

    const finalBalanceCell = dataSheet.getCell(`G${totalRowIndex}`);
    finalBalanceCell.value = { formula: `E${totalRowIndex}-F${totalRowIndex}`, result: calcNet };
    finalBalanceCell.font = { bold: true, name: 'Arial', size: 11, color: { argb: 'FF1D4ED8' } };
    finalBalanceCell.numFmt = numFmt;
    finalBalanceCell.alignment = { horizontal: 'right', vertical: 'middle' };

    ['A','B','C','D','E','F','G'].forEach(col => {
        const c = dataSheet.getCell(`${col}${totalRowIndex}`);
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        c.border = doubleBottomBorder;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Keuangan_Report_${currency}_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Parses uploaded Excel file into normalized transaction objects.
 */
export async function parseExcelTransactions({
    file,
    existingTransactions = [],
    currency = 'IDR',
    exchangeRate = 16200
}) {
    const arrayBuffer = await file.arrayBuffer();
    const ExcelJSModule = await import('exceljs');
    const ExcelJS = ExcelJSModule.default || ExcelJSModule;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    let worksheet = workbook.getWorksheet('Data Transaksi') || 
                    workbook.getWorksheet('Transactions Data') || 
                    workbook.worksheets[0];

    if (!worksheet) {
        throw new Error('Worksheet data transaksi tidak ditemukan.');
    }

    const transactionsToImport = [];
    const seenSignatures = new Set(
        existingTransactions.map(tx => {
            const tDate = tx.date ? tx.date.split('T')[0] : '';
            const tType = (tx.type || '').toLowerCase();
            const tCategory = (tx.category || '').trim().toLowerCase();
            const tAmount = Number(tx.amount) || 0;
            const tDesc = (tx.description || '').trim().toLowerCase();
            return `${tDate}_${tType}_${tCategory}_${tAmount}_${tDesc}`;
        })
    );
    let skippedCount = 0;

    let colIndices = {
        date: 2,
        type: 3,
        category: 4,
        amount: 5,
        description: 6
    };
    let headerFound = false;

    worksheet.eachRow((row) => {
        if (!headerFound) {
            let hasHeaderMarker = false;
            row.eachCell((cell, colNumber) => {
                const headerText = (getCellValue(cell) || '').toString().toLowerCase().trim();
                if (headerText.includes('tanggal') || headerText.includes('date')) {
                    colIndices.date = colNumber;
                    hasHeaderMarker = true;
                } else if (headerText.includes('tipe') || headerText.includes('type')) {
                    colIndices.type = colNumber;
                } else if (headerText.includes('kategori') || headerText.includes('category')) {
                    colIndices.category = colNumber;
                } else if (headerText.includes('nominal') || headerText.includes('jumlah') || headerText.includes('amount')) {
                    colIndices.amount = colNumber;
                } else if (headerText.includes('keterangan') || headerText.includes('deskripsi') || headerText.includes('description') || headerText.includes('catatan') || headerText.includes('note')) {
                    colIndices.description = colNumber;
                }
            });
            if (hasHeaderMarker) {
                headerFound = true;
            }
            return;
        }

        const typeVal = getCellValue(row.getCell(colIndices.type));
        const typeStr = (typeVal || '').toString().toLowerCase();

        const descVal = (getCellValue(row.getCell(colIndices.description)) || '').toString().toLowerCase();
        const firstColVal = (getCellValue(row.getCell(1)) || '').toString().toLowerCase();
        if (firstColVal.includes('total') || descVal.includes('total')) {
            return;
        }

        const dateVal = getCellValue(row.getCell(colIndices.date));
        const dateStr = parseExcelDate(dateVal);

        const type = (typeStr.includes('pemasukan') || typeStr.includes('income')) ? 'pemasukan' : 'pengeluaran';
        const categoryVal = getCellValue(row.getCell(colIndices.category));
        const category = normalizeCategory(categoryVal, type);

        const amountVal = getCellValue(row.getCell(colIndices.amount));
        let amount = 0;
        if (typeof amountVal === 'number') {
            amount = amountVal;
        } else if (amountVal) {
            const cleaned = amountVal.toString().replace(/\D/g, '');
            amount = Number(cleaned) || 0;
        }

        if (currency === 'USD' && amount < 1000 && amount > 0) {
            amount = Math.round(amount * exchangeRate);
        }

        const description = getCellValue(row.getCell(colIndices.description)) || '-';

        if (amount > 0 && dateStr) {
            const signature = `${dateStr}_${type}_${category}_${amount}_${description.trim().toLowerCase()}`;
            if (seenSignatures.has(signature)) {
                skippedCount++;
            } else {
                seenSignatures.add(signature);
                transactionsToImport.push({
                    date: dateStr,
                    type,
                    category,
                    amount,
                    description
                });
            }
        }
    });

    return { transactionsToImport, skippedCount };
}
