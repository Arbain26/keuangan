import React from 'react';
import { Camera, Calendar, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { CATEGORIES } from '../../constants/categories';
import { cn } from '../../lib/utils';

/**
 * Transaction creation and edit form.
 * Conforms to HANDBOOK_CLEANCODE.md Section 4.1 (< 250 lines) and Section 3.2 (Guard clauses & Zod validation).
 */
export function TransactionForm({
  formData,
  setFormData,
  editingId,
  onCancelEdit,
  onSubmit,
  isSubmitting,
  currency,
  exchangeRate,
  formatNumberInput,
  isCustomCategory,
  setIsCustomCategory,
  receiptInputRef,
  onReceiptPhotoUpload,
  isScanningReceipt,
  scanProgress,
  t
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} 
      animate={{ opacity: 1, x: 0 }} 
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 h-fit"
    >
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm shadow-gray-100">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            {editingId ? 'Edit Transaksi' : 'Transaksi Baru'}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="text-xs text-rose-500 hover:text-rose-600 hover:underline font-semibold"
            >
              Batal Edit
            </button>
          )}
        </div>

        {/* Receipt OCR Trigger */}
        <input
          id="receipt-file-input"
          type="file"
          ref={receiptInputRef}
          onChange={onReceiptPhotoUpload}
          accept="image/*"
          className="hidden"
          aria-label="Unggah foto nota atau struk"
        />

        <button
          type="button"
          onClick={() => receiptInputRef.current?.click()}
          disabled={isScanningReceipt}
          className="w-full mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 hover:bg-blue-100 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer disabled:opacity-50"
        >
          {isScanningReceipt ? (
            <>
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>{scanProgress || 'Memindai Foto Nota...'}</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 text-blue-600" />
              <span>Catat via Foto Struk / AI Scan Receipt</span>
            </>
          )}
        </button>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Transaction Type Buttons */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-gray-50 rounded-lg border border-gray-200">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'pemasukan' })}
              className={cn(
                "py-2 text-xs font-bold rounded-md transition",
                formData.type === 'pemasukan' ? "bg-emerald-600 text-white shadow-sm" : "text-gray-700 hover:text-gray-900"
              )}
            >
              {t('transactions.income') || 'Pemasukan'}
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'pengeluaran' })}
              className={cn(
                "py-2 text-xs font-bold rounded-md transition",
                formData.type === 'pengeluaran' ? "bg-rose-600 text-white shadow-sm" : "text-gray-700 hover:text-gray-900"
              )}
            >
              {t('transactions.expense') || 'Pengeluaran'}
            </button>
          </div>

          {/* Date Input */}
          <div>
            <label htmlFor="trans-date" className="block text-xs font-semibold text-gray-700 mb-1.5 pl-1">
              {t('transactions.date') || 'Tanggal'}
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                id="trans-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                required
              />
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label htmlFor="trans-amount" className="block text-xs font-semibold text-gray-700 mb-1.5 pl-1">
              {t('transactions.amount') || 'Nominal'} ({currency})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm font-bold font-mono">
                {currency === 'USD' ? '$' : 'Rp'}
              </span>
              <input
                id="trans-amount"
                type="text"
                placeholder="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: formatNumberInput(e.target.value) })}
                className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition font-medium"
                required
              />
            </div>
            {formData.amount && (
              <p className="text-[10px] text-gray-500 mt-1 pl-1">
                {currency === 'USD' ? (
                  <span>≈ Rp {((Number(formData.amount.replace(/\D/g, '') || 0)) * exchangeRate).toLocaleString('id-ID')} (Kurs: 1 USD = Rp {exchangeRate.toLocaleString('id-ID')})</span>
                ) : (
                  <span>≈ ${(((Number(formData.amount.replace(/\D/g, '') || 0)) / exchangeRate)).toFixed(2)} USD (Kurs: 1 USD = Rp {exchangeRate.toLocaleString('id-ID')})</span>
                )}
              </p>
            )}
          </div>

          {/* Category Select */}
          <div>
            <label htmlFor="trans-category-select" className="block text-xs font-semibold text-gray-700 mb-1.5 pl-1">
              {t('transactions.category') || 'Kategori'}
            </label>
            <select
              id="trans-category-select"
              aria-label="Pilih Kategori Transaksi"
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
              <option value="" disabled>-- {t('transactions.selectCategory') || 'Pilih Kategori'} --</option>
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {t(`categories.${cat.id}`) || cat.label}
                </option>
              ))}
            </select>

            {isCustomCategory && (
              <input
                id="trans-custom-category"
                type="text"
                aria-label="Ketik Kategori Kustom"
                placeholder="Ketik Kategori Kustom..."
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg py-2.5 px-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition mb-3"
                required
              />
            )}

            <label htmlFor="trans-desc" className="block text-xs font-semibold text-gray-700 mb-1.5 pl-1">
              Keterangan / Catatan
            </label>
            <textarea
              id="trans-desc"
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
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
  );
}
