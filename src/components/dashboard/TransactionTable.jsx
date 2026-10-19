import React from 'react';
import { Search, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

/**
 * Transaction history table and responsive cards.
 * Conforms to HANDBOOK_CLEANCODE.md Section 4.1 (< 200 lines).
 */
export function TransactionTable({
  transactions,
  loading,
  searchTerm,
  onSearchChange,
  onEdit,
  onDelete,
  displayDate,
  displayCurrency,
  getCategoryLabel,
  getWeekdayLabel,
  currency,
  t
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="lg:col-span-2"
    >
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm shadow-gray-100 overflow-hidden flex flex-col lg:h-[calc(100vh-230px)]">
        {/* Header & Search */}
        <div className="p-5 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
          <h3 className="font-bold text-gray-900">Riwayat Transaksi</h3>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="search-transactions-input"
              aria-label="Cari data transaksi"
              type="text"
              placeholder="Cari transaksi..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto flex-1 lg:h-[calc(100vh-310px)] lg:overflow-y-auto">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="bg-gray-50/90 text-gray-600 font-bold uppercase tracking-wider text-[11px] border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3.5 w-1/4">{t('transactions.date') || 'Tanggal'}</th>
                <th className="px-6 py-3.5 w-1/4">{t('transactions.category') || 'Kategori'}</th>
                <th className="px-6 py-3.5 w-1/4">{t('transactions.amount') || 'Nominal'} ({currency})</th>
                <th className="px-6 py-3.5 w-1/4 text-right">{t('transactions.action') || 'Aksi'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center py-12 text-gray-400">
                    {t('admin.loading') || 'Memuat data...'}
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-12 text-gray-400">
                    {t('transactions.noTransactions') || 'Belum ada transaksi.'}
                  </td>
                </tr>
              ) : (
                <AnimatePresence initial={false}>
                  {transactions.map((tx) => (
                    <motion.tr 
                      key={tx.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.2 }}
                      className="hover:bg-gray-50/50 transition"
                    >
                      <td className="px-6 py-4">
                        <div className="text-gray-800 font-medium">{displayDate(tx.date)}</div>
                        <div className="text-xs text-gray-400 capitalize">
                          {getWeekdayLabel(tx.date, false)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={cn("w-2 h-2 rounded-full", tx.type === 'pemasukan' ? 'bg-emerald-500' : 'bg-rose-500')} />
                          <span className="text-gray-800 font-medium">{getCategoryLabel(tx.category)}</span>
                        </div>
                        {tx.description && tx.description !== '-' && (
                          <div className="text-xs text-gray-400 mt-1 truncate max-w-[150px]">{tx.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("font-semibold font-mono", tx.type === 'pemasukan' ? 'text-emerald-600' : 'text-rose-600')}>
                          {tx.type === 'pemasukan' ? '+' : '-'} {displayCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => onEdit(tx)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => onDelete(tx.id)} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Delete">
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

        {/* Mobile Card View */}
        <div className="md:hidden p-4 space-y-4">
          {loading ? (
            <div className="text-center py-4 text-gray-500">{t('admin.loading') || 'Memuat data...'}</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-4 text-gray-500">{t('transactions.noTransactions') || 'Belum ada transaksi.'}</div>
          ) : (
            <AnimatePresence initial={false}>
              {transactions.map((tx) => (
                <motion.div 
                  key={tx.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 shadow-sm"
                >
                  <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">
                        {displayDate(tx.date)} • {getWeekdayLabel(tx.date, true)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("w-2 h-2 rounded-full", tx.type === 'pemasukan' ? 'bg-emerald-500' : 'bg-rose-500')} />
                        <span className="text-gray-800 font-bold">{getCategoryLabel(tx.category)}</span>
                      </div>
                    </div>
                    <span className={cn("font-bold font-mono", tx.type === 'pemasukan' ? 'text-emerald-600' : 'text-rose-600')}>
                      {tx.type === 'pemasukan' ? '+' : '-'} {displayCurrency(tx.amount)}
                    </span>
                  </div>
                  {tx.description && tx.description !== '-' && (
                    <p className="text-xs text-gray-500 italic">{tx.description}</p>
                  )}
                  <div className="flex justify-end gap-2 pt-1">
                    <button onClick={() => onEdit(tx)} className="flex-1 py-2 bg-gray-50 text-gray-700 rounded flex items-center justify-center gap-2 text-xs font-medium border border-gray-200 hover:bg-gray-100">
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => onDelete(tx.id)} className="flex-1 py-2 bg-rose-50 text-rose-600 rounded flex items-center justify-center gap-2 text-xs font-medium border border-rose-200 hover:bg-rose-100">
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
  );
}
