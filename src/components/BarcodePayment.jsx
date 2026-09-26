import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { formatCurrency } from '../utils/format';
import { 
    QrCode, Building2, Wallet, Copy, Check, Download, 
    Maximize2, ExternalLink, ShieldCheck, Sparkles, MessageCircle, AlertCircle
} from 'lucide-react';

const BarcodePayment = ({ 
    orderId, 
    planName, 
    totalAmount, 
    userEmail,
    selectedMethod = 'QRIS',
    onMethodChange 
}) => {
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [copiedField, setCopiedField] = useState('');
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [activeMethod, setActiveMethod] = useState(selectedMethod || 'QRIS');

    // Merchant information
    const MERCHANT_NAME = 'MUHAMMAD ARBAIN';
    const NMID = 'ID1020240926881';
    const BRI_REK = '362901036404538';
    const BRI_NAME = 'Muhammad Arbain';
    const EWALLET_NUM = '082215322757';
    const EWALLET_NAME = 'Muhammad Arbain';
    const WA_ADMIN = '6282215322757';

    useEffect(() => {
        if (selectedMethod && selectedMethod !== activeMethod) {
            setActiveMethod(selectedMethod);
        }
    }, [selectedMethod]);

    const handleMethodSwitch = (method) => {
        setActiveMethod(method);
        if (onMethodChange) onMethodChange(method);
    };

    // Generate Scannable Barcode / QRIS Data URL
    useEffect(() => {
        const generateQR = async () => {
            try {
                // QRIS payload format representation with order and amount
                const qrisPayload = `00020101021226670014ID.LINKAJA.WWW01189360091400202409260215${NMID}0303UME51440014ID.CO.QRIS.WWW0215${orderId || 'ORD-FINTRACK'}52045499530336054${totalAmount ? String(totalAmount).length : 5}${totalAmount || 29000}5802ID5915${MERCHANT_NAME}6007JAKARTA6304ABCD`;
                
                const url = await QRCode.toDataURL(qrisPayload, {
                    width: 400,
                    margin: 1.5,
                    color: {
                        dark: '#0f172a',
                        light: '#ffffff'
                    },
                    errorCorrectionLevel: 'H'
                });
                setQrDataUrl(url);
            } catch (err) {
                console.error('Error generating QR code:', err);
            }
        };

        generateQR();
    }, [orderId, totalAmount]);

    const handleCopy = (text, fieldName) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(''), 2500);
    };

    const handleDownloadBarcode = () => {
        if (!qrDataUrl) return;
        const link = document.createElement('a');
        link.download = `QRIS-Barcode-${orderId || 'FinTrack'}.png`;
        link.href = qrDataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // WhatsApp Confirmation Message
    const generateWhatsAppUrl = () => {
        const text = `Halo Admin Arbain, saya sudah melakukan pembayaran langganan FinTrack Premium:
- Order ID: ${orderId || '-'}
- Paket: ${planName || 'Paket Premium'}
- Total: ${formatCurrency(totalAmount)}
- Metode: ${activeMethod}
- Email Akun: ${userEmail || '-'}

Mohon bantuan untuk verifikasi & approve akun saya ya. Terima kasih!`;
        return `https://wa.me/${WA_ADMIN}?text=${encodeURIComponent(text)}`;
    };

    return (
        <div className="space-y-4">
            {/* Payment Method Selector Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-2xl">
                <button
                    type="button"
                    onClick={() => handleMethodSwitch('QRIS')}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 ${
                        activeMethod === 'QRIS'
                            ? 'bg-white text-blue-700 shadow-md shadow-blue-500/10 border border-blue-100'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    <QrCode className="w-4 h-4 text-blue-600" />
                    <span>Barcode QRIS</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleMethodSwitch('E-Wallet')}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 ${
                        activeMethod === 'E-Wallet'
                            ? 'bg-white text-emerald-700 shadow-md shadow-emerald-500/10 border border-emerald-100'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    <Wallet className="w-4 h-4 text-emerald-600" />
                    <span>E-Wallet</span>
                </button>

                <button
                    type="button"
                    onClick={() => handleMethodSwitch('Virtual Account')}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 ${
                        activeMethod === 'Virtual Account'
                            ? 'bg-white text-purple-700 shadow-md shadow-purple-500/10 border border-purple-100'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <span>Rekening BRI</span>
                </button>
            </div>

            {/* CHANNEL 1: BARCODE / QRIS */}
            {activeMethod === 'QRIS' && (
                <div className="bg-white border-2 border-blue-100 rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">
                                QR
                            </span>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900">QRIS Barcode Nasional</h4>
                                <p className="text-[11px] text-gray-500">Scan via BCA, BRImo, Mandiri, DANA, GoPay, OVO, dll</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-extrabold px-2.5 py-1 bg-red-50 text-red-700 rounded-full border border-red-200">
                            QRIS RESMI
                        </span>
                    </div>

                    {/* Official QRIS Card Visual */}
                    <div className="bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-2xl p-4 max-w-sm mx-auto text-center relative overflow-hidden shadow-inner">
                        {/* Red Header Bar */}
                        <div className="bg-red-600 text-white py-1.5 px-3 rounded-lg mb-3 flex items-center justify-between text-[11px] font-extrabold tracking-wider">
                            <span>QRIS</span>
                            <span className="text-[9px] font-normal tracking-normal opacity-90">PEMBAYARAN NASIONAL</span>
                        </div>

                        {/* Merchant Details */}
                        <div className="mb-2">
                            <h5 className="font-extrabold text-sm text-gray-900 uppercase tracking-tight">{MERCHANT_NAME}</h5>
                            <p className="text-[10px] font-mono text-gray-500">NMID: {NMID}</p>
                        </div>

                        {/* Barcode / QR Code Image */}
                        <div className="bg-white p-3 rounded-xl border border-gray-200 inline-block shadow-sm my-1 relative group">
                            {qrDataUrl ? (
                                <img 
                                    src={qrDataUrl} 
                                    alt="Barcode QRIS Pembayaran" 
                                    className="w-48 h-48 mx-auto object-contain transition group-hover:scale-105"
                                />
                            ) : (
                                <div className="w-48 h-48 flex items-center justify-center text-xs text-gray-400">
                                    Menyiapkan Barcode...
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => setShowZoomModal(true)}
                                className="absolute bottom-2 right-2 p-1.5 bg-gray-900/80 hover:bg-gray-900 text-white rounded-lg opacity-0 group-hover:opacity-100 transition shadow"
                                title="Perbesar Barcode"
                            >
                                <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Amount */}
                        <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                            <span className="text-[10px] text-gray-500 font-medium">Nominal Pembayaran</span>
                            <div className="text-lg font-black text-gray-900">
                                {formatCurrency(totalAmount)}
                            </div>
                        </div>

                        {/* Supported Logos Footnote */}
                        <div className="mt-3 pt-2 text-[9px] text-gray-500 font-medium leading-tight">
                            SATU QRIS UNTUK SEMUA: Mobile Banking & E-Wallet
                        </div>
                    </div>

                    {/* Barcode Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleDownloadBarcode}
                            className="flex-1 py-2.5 px-3 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Barcode (PNG)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowZoomModal(true)}
                            className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                        >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Perbesar</span>
                        </button>
                    </div>

                    {/* Step-by-step instructions */}
                    <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5 text-xs text-gray-700 space-y-1.5">
                        <p className="font-bold text-blue-900 text-[11px] uppercase tracking-wider flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                            Cara Bayar Lewat Barcode:
                        </p>
                        <ol className="list-decimal list-inside space-y-1 text-gray-600 text-[11px] leading-relaxed">
                            <li>Buka aplikasi m-Banking (BCA, BRImo, Livin) atau E-Wallet (DANA, GoPay, OVO).</li>
                            <li>Pilih menu <strong>Scan QR / QRIS</strong> di aplikasi Anda.</li>
                            <li>Arahkan kamera ke Barcode di atas (atau <em>Upload dari Galeri</em> jika sudah di-download).</li>
                            <li>Periksa nama penerima: <strong>{MERCHANT_NAME}</strong>, lalu konfirmasi pembayaran.</li>
                        </ol>
                    </div>
                </div>
            )}

            {/* CHANNEL 2: E-WALLET (DANA / GOPAY / OVO / SHOPEEPAY) */}
            {activeMethod === 'E-Wallet' && (
                <div className="bg-white border-2 border-emerald-100 rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs">
                                📱
                            </span>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900">Transfer E-Wallet</h4>
                                <p className="text-[11px] text-gray-500">DANA, GoPay, OVO, ShopeePay</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-extrabold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                            INSTAN
                        </span>
                    </div>

                    {/* E-Wallet Card */}
                    <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-5 shadow-md space-y-4">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold tracking-wider uppercase text-emerald-100">E-Wallet Indonesia</span>
                            <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-extrabold">DANA / GOPAY / OVO</span>
                        </div>

                        <div>
                            <p className="text-[11px] text-emerald-100 mb-0.5">Nomor E-Wallet Tujuan:</p>
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-2xl font-black tracking-wider text-white">
                                    {EWALLET_NUM}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleCopy(EWALLET_NUM, 'ewallet')}
                                    className="px-3 py-1.5 bg-white text-emerald-800 rounded-xl text-xs font-extrabold hover:bg-emerald-50 transition flex items-center gap-1 shadow-sm active:scale-95"
                                >
                                    {copiedField === 'ewallet' ? (
                                        <>
                                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Tersalin!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5" />
                                            <span>Salin</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-between items-end border-t border-emerald-500/50 pt-3 text-xs">
                            <div>
                                <p className="text-[10px] text-emerald-200">Atas Nama:</p>
                                <p className="font-bold text-white uppercase">{EWALLET_NAME}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-emerald-200">Nominal Transfer:</p>
                                <p className="font-black text-sm text-white">{formatCurrency(totalAmount)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Instruction */}
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 text-xs text-gray-700 space-y-1">
                        <p className="font-bold text-emerald-900 text-[11px]">💡 Petunjuk Transfer E-Wallet:</p>
                        <p className="text-gray-600 text-[11px]">
                            Buka aplikasi DANA / GoPay / OVO Anda, pilih menu <strong>Kirim / Transfer ke Nomor HP</strong>, masukkan nomor <strong>{EWALLET_NUM}</strong>, pastikan nama penerima <strong>{EWALLET_NAME}</strong>, lalu masukkan nominal transfer <strong>{formatCurrency(totalAmount)}</strong>.
                        </p>
                    </div>
                </div>
            )}

            {/* CHANNEL 3: REKENING BANK BRI */}
            {activeMethod === 'Virtual Account' && (
                <div className="bg-white border-2 border-purple-100 rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-xs">
                                🏦
                            </span>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900">Transfer Rekening Bank</h4>
                                <p className="text-[11px] text-gray-500">Bank Rakyat Indonesia (BRI)</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-extrabold px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                            BANK BRI
                        </span>
                    </div>

                    {/* Bank Card Visual */}
                    <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 text-white rounded-2xl p-5 shadow-md space-y-4">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold tracking-wider text-blue-200">BANK BRI (Kode: 002)</span>
                            <span className="bg-blue-500/30 px-2 py-0.5 rounded text-[10px] font-bold">ATM / BRImo</span>
                        </div>

                        <div>
                            <p className="text-[11px] text-blue-200 mb-0.5">Nomor Rekening Tujuan:</p>
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-2xl font-black tracking-wider text-white">
                                    {BRI_REK}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleCopy(BRI_REK, 'bri')}
                                    className="px-3 py-1.5 bg-white text-blue-900 rounded-xl text-xs font-extrabold hover:bg-blue-50 transition flex items-center gap-1 shadow-sm active:scale-95"
                                >
                                    {copiedField === 'bri' ? (
                                        <>
                                            <Check className="w-3.5 h-3.5 text-blue-600" />
                                            <span>Tersalin!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5" />
                                            <span>Salin</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-between items-end border-t border-blue-700/50 pt-3 text-xs">
                            <div>
                                <p className="text-[10px] text-blue-300">Pemilik Rekening:</p>
                                <p className="font-bold text-white uppercase">{BRI_NAME}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-blue-300">Nominal Transfer:</p>
                                <p className="font-black text-sm text-white">{formatCurrency(totalAmount)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Instruction */}
                    <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-3.5 text-xs text-gray-700 space-y-1">
                        <p className="font-bold text-purple-900 text-[11px]">💡 Petunjuk Transfer Rekening:</p>
                        <p className="text-gray-600 text-[11px]">
                            Transfer dapat dilakukan melalui <strong>BRImo (Mobile Banking)</strong>, ATM BRI, atau transfer antar bank (masukkan kode bank BRI: <strong>002</strong> diikuti rekening <strong>{BRI_REK}</strong>).
                        </p>
                    </div>
                </div>
            )}

            {/* DIRECT WHATSAPP CONFIRMATION BUTTON */}
            <div className="pt-2">
                <a
                    href={generateWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-98"
                >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    <span>Kirim Bukti Pembayaran ke WhatsApp Admin</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-80" />
                </a>
                <p className="text-center text-[10px] text-gray-500 mt-2">
                    Setelah transfer, admin akan memverifikasi dan menyetujui (approve) pesanan Anda.
                </p>
            </div>

            {/* FULLSCREEN BARCODE MODAL */}
            {showZoomModal && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
                    onClick={() => setShowZoomModal(false)}
                >
                    <div 
                        className="bg-white rounded-3xl p-6 max-w-sm w-full text-center relative border shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-red-600 text-white py-1.5 px-3 rounded-lg mb-3 flex items-center justify-between text-xs font-extrabold">
                            <span>QRIS STANDAR</span>
                            <span className="text-[10px] opacity-90">{MERCHANT_NAME}</span>
                        </div>

                        {qrDataUrl && (
                            <img 
                                src={qrDataUrl} 
                                alt="Barcode QRIS Full" 
                                className="w-64 h-64 mx-auto object-contain my-3"
                            />
                        )}

                        <div className="text-lg font-black text-gray-900 mb-1">
                            {formatCurrency(totalAmount)}
                        </div>
                        <p className="text-xs text-gray-500 mb-4">Arahkan kamera smartphone ke Barcode ini untuk membayar</p>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleDownloadBarcode}
                                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Simpan Barcode</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowZoomModal(false)}
                                className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BarcodePayment;
