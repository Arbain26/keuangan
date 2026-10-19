import React from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { motion } from 'framer-motion';

/**
 * Visual charts for cashflow analytics and category breakdown.
 * Conforms to HANDBOOK_CLEANCODE.md Section 4.1 (< 150 lines).
 */
export function DashboardCharts({
  chartOptions,
  chartData,
  categoryChartOptions,
  categoryChartData,
  topCategories = [],
  totalExpenseAmount = 0,
  colorPalette = [],
  currency,
  displayCurrency
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      {/* Line Chart */}
      <div className="lg:col-span-2 bg-white border border-gray-200/90 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-extrabold text-gray-900">Cashflow Analytics / Arus Kas</h3>
            <p className="text-xs text-gray-500">Tren pemasukan dan pengeluaran per periode</p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg">
            Currency: {currency}
          </span>
        </div>
        <div className="h-72">
          <Line options={chartOptions} data={chartData} />
        </div>
      </div>

      {/* Doughnut Chart */}
      <div className="bg-white border border-gray-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-extrabold text-gray-900">Expense Breakdown / Pengeluaran</h3>
            <p className="text-xs text-gray-500">Distribusi alokasi per kategori</p>
          </div>
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
              const percentage = totalExpenseAmount > 0 
                ? ((item.amount / totalExpenseAmount) * 100).toFixed(0) 
                : 0;
              return (
                <div key={item.category} className="flex items-center justify-between text-xs text-gray-700">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: colorPalette[idx % colorPalette.length] || '#3b82f6' }} 
                    />
                    <span className="capitalize truncate max-w-[120px] font-medium">{item.category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 font-medium font-mono">{displayCurrency(item.amount)}</span>
                    <span className="font-bold text-gray-900 w-8 text-right">{percentage}%</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
}
