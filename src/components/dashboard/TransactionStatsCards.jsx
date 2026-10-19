import React from 'react';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

/**
 * Overview statistics cards for revenue, expenses, and net cashflow.
 * Conforms to HANDBOOK_CLEANCODE.md Section 4.1 (< 150 lines).
 */
export function TransactionStatsCards({
  totalIncome,
  totalExpense,
  balance,
  displayCurrency
}) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-3 gap-6"
    >
      {/* Total Revenue */}
      <motion.div variants={cardVariants} className="bg-white border border-gray-200/90 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Revenue</p>
              <span className="text-[10px] text-gray-400">• Pemasukan</span>
            </div>
            <h3 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
              {displayCurrency(totalIncome)}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Total dana masuk periode ini
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl group-hover:scale-110 transition-transform">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
      </motion.div>

      {/* Total Expenses */}
      <motion.div variants={cardVariants} className="bg-white border border-gray-200/90 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Expenses</p>
              <span className="text-[10px] text-gray-400">• Pengeluaran</span>
            </div>
            <h3 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">
              {displayCurrency(totalExpense)}
            </h3>
            <p className="text-[11px] text-rose-600 font-medium mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Total beban pengeluaran tercatat
            </p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl group-hover:scale-110 transition-transform">
            <TrendingDown className="w-5 h-5 text-rose-600" />
          </div>
        </div>
      </motion.div>

      {/* Net Cashflow */}
      <motion.div variants={cardVariants} className="bg-white border border-gray-200/90 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all relative overflow-hidden group">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Cashflow</p>
              <span className="text-[10px] text-gray-400">• Saldo Bersih</span>
            </div>
            <h3 className={cn(
              "text-2xl lg:text-3xl font-extrabold tracking-tight",
              balance >= 0 ? "text-gray-900" : "text-rose-600"
            )}>
              {displayCurrency(balance)}
            </h3>
            <p className="text-[11px] text-blue-600 font-medium mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Cadangan kas likuid aktif
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl group-hover:scale-110 transition-transform">
            <Wallet className="w-5 h-5 text-blue-600" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
