import React from 'react';
import { X, Edit2, Save } from 'lucide-react';

/**
 * Super Admin modal for managing user subscription levels and dates.
 * Conforms to HANDBOOK_CLEANCODE.md Section 4.1 (< 150 lines).
 */
export function EditUserModal({
  isOpen,
  onClose,
  editUserForm,
  setEditUserForm,
  onSave,
  isSubmitting
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative border border-gray-100 max-h-[95vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition"
          aria-label="Tutup modal edit user"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
            <Edit2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900">
              Edit Data & Paket Pengguna
            </h3>
            <p className="text-xs text-gray-500">
              Atur email, paket langganan, status, dan masa berlaku pengguna
            </p>
          </div>
        </div>

        <form onSubmit={onSave} className="space-y-4 mt-6">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">User ID Target (UUID)</label>
            <input
              type="text"
              required
              value={editUserForm.userId}
              onChange={(e) => setEditUserForm({ ...editUserForm, userId: e.target.value })}
              placeholder="Masukkan UUID User"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Email Pengguna</label>
            <input
              type="email"
              value={editUserForm.userEmail}
              onChange={(e) => setEditUserForm({ ...editUserForm, userEmail: e.target.value })}
              placeholder="user@example.com"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Pilihan Paket</label>
              <select
                value={editUserForm.planCode}
                onChange={(e) => {
                  const plan = e.target.value;
                  let newEnd = editUserForm.subscriptionEnd;
                  if (plan === 'PREMIUM_MONTHLY') {
                    const d = new Date();
                    d.setDate(d.getDate() + 30);
                    newEnd = d.toISOString().split('T')[0];
                  } else if (plan === 'PREMIUM_YEARLY') {
                    const d = new Date();
                    d.setDate(d.getDate() + 365);
                    newEnd = d.toISOString().split('T')[0];
                  } else if (plan === 'PREMIUM_LIFETIME' || plan === 'FREE') {
                    newEnd = '';
                  }
                  setEditUserForm({
                    ...editUserForm,
                    planCode: plan,
                    subscriptionStatus: plan === 'FREE' ? 'FREE' : 'ACTIVE',
                    subscriptionEnd: newEnd
                  });
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="FREE">FREE (Gratis)</option>
                <option value="PREMIUM_MONTHLY">Premium 1 Bulan (30 Hari)</option>
                <option value="PREMIUM_YEARLY">Premium 1 Tahun (365 Hari)</option>
                <option value="PREMIUM_LIFETIME">Premium Unlimited (Lifetime)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Status Langganan</label>
              <select
                value={editUserForm.subscriptionStatus}
                onChange={(e) => setEditUserForm({ ...editUserForm, subscriptionStatus: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ACTIVE">ACTIVE (Aktif)</option>
                <option value="FREE">FREE (Biasa)</option>
                <option value="EXPIRED">EXPIRED (Kadaluarsa)</option>
              </select>
            </div>
          </div>

          {editUserForm.planCode !== 'PREMIUM_LIFETIME' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Masa Berlaku Sampai Tanggal</label>
              <input
                type="date"
                value={editUserForm.subscriptionEnd}
                onChange={(e) => setEditUserForm({ ...editUserForm, subscriptionEnd: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Catatan Admin (Opsional)</label>
            <textarea
              rows={2}
              value={editUserForm.note}
              onChange={(e) => setEditUserForm({ ...editUserForm, note: e.target.value })}
              placeholder="Alasan perubahan atau catatan..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
