import React from 'react';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, CreditCard, Target, FileText, Crown, 
  Sparkles, ShoppingBag, User, Globe, ChevronRight, ShieldCheck 
} from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Navigation sidebar component.
 * Conforms to HANDBOOK_CLEANCODE.md Section 4.1 (< 150 lines).
 */
export function DashboardSidebar({
  activeTab,
  onSelectTab,
  isSidebarOpen,
  onCloseSidebar,
  isAdminUtama,
  pendingOrdersCount = 0,
  t
}) {
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: t('nav.dashboard'), sublabel: t('nav.dashboardSub') },
    { id: 'transactions', icon: CreditCard, label: t('nav.transactions'), sublabel: t('nav.transactionsSub') },
    { id: 'budgets', icon: Target, label: t('nav.budgets'), sublabel: t('nav.budgetsSub') },
    { id: 'reports', icon: FileText, label: t('nav.reports'), sublabel: t('nav.reportsSub') },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[80] md:hidden backdrop-blur-xs transition-opacity duration-300"
          onClick={onCloseSidebar}
        />
      )}

      {/* Sidebar Panel */}
      <aside className={cn(
        "fixed top-0 left-0 bottom-0 md:relative z-[90] w-72 md:w-64 h-screen md:h-auto bg-white border-r border-gray-200/80 transform transition-transform duration-300 ease-in-out flex flex-col overflow-y-auto shadow-2xl md:shadow-none",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-4 flex flex-col h-full">
          <div className="space-y-1 flex-1">
            <p className="px-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2 mt-2">{t('nav.mainNav')}</p>
            
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { onSelectTab(item.id); onCloseSidebar(); }}
                  className={cn(
                    "w-full text-left px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-between mb-1 group",
                    isActive ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-gray-400 group-hover:text-gray-700")} />
                    <div>
                      <span className="block leading-tight">{item.label}</span>
                      {item.sublabel && (
                        <span className={cn("block text-[10px] font-normal leading-tight mt-0.5", isActive ? "text-blue-100" : "text-gray-400")}>
                          {item.sublabel}
                        </span>
                      )}
                    </div>
                  </div>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </button>
              );
            })}

            {isAdminUtama && (
              <button
                onClick={() => { onSelectTab('subscriptions'); onCloseSidebar(); }}
                className={cn(
                  "w-full text-left px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-between mb-1 group",
                  activeTab === 'subscriptions' ? "bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <Crown className={cn("w-4 h-4", activeTab === 'subscriptions' ? "text-slate-950" : "text-amber-500")} />
                  <div>
                    <span className="block leading-tight">{t('nav.subscriptions')}</span>
                    <span className={cn("block text-[10px] font-normal leading-tight mt-0.5", activeTab === 'subscriptions' ? "text-amber-950" : "text-gray-400")}>
                      {t('nav.subscriptionsSub')}
                    </span>
                  </div>
                </div>
                {pendingOrdersCount > 0 && (
                  <span className="bg-amber-950 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-xs">
                    {pendingOrdersCount}
                  </span>
                )}
              </button>
            )}

            <p className="px-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2 mt-5">{t('nav.subsAndAccount')}</p>
            
            <Link to="/pricing" className="w-full text-left px-3.5 py-2 text-xs font-bold text-amber-700 bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200/60 rounded-xl transition-all flex items-center gap-2.5 mb-1.5 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <div>
                <span className="block leading-tight">{t('nav.upgradePremium')}</span>
                <span className="block text-[9px] text-amber-600/80 font-normal">{t('nav.pricingSub')}</span>
              </div>
            </Link>

            <Link to="/my-orders" className="w-full text-left px-3.5 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-all flex items-center gap-3 mb-1">
              <ShoppingBag className="w-4 h-4 text-gray-400" />
              <div>
                <span className="block leading-tight font-semibold">{t('nav.myOrders')}</span>
                <span className="block text-[10px] text-gray-400">{t('nav.ordersSub')}</span>
              </div>
            </Link>

            <button
              onClick={() => { onSelectTab('profile'); onCloseSidebar(); }}
              className={cn(
                "w-full text-left px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-between mb-1 group",
                activeTab === 'profile' ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <div className="flex items-center gap-3">
                <User className={cn("w-4 h-4", activeTab === 'profile' ? "text-white" : "text-gray-400 group-hover:text-gray-700")} />
                <div>
                  <span className="block leading-tight">{t('nav.profile')}</span>
                  <span className={cn("block text-[10px] font-normal leading-tight mt-0.5", activeTab === 'profile' ? "text-blue-100" : "text-gray-400")}>
                    {t('nav.profileSub')}
                  </span>
                </div>
              </div>
            </button>

            <Link to="/" target="_blank" className="w-full text-left px-3.5 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-all flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-gray-400" />
                <div>
                  <span className="block leading-tight font-semibold">{t('nav.publicPortal')}</span>
                  <span className="block text-[10px] text-gray-400">{t('nav.publicSub')}</span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            </Link>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/70 mt-auto shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className={cn("w-2 h-2 rounded-full", typeof navigator !== 'undefined' && navigator.onLine ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
              <div className="flex-1">
                <p className="text-[11px] font-bold text-gray-900">
                  {typeof navigator !== 'undefined' && navigator.onLine ? `${t('appName')} Engine ${t('engine.active')}` : `${t('appName')} ${t('engine.offline')}`}
                </p>
                <p className="text-[9px] text-gray-500">{t('engine.encryption')} • {t('engine.uptime')}</p>
              </div>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
