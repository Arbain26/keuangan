import React from 'react';
import { Activity } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Filter bar for time period selection and record count display.
 * Conforms to HANDBOOK_CLEANCODE.md Section 4.1 (< 150 lines).
 */
export function TransactionFilterBar({
  activePeriod,
  onSelectPeriod,
  recordsCount,
  t
}) {
  const periods = [
    { id: 'all', label: t('period.all') },
    { id: 'week', label: t('period.week') },
    { id: 'month', label: t('period.month') },
    { id: 'year', label: t('period.year') }
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white p-2 rounded-2xl border border-gray-200/80 shadow-xs">
      <div className="flex flex-wrap gap-1.5">
        {periods.map((period) => {
          const isActive = activePeriod === period.id;
          return (
            <button
              key={period.id}
              onClick={() => onSelectPeriod(period.id)}
              className={cn(
                "px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all",
                isActive
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              {period.label}
            </button>
          );
        })}
      </div>
      <div className="text-xs text-gray-500 font-medium px-3 flex items-center gap-1.5">
        <Activity className="w-3.5 h-3.5 text-emerald-500" />
        <span>{recordsCount} {t('records')}</span>
      </div>
    </div>
  );
}
