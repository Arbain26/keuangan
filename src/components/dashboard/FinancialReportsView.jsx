import React from 'react';
import { capitalizeText } from '../../utils/format';
import { cn } from '../../lib/utils';

/**
 * Monthly cashflow statement and category allocation report.
 * Conforms to HANDBOOK_CLEANCODE.md Section 4.1 (< 220 lines).
 */
export function FinancialReportsView({
  transactions,
  activePeriod,
  currency,
  displayCurrency
}) {
  const incomeByCategory = {};
  const expenseByCategory = {};

  transactions.forEach(tx => {
    const cat = capitalizeText(tx.category || 'Lainnya');
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'pemasukan') {
      incomeByCategory[cat] = (incomeByCategory[cat] || 0) + amt;
    } else {
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + amt;
    }
  });

  const incomeRows = Object.entries(incomeByCategory).sort((a, b) => b[1] - a[1]);
  const expenseRows = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);
  const totalIncomeCat = incomeRows.reduce((s, [, v]) => s + v, 0);
  const totalExpenseCat = expenseRows.reduce((s, [, v]) => s + v, 0);
  const saldo = totalIncomeCat - totalExpenseCat;

  const periodLabel = activePeriod === 'week' ? (currency === 'USD' ? 'This Week (Minggu Ini)' : 'Minggu Ini')
    : activePeriod === 'month' ? new Date().toLocaleString(currency === 'USD' ? 'en-US' : 'id-ID', { month: 'long', year: 'numeric' })
    : activePeriod === 'year' ? (currency === 'USD' ? `Year ${new Date().getFullYear()}` : `Tahun ${new Date().getFullYear()}`)
    : (currency === 'USD' ? 'All Periods (Semua Periode)' : 'Semua Periode');

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">Financial Statement / Laporan</p>
          <h2 className="text-white text-xl font-extrabold tracking-tight">Anggaran Bulanan (Monthly Cashflow)</h2>
          <p className="text-slate-300 text-xs mt-1">
            Periode: <span className="font-bold text-white">{periodLabel}</span> • Mata Uang: <span className="font-bold text-blue-300">{currency}</span>
          </p>
        </div>

        {/* Saldo summary boxes */}
        <div className="flex gap-3 flex-wrap">
          <div className="bg-slate-700/60 border border-slate-600 rounded-xl px-4 py-3 text-center min-w-[120px]">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Revenue / Masuk</p>
            <p className="text-emerald-400 font-extrabold text-sm mt-0.5 font-mono">{displayCurrency(totalIncomeCat)}</p>
          </div>
          <div className="bg-slate-700/60 border border-slate-600 rounded-xl px-4 py-3 text-center min-w-[120px]">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Expenses / Keluar</p>
            <p className="text-rose-400 font-extrabold text-sm mt-0.5 font-mono">{displayCurrency(totalExpenseCat)}</p>
          </div>
          <div className={cn(
            "border rounded-xl px-4 py-3 text-center min-w-[120px]",
            saldo >= 0 ? "bg-emerald-600/20 border-emerald-500/40" : "bg-rose-600/20 border-rose-500/40"
          )}>
            <p className="text-slate-300 text-[10px] font-bold uppercase tracking-wider">Net Cash / Bersih</p>
            <p className={cn("font-extrabold text-sm mt-0.5 font-mono", saldo >= 0 ? "text-emerald-300" : "text-rose-300")}>
              {displayCurrency(saldo)}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Income Table */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
            <h3 className="font-extrabold text-gray-900 text-sm uppercase tracking-widest">Pendapatan (Income)</h3>
          </div>
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider">
                  <th className="px-4 py-3 w-8">#</th>
                  <th className="px-4 py-3">Kategori (Category)</th>
                  <th className="px-4 py-3 text-right">Nominal (Amount)</th>
                  <th className="px-4 py-3 text-right w-32">% Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {incomeRows.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-6 text-center text-gray-400 text-xs italic">Belum ada data pendapatan untuk periode ini.</td>
                  </tr>
                ) : incomeRows.map(([cat, amt], idx) => (
                  <tr key={cat} className={idx % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40'}>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{cat}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700 tabular-nums">{displayCurrency(amt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${totalIncomeCat > 0 ? (amt / totalIncomeCat * 100) : 0}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 font-semibold w-10 text-right">
                          {totalIncomeCat > 0 ? (amt / totalIncomeCat * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-100 border-t-2 border-emerald-300">
                  <td colSpan="2" className="px-4 py-3 font-extrabold text-emerald-800 text-xs uppercase tracking-wider">Total Pendapatan (Total Revenue)</td>
                  <td className="px-4 py-3 text-right font-extrabold text-emerald-800 tabular-nums">{displayCurrency(totalIncomeCat)}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700 text-xs">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Expense Table */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-sm bg-rose-500" />
            <h3 className="font-extrabold text-gray-900 text-sm uppercase tracking-widest">Pengeluaran (Expenses)</h3>
          </div>
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-rose-600 text-white text-xs font-bold uppercase tracking-wider">
                  <th className="px-4 py-3 w-8">#</th>
                  <th className="px-4 py-3">Kategori (Category)</th>
                  <th className="px-4 py-3 text-right">Aktual</th>
                  <th className="px-4 py-3 text-right w-32">% dari Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenseRows.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-6 text-center text-gray-400 text-xs italic">Belum ada data pengeluaran untuk periode ini.</td>
                  </tr>
                ) : expenseRows.map(([cat, amt], idx) => (
                  <tr key={cat} className={idx % 2 === 0 ? 'bg-white' : 'bg-rose-50/40'}>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{cat}</td>
                    <td className="px-4 py-3 text-right font-bold text-rose-700 tabular-nums">{displayCurrency(amt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${totalExpenseCat > 0 ? (amt / totalExpenseCat * 100) : 0}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 font-semibold w-10 text-right">
                          {totalExpenseCat > 0 ? (amt / totalExpenseCat * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-rose-100 border-t-2 border-rose-300">
                  <td colSpan="2" className="px-4 py-3 font-extrabold text-rose-800 text-xs uppercase tracking-wider">Total Pengeluaran (Total Expenses)</td>
                  <td className="px-4 py-3 text-right font-extrabold text-rose-800 tabular-nums">{displayCurrency(totalExpenseCat)}</td>
                  <td className="px-4 py-3 text-right font-bold text-rose-700 text-xs">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Cashflow Summary Table */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-slate-700 px-4 py-3">
            <h3 className="text-white font-bold text-xs uppercase tracking-widest">Ringkasan Saldo (Cashflow Summary)</h3>
          </div>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                <th className="px-4 py-2.5">Keterangan</th>
                <th className="px-4 py-2.5 text-right">Aktual</th>
                <th className="px-4 py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="bg-emerald-50/60">
                <td className="px-4 py-3 font-semibold text-gray-700">Total Pendapatan</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-700 tabular-nums">{displayCurrency(totalIncomeCat)}</td>
                <td className="px-4 py-3 text-right"><span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold">+ Inflow</span></td>
              </tr>
              <tr className="bg-rose-50/60">
                <td className="px-4 py-3 font-semibold text-gray-700">Total Pengeluaran</td>
                <td className="px-4 py-3 text-right font-bold text-rose-700 tabular-nums">{displayCurrency(totalExpenseCat)}</td>
                <td className="px-4 py-3 text-right"><span className="text-xs px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full font-bold">- Outflow</span></td>
              </tr>
              <tr className={saldo >= 0 ? 'bg-blue-50' : 'bg-amber-50'}>
                <td className="px-4 py-3 font-extrabold text-gray-900">SALDO BERSIH</td>
                <td className={cn("px-4 py-3 text-right font-extrabold tabular-nums text-base", saldo >= 0 ? "text-blue-700" : "text-amber-700")}>
                  {displayCurrency(saldo)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-bold", saldo >= 0 ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700")}>
                    {saldo >= 0 ? '✓ Surplus' : '⚠ Deficit'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
