import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchTransactions, createTransaction, deleteTransaction, updateTransaction, deleteAllTransactions } from '../lib/api';
import { LogOut, Trash2, Edit2, Plus, X, Search, FileText, LayoutDashboard, User, Lock, Save, Zap, ChevronRight, Menu, Clock, Filter, Terminal, Activity, DollarSign, Wallet, Download, Upload, Table, TrendingUp, TrendingDown, Calendar, CreditCard, Camera } from 'lucide-react';
import { formatCurrency, formatDate, normalizeCategory } from '../utils/format';
import { scanReceiptImage } from '../utils/receiptScanner';
import { Link } from 'react-router-dom';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import ExcelJS from 'exceljs';
import { motion, AnimatePresence } from 'framer-motion';
import { parseSafeDate } from '../utils/calculations';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement,
    ArcElement,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement,
    ArcElement
);

const capitalizeText = (str) => {
    if (!str) return '';
    return str.split(' ').map(word => {
        if (!word) return '';
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
};

const formatNumberInput = (value) => {
    if (value === null || value === undefined) return '';
    // Strip everything except digits
    const clean = value.toString().replace(/\D/g, '');
    // Format with dot thousands separator
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const getLocalDateString = (dateObj) => {
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '';
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getCellValue = (cell) => {
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
        return val.richText.map(t => t.text || '').join('');
    }
    
    return val;
};

const getUTCDateString = (dateObj) => {
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '';
    const year = dateObj.getUTCFullYear();
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseIndonesianDate = (str) => {
    if (!str) return null;
    const cleaned = str.toString().toLowerCase().trim()
        .replace(/[\s\-,]+/g, ' '); // normalize spaces, hyphens, commas
    
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

const parseExcelDate = (val) => {
    if (val instanceof Date) {
        return getUTCDateString(val);
    }
    if (val === null || val === undefined) {
        return getLocalDateString(new Date()); // fallback to current local date
    }
    if (typeof val === 'string') {
        const cleaned = val.trim();
        
        // Coba parsing format teks Indonesia (contoh: "4 Agustus 2026" atau "04-Agt-26")
        const indoParsed = parseIndonesianDate(cleaned);
        if (indoParsed) return indoParsed;

        // Cocokkan YYYY-MM-DD atau YY-MM-DD atau YYYY/MM/DD
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
        
        // Cocokkan DD-MM-YYYY atau DD/MM/YYYY atau DD/MM/YY
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
        
        // Fallback untuk format lain
        const parsed = new Date(cleaned);
        if (!isNaN(parsed.getTime())) {
            return getLocalDateString(parsed);
        }
    }
    // Jika berupa angka serial Excel
    if (typeof val === 'number') {
        // Epoch dasar Excel adalah 1899-12-30 (mengakomodasi bug kabisat 1900 di Excel)
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const dateVal = new Date(excelEpoch.getTime() + val * 24 * 60 * 60 * 1000);
        return getUTCDateString(dateVal);
    }
    return getLocalDateString(new Date());
};

const CATEGORIES = [
    { id: 'makanan & minuman', label: 'Makanan & Minuman', icon: '🍔' },
    { id: 'transportasi', label: 'Transportasi', icon: '🚗' },
    { id: 'pendidikan', label: 'Pendidikan / Kuliah', icon: '🎓' },
    { id: 'belanja', label: 'Belanja', icon: '🛍️' },
    { id: 'hiburan', label: 'Hiburan/Rekreasi', icon: '🎬' },
    { id: 'utilitas', label: 'Tagihan & Utilitas', icon: '⚡' },
    { id: 'kesehatan', label: 'Kesehatan', icon: '🏥' },
    { id: 'gaji', label: 'Gaji/Pendapatan', icon: '💵' },
    { id: 'investasi', label: 'Investasi', icon: '📈' },
    { id: 'lainnya', label: 'Lainnya (Kustom)', icon: '📝' }
];

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | transactions | reports | profile
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Transaction Form State
    const [formData, setFormData] = useState({
        type: 'pengeluaran',
        category: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
    });
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef(null);
    const receiptInputRef = useRef(null);
    const [isScanningReceipt, setIsScanningReceipt] = useState(false);
    const [scanProgress, setScanProgress] = useState('');

    const [activePeriod, setActivePeriod] = useState('all'); // all | week | month | year

    // Profile Form State
    const [profileData, setProfileData] = useState({
        fullName: '',
        email: '',
        newPassword: ''
    });
    const [profileMessage, setProfileMessage] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState(null);
    const [isCustomCategory, setIsCustomCategory] = useState(false);

    const handleReceiptPhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsScanningReceipt(true);
        setScanProgress('Membaca foto nota...');
        try {
            const scannedData = await scanReceiptImage(file, (msg) => setScanProgress(msg));
            
            setFormData(prev => ({
                ...prev,
                type: scannedData.type || 'pengeluaran',
                amount: scannedData.amount ? formatNumberInput(scannedData.amount) : prev.amount,
                date: scannedData.date || prev.date,
                category: scannedData.category || prev.category,
                description: scannedData.description || prev.description
            }));

            const isStd = CATEGORIES.some(cat => cat.id === (scannedData.category || '').toLowerCase());
            setIsCustomCategory(!isStd && scannedData.category !== '');

            showToast('Foto nota berhasil dipindai! Silakan periksa & simpan transaksi.');
        } catch (error) {
            console.error('Error scanning receipt:', error);
            showToast('Gagal membaca foto nota. Silakan input manual.', 'error');
        } finally {
            setIsScanningReceipt(false);
            e.target.value = null;
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    // Auto-dismiss toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [transData, userData] = await Promise.all([
                fetchTransactions(),
                supabase.auth.getUser()
            ]);

            setTransactions(Array.isArray(transData) ? transData : []);

            if (userData?.data?.user) {
                const activeUser = userData.data.user;
                setUser(activeUser);
                setProfileData(prev => ({
                    ...prev,
                    email: activeUser.email,
                    fullName: activeUser.user_metadata?.full_name || 'Muhammad Arbain'
                }));
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.replace('/login');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.amount || !formData.date || !formData.category) return;
        
        const amountCleaned = Number(formData.amount.toString().replace(/\D/g, '')) || 0;
        if (amountCleaned <= 0) {
            showToast('Jumlah nominal harus lebih besar dari 0.', 'error');
            return;
        }

        setIsSubmitting(true);

        const dataToSubmit = {
            ...formData,
            amount: amountCleaned,
            category: normalizeCategory(formData.category.trim(), formData.type),
            description: formData.description ? formData.description.trim().toLowerCase() : ''
        };

        try {
            if (editingId) {
                await updateTransaction(editingId, dataToSubmit);
                showToast('Transaksi berhasil diperbarui!');
            } else {
                await createTransaction(dataToSubmit);
                showToast('Transaksi berhasil ditambahkan!');
            }

            setFormData({
                type: 'pengeluaran',
                category: '',
                amount: '',
                description: '',
                date: new Date().toISOString().split('T')[0]
            });
            setEditingId(null);
            setIsCustomCategory(false);
            const data = await fetchTransactions();
            setTransactions(Array.isArray(data) ? data : []);
            if (activeTab === 'dashboard') {
                setActiveTab('transactions');
            }
        } catch (error) {
            console.error('Error submitting transaction:', error);
            showToast('Gagal menyimpan transaksi.', 'error');
        } finally {
            setIsSubmitting(false);
        }
        window.scrollTo(0, 0);
    };

    const handleEdit = (transaction) => {
        if (!transaction) return;
        setActiveTab('transactions');
        setEditingId(transaction.id);
        setFormData({
            type: transaction.type,
            category: transaction.category || '',
            amount: formatNumberInput(transaction.amount) || '',
            description: transaction.description || '',
            date: transaction.date || new Date().toISOString().split('T')[0]
        });
        const isStd = CATEGORIES.some(cat => cat.id === (transaction.category || '').toLowerCase());
        setIsCustomCategory(!isStd && transaction.category !== '');
        window.scrollTo(0, 0);
    };

    const handleDelete = async (id) => {
        if (confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
            try {
                await deleteTransaction(id);
                showToast('Transaksi berhasil dihapus!');
                const data = await fetchTransactions();
                setTransactions(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Error deleting transaction:', error);
                showToast('Gagal menghapus transaksi.', 'error');
            }
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setFormData({
            type: 'pengeluaran',
            category: '',
            amount: '',
            description: '',
            date: new Date().toISOString().split('T')[0]
        });
        setIsCustomCategory(false);
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setProfileMessage('');
        setIsSubmitting(true);

        const updates = {
            data: { full_name: profileData.fullName }
        };

        if (profileData.newPassword) {
            updates.password = profileData.newPassword;
        }

        try {
            const { data, error } = await supabase.auth.updateUser(updates);

            if (error) {
                setProfileMessage('Error: ' + error.message);
                showToast('Gagal memperbarui profil: ' + error.message, 'error');
            } else {
                setProfileMessage('Profil berhasil diperbarui.');
                showToast('Profil berhasil diperbarui!');
                setProfileData(prev => ({ ...prev, newPassword: '' }));
                if (data?.user) {
                    setUser(data.user);
                }
            }
        } catch (err) {
            console.error(err);
            showToast('Terjadi kesalahan jaringan.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const exportToExcel = async () => {
        try {
            // ── 1. Aggregate category spending for the chart ──
            const categoryTotals = {};
            filteredTransactions
                .filter(t => t.type === 'pengeluaran')
                .forEach(t => {
                    const cat = t.category || 'Lainnya';
                    categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(t.amount);
                });
            const sortedCategories = Object.entries(categoryTotals)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8);

            // ── 2. Render chart on a hidden off-screen canvas ──
            let imageBase64 = null;
            if (sortedCategories.length > 0) {
                const canvas = document.createElement('canvas');
                canvas.width = 620;
                canvas.height = 420;
                canvas.style.position = 'absolute';
                canvas.style.left = '-9999px';
                document.body.appendChild(canvas);

                const chartColors = [
                    '#6366f1','#3b82f6','#f59e0b','#8b5cf6',
                    '#ec4899','#ef4444','#06b6d4','#6b7280'
                ];

                const chartInstance = new ChartJS(canvas.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: sortedCategories.map(([cat]) =>
                            cat.charAt(0).toUpperCase() + cat.slice(1)
                        ),
                        datasets: [{
                            label: 'Total Pengeluaran (Rp)',
                            data: sortedCategories.map(([, amt]) => amt),
                            backgroundColor: chartColors.slice(0, sortedCategories.length),
                            borderRadius: 5,
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
                                text: 'Pengeluaran Terbanyak per Kategori',
                                font: { size: 14, weight: 'bold' },
                                padding: { bottom: 12 }
                            }
                        },
                        scales: {
                            x: {
                                ticks: {
                                    callback: (v) =>
                                        'Rp ' + Number(v).toLocaleString('id-ID')
                                },
                                grid: { color: '#f3f4f6' }
                            },
                            y: { grid: { display: false } }
                        }
                    }
                });

                // Allow canvas to finish rendering
                await new Promise(r => setTimeout(r, 250));
                imageBase64 = canvas.toDataURL('image/png').split(',')[1];
                chartInstance.destroy();
                document.body.removeChild(canvas);
            }

            // ── 3. Build workbook with ExcelJS ──
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Financial Report');

            const borderStyle = {
                top:    { style: 'thin', color: { argb: 'FFAAAAAA' } },
                bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } },
                left:   { style: 'thin', color: { argb: 'FFAAAAAA' } },
                right:  { style: 'thin', color: { argb: 'FFAAAAAA' } },
            };

            // Fixed column widths
            worksheet.columns = [
                { header: 'Tanggal',    key: 'tanggal',   width: 22 },
                { header: 'Tipe',       key: 'tipe',      width: 14 },
                { header: 'Kategori',   key: 'kategori',  width: 22 },
                { header: 'Nominal',    key: 'nominal',   width: 18 },
                { header: 'Keterangan', key: 'keterangan',width: 32 },
            ];

            // Style header row
            const headerRow = worksheet.getRow(1);
            headerRow.height = 24;
            ['A','B','C','D','E'].forEach((col, i) => {
                const cell = worksheet.getCell(`${col}1`);
                cell.font  = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 11 };
                cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
                cell.alignment = { horizontal: i === 3 ? 'right' : 'center', vertical: 'middle' };
                cell.border = borderStyle;
            });

            // Add and style data rows
            filteredTransactions.forEach((t, idx) => {
                const rowData = {
                    tanggal:   formatDate(t.date),
                    tipe:      t.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
                    kategori:  t.category,
                    nominal:   Number(t.amount),
                    keterangan: t.description || '-',
                };
                const row = worksheet.addRow(rowData);
                row.height = 18;
                const fillArgb = idx % 2 === 0 ? 'FFFFFFFF' : 'FFEFF6FF';

                row.eachCell({ includeEmpty: true }, (cell, colNum) => {
                    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
                    cell.border = borderStyle;
                    cell.font   = { name: 'Arial', size: 10, color: { argb: 'FF111827' } };
                    if (colNum === 1 || colNum === 2) {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    } else if (colNum === 4) {
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                        cell.numFmt = '#,##0';
                    } else {
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    }
                });
            });

            // ── 4. Embed chart image to the right of the table ──
            if (imageBase64) {
                const imageId = workbook.addImage({
                    base64: imageBase64,
                    extension: 'png',
                });
                const totalRows = filteredTransactions.length + 1;
                const chartRows = Math.max(totalRows, 20);
                worksheet.addImage(imageId, {
                    tl: { col: 6.2, row: 0.5 },
                    br: { col: 14.8, row: chartRows + 0.5 },
                    editAs: 'oneCell',
                });
            }

            // ── 5. Write and download ──
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Financial_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Error exporting to excel:', error);
            showToast('Gagal mengekspor laporan.', 'error');
        }
    };

    const handleUploadExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setIsSubmitting(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);
            const worksheet = workbook.worksheets[0]; // Get first sheet
            
            const transactionsToImport = [];
            // Gunakan Set untuk mendeteksi duplikat (baik dari DB maupun dalam file excel itu sendiri)
            const seenSignatures = new Set(
                transactions.map(t => {
                    const tDate = t.date ? t.date.split('T')[0] : '';
                    const tType = (t.type || '').toLowerCase();
                    const tCategory = (t.category || '').trim().toLowerCase();
                    const tAmount = Number(t.amount) || 0;
                    const tDesc = (t.description || '').trim().toLowerCase();
                    return `${tDate}_${tType}_${tCategory}_${tAmount}_${tDesc}`;
                })
            );
            let skippedCount = 0;

            // Indeks kolom bawaan (jika header tidak ditemukan)
            let colIndices = {
                date: 1,
                type: 2,
                category: 3,
                amount: 4,
                description: 5
            };

            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) {
                    // Cari indeks kolom secara dinamis berdasarkan nama header
                    row.eachCell((cell, colNumber) => {
                        const headerText = (getCellValue(cell) || '').toString().toLowerCase().trim();
                        if (headerText.includes('tanggal') || headerText.includes('date')) {
                            colIndices.date = colNumber;
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
                    return; // Lewati baris header
                }
                
                const dateVal = getCellValue(row.getCell(colIndices.date));
                const dateStr = parseExcelDate(dateVal);

                const typeVal = getCellValue(row.getCell(colIndices.type));
                const typeStr = (typeVal || '').toString().toLowerCase();
                const type = typeStr.includes('pemasukan') ? 'pemasukan' : 'pengeluaran';
                
                const categoryVal = getCellValue(row.getCell(colIndices.category));
                const category = normalizeCategory(categoryVal, type);
                
                const amountVal = getCellValue(row.getCell(colIndices.amount));
                let amount = 0;
                if (typeof amountVal === 'number') {
                    amount = amountVal;
                } else if (amountVal) {
                    // Bersihkan pemformatan dari string (seperti Rp, titik, koma, spasi)
                    const cleaned = amountVal.toString().replace(/\D/g, '');
                    amount = Number(cleaned) || 0;
                }
                
                const descriptionVal = getCellValue(row.getCell(colIndices.description));
                const description = (descriptionVal || '').toString().trim();
                
                if (amount > 0) {
                    const signature = `${dateStr}_${type}_${category}_${amount}_${description.toLowerCase()}`;
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

            for (const t of transactionsToImport) {
                await createTransaction(t);
            }
            
            let message = `${transactionsToImport.length} data baru berhasil diimpor!`;
            if (skippedCount > 0) {
                message += ` (${skippedCount} data ganda dilewati)`;
            }
            showToast(message);
            
            const data = await fetchTransactions();
            setTransactions(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error importing excel", error);
            showToast('Gagal membaca file Excel.', 'error');
        } finally {
            setIsSubmitting(false);
            e.target.value = null; // Reset input
        }
    };

    const handleDeleteAllTransactions = async () => {
        if (confirm('PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA data transaksi? Tindakan ini tidak dapat dibatalkan.')) {
            if (confirm('Konfirmasi kedua: Apakah Anda benar-benar yakin ingin menghapus seluruh data transaksi?')) {
                setIsSubmitting(true);
                try {
                    const success = await deleteAllTransactions();
                    if (success) {
                        showToast('Semua transaksi berhasil dihapus!');
                        const data = await fetchTransactions();
                        setTransactions(Array.isArray(data) ? data : []);
                    } else {
                        showToast('Gagal menghapus semua transaksi.', 'error');
                    }
                } catch (error) {
                    console.error('Error in handleDeleteAllTransactions:', error);
                    showToast('Terjadi kesalahan saat menghapus data.', 'error');
                } finally {
                    setIsSubmitting(false);
                }
            }
        }
    };

    useEffect(() => {
        loadInitialData();
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.scrollTo(0, 0);
        }
    }, [activeTab]);

    // Filter Logic
    const filteredTransactions = transactions.filter(t => {
        const matchesSearch = (t.category?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (t.description?.toLowerCase() || "").includes(searchTerm.toLowerCase());

        const tDate = parseSafeDate(t.date);
        const now = new Date();

        let matchesPeriod = true;
        if (activePeriod === 'week') {
            const startOfWeek = new Date(now);
            const day = now.getDay() || 7; // Get current day (1-7, where 7 is Sunday)
            startOfWeek.setDate(now.getDate() - day + 1); // Monday
            startOfWeek.setHours(0, 0, 0, 0);
            matchesPeriod = tDate >= startOfWeek;
        } else if (activePeriod === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            matchesPeriod = tDate >= startOfMonth;
        } else if (activePeriod === 'year') {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            matchesPeriod = tDate >= startOfYear;
        }

        return matchesSearch && matchesPeriod;
    });

    // Stats Calculation
    const totalIncome = filteredTransactions.filter(t => t.type === 'pemasukan').reduce((acc, t) => acc + Number(t.amount), 0);
    const totalExpense = filteredTransactions.filter(t => t.type === 'pengeluaran').reduce((acc, t) => acc + Number(t.amount), 0);
    const balance = totalIncome - totalExpense;

    // Group transactions by date for line chart
    const aggregatedFlow = {};
    filteredTransactions.forEach(t => {
        const dateStr = formatDate(t.date);
        const amount = Number(t.amount);
        const net = t.type === 'pemasukan' ? amount : -amount;
        aggregatedFlow[dateStr] = (aggregatedFlow[dateStr] || 0) + net;
    });

    const distinctDates = [];
    filteredTransactions.forEach(t => {
        const dateStr = formatDate(t.date);
        if (!distinctDates.includes(dateStr)) {
            distinctDates.push(dateStr);
        }
    });

    const chartDates = distinctDates.slice(0, 7).reverse();
    const chartNetFlows = chartDates.map(d => aggregatedFlow[d] || 0);

    // Chart Data
    const chartData = {
        labels: chartDates.length > 0 ? chartDates : ['Belum Ada Data'],
        datasets: [
            {
                label: 'Arus Kas Bersih',
                data: chartNetFlows.length > 0 ? chartNetFlows : [0],
                borderColor: '#3b82f6', // blue-500
                backgroundColor: 'rgba(59, 130, 246, 0.06)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
            }
        ]
    };

    // Doughnut Chart Data for Admin Dashboard (based on filteredTransactions)
    const expenseByCategory = {};
    filteredTransactions.forEach(t => {
        if (t.type === 'pengeluaran') {
            const category = normalizeCategory(t.category, t.type);
            expenseByCategory[category] = (expenseByCategory[category] || 0) + Number(t.amount);
        }
    });

    const doughnutLabels = Object.keys(expenseByCategory);
    const doughnutData = Object.values(expenseByCategory);

    // Sort categories by amount descending
    const sortedCategories = Object.entries(expenseByCategory)
        .sort((a, b) => b[1] - a[1]);

    const totalExpenseAmount = sortedCategories.reduce((acc, curr) => acc + curr[1], 0);

    const topCategories = [];
    let otherSum = 0;
    
    sortedCategories.forEach(([cat, amount], idx) => {
        if (idx < 4) {
            topCategories.push({ category: cat, amount });
        } else {
            otherSum += amount;
        }
    });

    if (otherSum > 0) {
        topCategories.push({ category: 'lainnya', amount: otherSum });
    }

    const colorPalette = [
        '#6366f1', // Indigo-500
        '#3b82f6', // Blue-500
        '#f59e0b', // Amber-500
        '#8b5cf6', // Purple-500
        '#ec4899', // Pink-500
        '#ef4444', // Red-500
        '#06b6d4', // Cyan-500
        '#6b7280', // Gray-500
    ];

    const categoryChartData = {
        labels: doughnutLabels.length > 0 ? doughnutLabels : ['Tidak Ada Pengeluaran'],
        datasets: [
            {
                data: doughnutData.length > 0 ? doughnutData : [1],
                backgroundColor: doughnutData.length > 0 ? [
                    'rgba(99, 102, 241, 0.7)',   // Indigo-500
                    'rgba(59, 130, 246, 0.7)',   // Blue-500
                    'rgba(245, 158, 11, 0.7)',   // Amber-500
                    'rgba(139, 92, 246, 0.7)',   // Purple-500
                    'rgba(236, 72, 153, 0.7)',   // Pink-500
                    'rgba(239, 68, 68, 0.7)',    // Red-500
                    'rgba(6, 182, 212, 0.7)',    // Cyan-500
                    'rgba(107, 114, 128, 0.7)',  // Gray-500
                ] : ['rgba(48, 54, 61, 0.5)'],
                borderColor: doughnutData.length > 0 ? [
                    '#6366f1', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#06b6d4', '#6b7280'
                ] : ['#30363d'],
                borderWidth: 1,
            }
        ]
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08
            }
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 15 },
        show: { 
            opacity: 1, 
            y: 0, 
            transition: { 
                type: 'spring', 
                stiffness: 100, 
                damping: 15 
            } 
        }
    };

    const categoryChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'white',
                titleColor: '#111827',
                bodyColor: '#374151',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                callbacks: {
                    label: (context) => {
                        if (doughnutData.length === 0) return 'Belum ada pengeluaran';
                        const value = context.raw;
                        const total = doughnutData.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                    }
                }
            }
        }
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'white',
                titleColor: '#111827',
                bodyColor: '#374151',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                padding: 12,
                callbacks: {
                    label: (context) => formatCurrency(Math.abs(context.raw))
                }
            }
        },
        scales: {
            y: {
                grid: { color: '#f3f4f6', borderDash: [5, 5] },
                ticks: { color: '#6b7280' },
                border: { display: false }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#6b7280' },
                border: { display: false }
            }
        }
    };

    const SidebarItem = ({ id, icon: Icon, label }) => (
        <button
            onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }}
            className={`w-full text-left px-4 py-3 text-sm font-medium rounded-lg transition-all flex items-center gap-3 mb-1 ${activeTab === id
                ? 'bg-blue-50 text-blue-600 shadow-sm border-l-4 border-blue-500'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
        >
            <Icon className={`w-5 h-5 ${activeTab === id ? 'text-blue-500' : 'text-gray-400'}`} />
            {label}
        </button>
    );

    const FilterButtons = () => (
        <div className="flex flex-wrap gap-2 mb-4">
            {[
                { id: 'all', label: 'Semua' },
                { id: 'week', label: 'Minggu Ini' },
                { id: 'month', label: 'Bulan Ini' },
                { id: 'year', label: 'Tahun Ini' }
            ].map((period) => (
                <button
                    key={period.id}
                    onClick={() => setActivePeriod(period.id)}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all border ${activePeriod === period.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-900'
                        }`}
                >
                    {period.label}
                </button>
            ))}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans selection:bg-blue-100 selection:text-blue-900">

            {/* Top Bar */}
            <header className="fixed top-0 w-full h-16 bg-white border-b border-gray-200/80 z-50 flex items-center justify-between px-4 md:px-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="md:hidden text-gray-500 hover:text-gray-900 transition p-2 rounded-lg hover:bg-gray-100 active:scale-95"
                    >
                        {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                    <div className="flex items-center gap-3">
                        <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover shadow-sm shadow-blue-500/20" />
                        <div>
                            <h1 className="text-sm font-bold text-gray-900 leading-tight">My Finance</h1>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex flex-col items-end mr-2">
                        <span className="text-xs font-medium text-gray-500">
                            {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                        </span>
                        <span className="text-xs font-bold text-gray-700">
                            {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 border-l border-gray-200 pl-4 h-8">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 text-xs font-bold text-blue-600">
                            MA
                        </div>
                        <div className="hidden md:block">
                            <p className="text-xs font-bold text-gray-950 capitalize">{user?.user_metadata?.full_name || 'Muhammad Arbain'}</p>
                            <p className="text-[10px] text-gray-500">Administrator</p>
                        </div>
                        <button onClick={handleLogout} className="ml-2 p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/70 z-[80] md:hidden backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Layout Container */}
            <div className="pt-16 flex min-h-screen relative overflow-hidden">

                {/* Sidebar */}
                <aside className={`fixed top-0 left-0 bottom-0 md:relative z-[90] w-72 md:w-64 h-screen md:h-auto bg-white border-r border-gray-200/80 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col overflow-y-auto shadow-2xl md:shadow-none`}>
                    <div className="p-4 flex flex-col h-full">
                        <div className="space-y-1 flex-1">
                            <p className="px-4 text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-3 mt-2">Menu Utama</p>
                            <SidebarItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
                            <SidebarItem id="transactions" icon={CreditCard} label="Transaksi" />
                            <SidebarItem id="reports" icon={FileText} label="Laporan" />

                            <p className="px-4 text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-3 mt-6">Pengaturan</p>
                            <SidebarItem id="profile" icon={User} label="Profil User" />
                            <Link to="/" target="_blank" className="w-full text-left px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-all flex items-center gap-3">
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                                Lihat Website
                            </Link>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 mt-auto">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                <div>
                                    <p className="text-xs font-bold text-gray-900">System Status</p>
                                    <p className="text-[10px] text-gray-500">All services operational</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 bg-gray-50 p-4 md:p-8">
                    <div className="max-w-6xl mx-auto space-y-8">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center min-h-[400px]">
                                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-[#8b949e] animate-pulse">Menyiapkan dashboard...</p>
                            </div>
                        ) : (
                            <>
                                {/* Page Header */}
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 pb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                                            {{
                                                dashboard: 'Dashboard Overview',
                                                transactions: 'Manajemen Transaksi',
                                                reports: 'Laporan Keuangan',
                                                profile: 'Pengaturan Akun'
                                            }[activeTab]}
                                        </h2>
                                        <p className="text-gray-500 text-sm mt-1">
                                            {{
                                                dashboard: 'Ringkasan aktivitas keuangan Anda hari ini.',
                                                transactions: 'Kelola pemasukan dan pengeluaran dengan mudah.',
                                                reports: 'Analisis dan unduh laporan keuangan.',
                                                profile: 'Perbarui informasi dan keamanan akun Anda.'
                                            }[activeTab]}
                                        </p>
                                    </div>
                                    {activeTab === 'reports' && (
                                        <button
                                            onClick={exportToExcel}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download Excel
                                        </button>
                                    )}
                                    {activeTab === 'transactions' && (
                                        <div className="flex flex-wrap items-center gap-2">
                                            <input 
                                                type="file" 
                                                accept=".xlsx, .xls" 
                                                ref={fileInputRef} 
                                                onChange={handleUploadExcel} 
                                                hidden 
                                            />
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isSubmitting}
                                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
                                            >
                                                <Upload className="w-4 h-4" />
                                                {isSubmitting ? 'Memproses...' : 'Upload Excel'}
                                            </button>
                                            <button
                                                onClick={handleDeleteAllTransactions}
                                                disabled={isSubmitting || transactions.length === 0}
                                                className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-lg hover:bg-rose-700 transition shadow-lg shadow-rose-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Hapus Semua Data
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeTab}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                                        className="space-y-8"
                                    >
                                        {activeTab === 'dashboard' && (
                                            <div className="space-y-6">
                                                <FilterButtons />
                                                {/* Stats Cards */}
                                                <motion.div 
                                                    variants={containerVariants}
                                                    initial="hidden"
                                                    animate="show"
                                                    className="grid grid-cols-1 md:grid-cols-3 gap-6"
                                                >
                                                     {/* Income */}
                                                     <motion.div variants={cardVariants} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
                                                         <div className="flex items-start justify-between">
                                                             <div>
                                                                 <p className="text-sm font-medium text-gray-500 mb-1">Total Pemasukan</p>
                                                                 <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(totalIncome)}</h3>
                                                             </div>
                                                             <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                                                 <TrendingUp className="w-5 h-5 text-emerald-600" />
                                                             </div>
                                                         </div>
                                                     </motion.div>

                                                     {/* Expense */}
                                                     <motion.div variants={cardVariants} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
                                                         <div className="flex items-start justify-between">
                                                             <div>
                                                                 <p className="text-sm font-medium text-gray-500 mb-1">Total Pengeluaran</p>
                                                                 <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpense)}</h3>
                                                             </div>
                                                             <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                                                                 <TrendingDown className="w-5 h-5 text-rose-600" />
                                                             </div>
                                                         </div>
                                                     </motion.div>

                                                     {/* Balance */}
                                                     <motion.div variants={cardVariants} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
                                                         <div className="flex items-start justify-between">
                                                             <div>
                                                                 <p className="text-sm font-medium text-gray-500 mb-1">Saldo Bersih</p>
                                                                 <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(balance)}</h3>
                                                             </div>
                                                             <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                                 <Wallet className="w-5 h-5 text-blue-600" />
                                                             </div>
                                                         </div>
                                                     </motion.div>
                                                </motion.div>

                                                {/* Charts Grid */}
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 15 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.15, duration: 0.4 }}
                                                    className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                                                >
                                                     {/* Line Chart */}
                                                     <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                                         <div className="flex items-center justify-between mb-6">
                                                             <h3 className="text-lg font-bold text-gray-900">Analisis Arus Kas</h3>
                                                         </div>
                                                         <div className="h-72">
                                                             <Line options={chartOptions} data={chartData} />
                                                         </div>
                                                     </div>
 
                                                     {/* Doughnut Chart */}
                                                     <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                                                         <div className="flex items-center justify-between mb-4">
                                                             <h3 className="text-lg font-bold text-gray-900">Distribusi Pengeluaran</h3>
                                                         </div>
                                                         <div className="h-44 flex items-center justify-center">
                                                             <Doughnut options={categoryChartOptions} data={categoryChartData} />
                                                         </div>
                                                         {/* Custom Legend */}
                                                         <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 shrink-0">
                                                             {topCategories.length === 0 ? (
                                                                 <p className="text-xs text-gray-400 text-center">Belum ada data pengeluaran</p>
                                                             ) : (
                                                                 topCategories.map((item, idx) => {
                                                                     const percentage = totalExpenseAmount > 0 ? ((item.amount / totalExpenseAmount) * 100).toFixed(0) : 0;
                                                                     return (
                                                                         <div key={item.category} className="flex items-center justify-between text-xs text-gray-700">
                                                                             <div className="flex items-center gap-2">
                                                                                 <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorPalette[idx % colorPalette.length] }} />
                                                                                 <span className="capitalize truncate max-w-[120px] font-medium">{item.category}</span>
                                                                             </div>
                                                                             <div className="flex items-center gap-3">
                                                                                 <span className="text-gray-400 font-medium">{formatCurrency(item.amount)}</span>
                                                                                 <span className="font-bold text-gray-900 w-8 text-right">{percentage}%</span>
                                                                             </div>
                                                                         </div>
                                                                     );
                                                                 })
                                                             )}
                                                         </div>
                                                     </div>
                                                </motion.div>
                                            </div>
                                        )}

                                {activeTab === 'transactions' && (
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        {/* Input Form */}
                                        <motion.div 
                                             initial={{ opacity: 0, x: -20 }} 
                                             animate={{ opacity: 1, x: 0 }} 
                                             transition={{ duration: 0.4, ease: 'easeOut' }}
                                             className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 h-fit"
                                         >
                                            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm shadow-gray-100">
                                                <div className="flex items-center justify-between gap-2 mb-4">
                                                    <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Transaksi' : 'Transaksi Baru'}</h3>
                                                    {editingId && <button onClick={cancelEdit} className="text-xs text-rose-400 hover:text-rose-300 hover:underline">Batal Edit</button>}
                                                </div>

                                                <input
                                                    type="file"
                                                    ref={receiptInputRef}
                                                    onChange={handleReceiptPhotoUpload}
                                                    accept="image/*"
                                                    className="hidden"
                                                />

                                                <button
                                                    type="button"
                                                    onClick={() => receiptInputRef.current?.click()}
                                                    disabled={isScanningReceipt}
                                                    className="w-full mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 hover:bg-blue-100 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer disabled:opacity-50"
                                                >
                                                    {isScanningReceipt ? (
                                                        <>
                                                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                            <span>{scanProgress || 'Memindai Foto Nota...'}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Camera className="w-4 h-4 text-blue-600" />
                                                            <span>Catat via Foto Struk / Nota</span>
                                                        </>
                                                    )}
                                                </button>

                                                <form onSubmit={handleSubmit} className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-3 p-1 bg-gray-50 rounded-lg border border-gray-200">
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, type: 'pemasukan' })}
                                                            className={`py-2 text-xs font-bold rounded-md transition ${formData.type === 'pemasukan' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                                        >
                                                            Pemasukan
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, type: 'pengeluaran' })}
                                                            className={`py-2 text-xs font-bold rounded-md transition ${formData.type === 'pengeluaran' ? 'bg-rose-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                                        >
                                                            Pengeluaran
                                                        </button>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1.5 pl-1">Tanggal</label>
                                                        <div className="relative">
                                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                            <input
                                                                type="date"
                                                                value={formData.date}
                                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                                className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                                                                required
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1.5 pl-1">Jumlah</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">Rp</span>
                                                            <input
                                                                type="text"
                                                                placeholder="0"
                                                                value={formData.amount}
                                                                onChange={(e) => setFormData({ ...formData, amount: formatNumberInput(e.target.value) })}
                                                                className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition font-medium"
                                                                required
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                         <label className="block text-xs font-medium text-gray-500 mb-1.5 pl-1">Kategori</label>
                                                         <select
                                                             value={isCustomCategory ? 'Lainnya' : (CATEGORIES.some(c => c.id === formData.category) ? formData.category : (formData.category ? 'Lainnya' : ''))}
                                                             onChange={(e) => {
                                                                 const val = e.target.value;
                                                                 if (val === 'Lainnya') {
                                                                     setIsCustomCategory(true);
                                                                     setFormData({ ...formData, category: '' });
                                                                 } else {
                                                                     setIsCustomCategory(false);
                                                                     setFormData({ ...formData, category: val });
                                                                 }
                                                             }}
                                                             className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg py-2.5 px-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition mb-3 cursor-pointer"
                                                             required
                                                         >
                                                             <option value="" disabled>-- Pilih Kategori --</option>
                                                             {CATEGORIES.map(cat => (
                                                                 <option key={cat.id} value={cat.id}>
                                                                     {cat.icon} {cat.label}
                                                                 </option>
                                                             ))}
                                                         </select>

                                                         {isCustomCategory && (
                                                             <input
                                                                 type="text"
                                                                 placeholder="Ketik Kategori Kustom..."
                                                                 value={formData.category}
                                                                 onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                                 className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg py-2.5 px-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition mb-3"
                                                                 required
                                                             />
                                                         )}

                                                         <label className="block text-xs font-medium text-gray-500 mb-1.5 pl-1">Keterangan / Catatan</label>
                                                         <textarea
                                                             placeholder="Catatan tambahan (opsional)"
                                                             value={formData.description}
                                                             onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                             className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg py-2.5 px-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition min-h-[80px]"
                                                         />
                                                     </div>

                                                     <button 
                                                         type="submit" 
                                                         disabled={isSubmitting}
                                                         className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                     >
                                                         {isSubmitting ? (
                                                             <>
                                                                 <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                 <span>Menyimpan...</span>
                                                             </>
                                                         ) : (
                                                             <>
                                                                 <Save className="w-4 h-4" />
                                                                 <span>{editingId ? 'Simpan Perubahan' : 'Simpan Transaksi'}</span>
                                                             </>
                                                         )}
                                                     </button>
                                                </form>
                                            </div>
                                        </motion.div>

                                        {/* Transaction List */}
                                        <motion.div 
                                             initial={{ opacity: 0, x: 20 }} 
                                             animate={{ opacity: 1, x: 0 }} 
                                             transition={{ duration: 0.4, ease: 'easeOut' }}
                                             className="lg:col-span-2"
                                         >
                                            <div className="bg-white border border-gray-200 rounded-xl shadow-sm shadow-gray-100 overflow-hidden flex flex-col lg:h-[calc(100vh-230px)]">
                                                <div className="p-5 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                                                    <h3 className="font-bold text-gray-900">Riwayat Transaksi</h3>
                                                    <div className="relative w-full md:w-64">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            placeholder="Cari transaksi..."
                                                            value={searchTerm}
                                                            onChange={(e) => setSearchTerm(e.target.value)}
                                                            className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="hidden md:block overflow-x-auto flex-1 lg:h-[calc(100vh-310px)] lg:overflow-y-auto">
                                                    <table className="w-full text-left text-sm text-gray-500">
                                                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 sticky top-0 z-10">
                                                            <tr>
                                                                <th className="px-6 py-4 w-1/4">Tanggal</th>
                                                                <th className="px-6 py-4 w-1/4">Kategori</th>
                                                                <th className="px-6 py-4 w-1/4">Nominal</th>
                                                                <th className="px-6 py-4 w-1/4 text-right">Aksi</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100 bg-white">
                                                            {loading ? (
                                                                <tr><td colSpan="4" className="text-center py-12 text-gray-400">Memuat data...</td></tr>
                                                            ) : filteredTransactions.length === 0 ? (
                                                                <tr><td colSpan="4" className="text-center py-12 text-gray-400">Belum ada transaksi.</td></tr>
                                                            ) : (
                                                                <AnimatePresence initial={false}>
                                                                    {filteredTransactions.map((t) => (
                                                                        <motion.tr 
                                                                            key={t.id}
                                                                            layout
                                                                            initial={{ opacity: 0, y: 10 }}
                                                                            animate={{ opacity: 1, y: 0 }}
                                                                            exit={{ opacity: 0, x: -30 }}
                                                                            transition={{ duration: 0.2 }}
                                                                            className="hover:bg-gray-50/50 transition"
                                                                        >
                                                                            <td className="px-6 py-4">
                                                                                <div className="text-gray-800 font-medium">{formatDate(t.date)}</div>
                                                                                <div className="text-xs text-gray-400">{t.date ? new Date(t.date).getFullYear() : ''}</div>
                                                                            </td>
                                                                            <td className="px-6 py-4">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className={`w-2 h-2 rounded-full ${t.type === 'pemasukan' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                                                    <span className="text-gray-800 font-medium">{capitalizeText(t.category)}</span>
                                                                                </div>
                                                                                {t.description && t.description !== '-' && <div className="text-xs text-gray-400 mt-1 truncate max-w-[150px]">{t.description}</div>}
                                                                            </td>
                                                                            <td className="px-6 py-4">
                                                                                <span className={`font-semibold ${t.type === 'pemasukan' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                                    {t.type === 'pemasukan' ? '+' : '-'} {formatCurrency(t.amount)}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-6 py-4 text-right">
                                                                                <div className="flex justify-end gap-2">
                                                                                    <button onClick={() => handleEdit(t)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition" title="Edit">
                                                                                        <Edit2 className="w-4 h-4" />
                                                                                    </button>
                                                                                    <button onClick={() => handleDelete(t.id)} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Delete">
                                                                                        <Trash2 className="w-4 h-4" />
                                                                                    </button>
                                                                                </div>
                                                                            </td>
                                                                        </motion.tr>
                                                                    ))}
                                                                </AnimatePresence>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="md:hidden p-4 space-y-4">
                                                    {loading ? (
                                                        <div className="text-center py-4 text-gray-500">Memuat data...</div>
                                                    ) : filteredTransactions.length === 0 ? (
                                                        <div className="text-center py-4 text-gray-500">Belum ada transaksi.</div>
                                                    ) : (
                                                        <AnimatePresence initial={false}>
                                                            {filteredTransactions.map((t) => (
                                                                <motion.div 
                                                                    key={t.id}
                                                                    layout
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    exit={{ opacity: 0, x: -30 }}
                                                                    transition={{ duration: 0.2 }}
                                                                    className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 shadow-sm"
                                                                >
                                                                    <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                                                                        <div>
                                                                            <p className="text-xs text-gray-400">{formatDate(t.date)} {t.date ? new Date(t.date).getFullYear() : ''}</p>
                                                                            <div className="flex items-center gap-2 mt-1">
                                                                                <span className={`w-2 h-2 rounded-full ${t.type === 'pemasukan' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                                                <span className="text-gray-800 font-bold">{capitalizeText(t.category)}</span>
                                                                            </div>
                                                                        </div>
                                                                        <span className={`font-bold ${t.type === 'pemasukan' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                            {t.type === 'pemasukan' ? '+' : '-'} {formatCurrency(t.amount)}
                                                                        </span>
                                                                    </div>
                                                                    {t.description && t.description !== '-' && <p className="text-xs text-gray-500 italic">{t.description}</p>}
                                                                    <div className="flex justify-end gap-2 pt-1">
                                                                        <button onClick={() => handleEdit(t)} className="flex-1 py-2 bg-gray-50 text-gray-700 rounded flex items-center justify-center gap-2 text-xs font-medium border border-gray-200 hover:bg-gray-100">
                                                                            <Edit2 className="w-3.5 h-3.5" /> Edit
                                                                        </button>
                                                                        <button onClick={() => handleDelete(t.id)} className="flex-1 py-2 bg-rose-50 text-rose-600 rounded flex items-center justify-center gap-2 text-xs font-medium border border-rose-200 hover:bg-rose-100">
                                                                            <Trash2 className="w-3.5 h-3.5" /> Hapus
                                                                        </button>
                                                                    </div>
                                                                </motion.div>
                                                            ))}
                                                        </AnimatePresence>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    </div>
                                )}

                                {activeTab === 'reports' && (
                                    <div className="space-y-6">
                                        {/* Report Summary */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-xl">
                                                <h3 className="text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">Total Pemasukan</h3>
                                                <p className="text-3xl text-gray-900 font-bold">{formatCurrency(totalIncome)}</p>
                                            </div>
                                            <div className="p-6 bg-rose-50 border border-rose-100 rounded-xl">
                                                <h3 className="text-rose-700 text-xs font-bold uppercase tracking-wider mb-2">Total Pengeluaran</h3>
                                                <p className="text-3xl text-gray-900 font-bold">{formatCurrency(totalExpense)}</p>
                                            </div>
                                            <div className="p-6 bg-blue-50 border border-blue-100 rounded-xl">
                                                <h3 className="text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">Saldo Bersih</h3>
                                                <p className="text-3xl text-gray-900 font-bold">{formatCurrency(balance)}</p>
                                            </div>
                                        </div>

                                        {/* Report Table Preview */}
                                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm shadow-gray-100">
                                            <div className="p-5 border-b border-gray-200">
                                                <h3 className="font-bold text-gray-900">Preview Data Laporan</h3>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm text-gray-500">
                                                    <thead className="bg-gray-50 text-gray-600 font-semibold">
                                                        <tr>
                                                            <th className="px-6 py-3 w-32">Tanggal</th>
                                                            <th className="px-6 py-3 w-24">Tipe</th>
                                                            <th className="px-6 py-3 w-32">Kategori</th>
                                                            <th className="px-6 py-3">Keterangan</th>
                                                            <th className="px-6 py-3 text-right w-32">Jumlah</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 bg-white">
                                                        {filteredTransactions.length === 0 ? (
                                                            <tr><td colSpan="5" className="text-center py-8 text-gray-400">Tidak ada data untuk periode ini.</td></tr>
                                                        ) : (
                                                            filteredTransactions.map(t => (
                                                                <tr key={t.id} className="hover:bg-gray-50/50 transition">
                                                                    <td className="px-6 py-3 text-gray-800">{formatDate(t.date)}</td>
                                                                    <td className="px-6 py-3">
                                                                        <span className={`text-xs px-2 py-1 rounded font-medium capitalize ${t.type === 'pemasukan' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                                                            {t.type}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-3 text-gray-800">{capitalizeText(t.category)}</td>
                                                                    <td className="px-6 py-3 truncate max-w-xs text-gray-600">{(t.description && t.description !== '-') ? t.description : '-'}</td>
                                                                    <td className={`px-6 py-3 text-right font-medium ${t.type === 'pemasukan' ? 'text-emerald-600' : 'text-gray-800'}`}>
                                                                        {formatCurrency(t.amount)}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'profile' && (
                                    <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl p-8 shadow-sm shadow-gray-100">
                                        <h2 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-200 pb-4">
                                            Pengaturan Profil
                                        </h2>

                                        {profileMessage && (
                                            <div className="mb-6 p-4 rounded-lg border border-blue-100 bg-blue-50 text-blue-700 text-sm flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                                {profileMessage}
                                            </div>
                                        )}

                                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-600 mb-2">Email Akun</label>
                                                <input type="text" value={profileData.email} disabled className="w-full bg-gray-100 border border-gray-200 text-gray-500 rounded-lg p-3 text-sm cursor-not-allowed" />
                                                <p className="text-xs text-gray-400 mt-1">Email tidak dapat diubah.</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-600 mb-2">Nama Lengkap</label>
                                                <input type="text" value={profileData.fullName} onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })} className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-600 mb-2">Password Baru</label>
                                                <input type="password" value={profileData.newPassword} onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })} placeholder="Biarkan kosong jika tidak ingin mengganti" className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition" />
                                            </div>
                                            <div className="pt-4">
                                                <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 w-full md:w-auto">
                                                    Simpan Perubahan
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                                     </motion.div>
                                 </AnimatePresence>
                            </>
                        )}
                    </div>
                </main>
            </div>
            {/* Toast System Rendering */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className={`fixed bottom-6 right-6 z-[100] px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border font-medium text-sm ${
                            toast.type === 'error'
                                ? 'bg-white text-rose-600 border-rose-100 shadow-xl shadow-gray-200/50'
                                : 'bg-white text-blue-700 border-blue-100 shadow-xl shadow-gray-200/50'
                        }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${toast.type === 'error' ? 'bg-rose-500' : 'bg-blue-500 animate-ping'}`} />
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;
