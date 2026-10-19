import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Modal to notify users when plan quotas/limits are exceeded.
 * Conforms to HANDBOOK_CLEANCODE.md Section 4.1 (< 50 lines).
 */
export function LimitModal({ limitModal, onClose, lang }) {
  if (!limitModal) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl relative border border-gray-100">
        <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{limitModal.title}</h3>
        <p className="text-xs text-gray-600 mb-6 leading-relaxed">{limitModal.message}</p>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
          >
            {lang === 'en' ? 'Close' : 'Tutup'}
          </button>
          <Link
            to="/pricing"
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center"
          >
            {lang === 'en' ? 'Upgrade to Premium' : 'Upgrade Premium'}
          </Link>
        </div>
      </div>
    </div>
  );
}
