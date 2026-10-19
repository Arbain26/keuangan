import React from 'react';
import { Menu, X, Clock, Crown, LogOut } from 'lucide-react';
import LanguageSwitcher from '../LanguageSwitcher';

/**
 * Top application header component.
 * Conforms to HANDBOOK_CLEANCODE.md Section 4.1 (< 150 lines).
 */
export function DashboardHeader({
  user,
  isAdminUtama,
  currency,
  onSetCurrency,
  userTimezoneLabel,
  currentTime,
  isSidebarOpen,
  onToggleSidebar,
  onLogout,
  t,
  lang
}) {
  return (
    <header className="fixed top-0 w-full h-16 bg-white/95 backdrop-blur-md border-b border-gray-200/80 z-50 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="md:hidden text-gray-500 hover:text-gray-900 transition p-2 rounded-lg hover:bg-gray-100 active:scale-95"
          aria-label="Toggle Navigation Sidebar"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src="/logo.jpg" alt="Logo Keuangan" className="w-9 h-9 rounded-xl object-cover ring-1 ring-gray-200 shadow-xs" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold text-gray-900 tracking-tight leading-tight">{t('appName')}</h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/60 rounded">PRO</span>
            </div>
            <p className="text-[10px] text-gray-400 font-medium">Financial Intelligence Workspace</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4">
        <LanguageSwitcher variant="header" />

        {/* Currency Switcher */}
        <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200/80 shadow-xs">
          <button
            type="button"
            onClick={() => onSetCurrency('IDR')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
              currency === 'IDR' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
            title="Format Mata Uang: Rupiah (IDR)"
          >
            IDR (Rp)
          </button>
          <button
            type="button"
            onClick={() => onSetCurrency('USD')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
              currency === 'USD' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
            title="Currency: US Dollar (USD)"
          >
            USD ($)
          </button>
        </div>

        {/* Live Clock */}
        <div className="hidden lg:flex flex-col items-end border-l border-gray-200 pl-3 md:pl-4">
          <span className="text-[11px] font-bold text-gray-800">
            {currentTime.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-gray-400" />
            {currentTime.toLocaleTimeString(currency === 'USD' ? 'en-US' : 'id-ID', { hour: '2-digit', minute: '2-digit' })} • {userTimezoneLabel}
          </span>
        </div>

        {/* Profile & Role */}
        <div className="flex items-center gap-3 border-l border-gray-200 pl-3 md:pl-4 h-9">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
            isAdminUtama ? 'bg-amber-100 border border-amber-300 text-amber-900 shadow-xs' : 'bg-blue-50 border border-blue-200 text-blue-600'
          }`}>
            {isAdminUtama ? <Crown className="w-4 h-4 text-amber-600" /> : 'MA'}
          </div>
          <div className="hidden md:block">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold text-gray-950 capitalize">{user?.user_metadata?.full_name || 'Administrator'}</p>
              {isAdminUtama ? (
                <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5 shadow-xs">
                  ★ SUPER ADMIN
                </span>
              ) : (
                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                  PRO MEMBER
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-400 truncate max-w-[140px]">{user?.email || 'admin@keuangan.id'}</p>
          </div>
          <button onClick={onLogout} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title={t('header.logoutTitle')}>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
