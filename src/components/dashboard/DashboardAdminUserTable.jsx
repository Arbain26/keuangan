import React, { useState } from 'react';
import { Search, Plus, Crown, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { isSuperAdmin } from '../../utils/subscriptionEngine';
import { formatDate } from '../../utils/format';
import { cn } from '../../lib/utils';

/**
 * Super Admin user list & quick controls displayed on dashboard overview.
 * Conforms to HANDBOOK_CLEANCODE.md Section 4.1 (< 150 lines).
 */
export function DashboardAdminUserTable({
  allSubscriptions = [],
  onOpenEditModal,
  onDeleteUser,
  onNavigateToSubscriptions
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = allSubscriptions
    .filter(sub => {
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;
      const emailStr = typeof sub.user_email === 'string' ? sub.user_email.toLowerCase() : '';
      const idStr = typeof sub.user_id === 'string' ? sub.user_id.toLowerCase() : '';
      return emailStr.includes(term) || idStr.includes(term);
    })
    .slice(0, 10);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm overflow-hidden space-y-4"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
              <Crown className="w-3 h-3 text-amber-600" />
              KONTROL ADMIN UTAMA
            </span>
            <span className="text-xs font-bold text-gray-500">
              Total {allSubscriptions.length} Pengguna Terdaftar
            </span>
          </div>
          <h3 className="text-xl font-black text-gray-900">
            Manajemen & Kontrol Pengguna Website
          </h3>
          <p className="text-xs text-gray-500">
            Atur paket, masa aktif, status, atau hapus pengguna secara langsung dari sini.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari user / email..."
              className="pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-44 md:w-56"
            />
          </div>
          <button
            onClick={() => onOpenEditModal(null)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah / Beri User
          </button>
          <button
            onClick={onNavigateToSubscriptions}
            className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <Crown className="w-3.5 h-3.5" />
            Kelola Lengkap
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100">
        <table className="w-full text-left text-xs min-w-[700px]">
          <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-gray-100">
            <tr>
              <th className="py-3 px-4">Pengguna</th>
              <th className="py-3 px-4">Paket</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Masa Berlaku</th>
              <th className="py-3 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-8 text-center text-gray-400">
                  Belum ada data pengguna yang terdaftar di database.
                </td>
              </tr>
            ) : (
              filtered.map((sub) => {
                const isUserSuper = isSuperAdmin(sub.user_email || sub);
                return (
                  <tr key={sub.id || sub.user_id} className="hover:bg-gray-50/60 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-gray-900">{sub.user_email || 'Email belum tercatat'}</p>
                        {isUserSuper && (
                          <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded">
                            UTAMA
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[10px] text-gray-400">UID: {sub.user_id}</p>
                    </td>
                    <td className="py-3 px-4 font-bold">
                      <span className={cn(
                        sub.plan_code === 'PREMIUM_LIFETIME' ? 'text-amber-600' :
                        sub.plan_code === 'PREMIUM_YEARLY' ? 'text-purple-600' :
                        sub.plan_code === 'PREMIUM_MONTHLY' ? 'text-blue-600' : 'text-gray-600'
                      )}>
                        {sub.plan_code === 'PREMIUM_MONTHLY' ? 'Premium 1 Bulan' :
                         sub.plan_code === 'PREMIUM_YEARLY' ? 'Premium 1 Tahun' :
                         sub.plan_code === 'PREMIUM_LIFETIME' ? 'Premium Unlimited' : 'FREE'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold",
                        sub.subscription_status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                        sub.subscription_status === 'EXPIRED' ? 'bg-rose-100 text-rose-800' :
                        'bg-gray-100 text-gray-700'
                      )}>
                        {sub.subscription_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 font-mono text-[11px]">
                      {sub.plan_code === 'PREMIUM_LIFETIME' ? (
                        <span className="text-amber-600 font-bold">Selamanya (Lifetime)</span>
                      ) : sub.subscription_end ? (
                        formatDate(sub.subscription_end)
                      ) : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onOpenEditModal(sub)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-xs"
                          title="Edit Data & Paket User"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </button>
                        {!isUserSuper && (
                          <button
                            onClick={() => onDeleteUser(sub.user_id, sub.user_email)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border border-rose-200"
                            title="Hapus User Secara Permanen"
                          >
                            <Trash2 className="w-3 h-3" />
                            Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {allSubscriptions.length > 10 && (
        <div className="text-center pt-1">
          <button
            onClick={onNavigateToSubscriptions}
            className="text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline"
          >
            Lihat Seluruh {allSubscriptions.length} Pengguna di Menu Kelola Langganan →
          </button>
        </div>
      )}
    </motion.div>
  );
}
