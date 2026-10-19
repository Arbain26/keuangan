import React from 'react';

/**
 * User profile configuration view.
 * Conforms to HANDBOOK_CLEANCODE.md Section 4.1 (< 70 lines).
 */
export function ProfileSettingsView({
  profileData,
  setProfileData,
  profileMessage,
  onSubmit
}) {
  return (
    <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl p-8 shadow-sm shadow-gray-100">
      <h2 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-200 pb-4">
        Pengaturan Profil
      </h2>

      {profileMessage && (
        <div className="mb-6 p-4 rounded-lg border border-blue-100 bg-blue-50 text-blue-700 text-sm flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          {profileMessage}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label htmlFor="profile-email" className="block text-sm font-medium text-gray-700 mb-2">Email Akun</label>
          <input 
            id="profile-email" 
            type="text" 
            value={profileData.email} 
            disabled 
            className="w-full bg-gray-100 border border-gray-200 text-gray-600 rounded-lg p-3 text-sm cursor-not-allowed" 
          />
          <p className="text-xs text-gray-500 mt-1">Email tidak dapat diubah.</p>
        </div>
        <div>
          <label htmlFor="profile-fullname" className="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap</label>
          <input 
            id="profile-fullname" 
            type="text" 
            value={profileData.fullName} 
            onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })} 
            className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition" 
          />
        </div>
        <div>
          <label htmlFor="profile-newpassword" className="block text-sm font-medium text-gray-700 mb-2">Password Baru</label>
          <input 
            id="profile-newpassword" 
            type="password" 
            value={profileData.newPassword} 
            onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })} 
            placeholder="Biarkan kosong jika tidak ingin mengganti" 
            className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition" 
          />
        </div>
        <div className="pt-4">
          <button 
            type="submit" 
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 w-full md:w-auto"
          >
            Simpan Perubahan
          </button>
        </div>
      </form>
    </div>
  );
}
