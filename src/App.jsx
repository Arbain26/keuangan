import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PublicDashboard from './pages/PublicDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import ProtectedRoute from './components/ProtectedRoute';
import { supabase } from './lib/supabaseClient';

function App() {
  if (!supabase) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md border-l-4 border-red-500">
          <h1 className="text-xl font-bold text-red-600 mb-4">Konfigurasi Belum Selesai</h1>
          <p className="text-gray-700 mb-4">
            Aplikasi tidak dapat terhubung ke Supabase.
          </p>
          <div className="bg-gray-100 p-4 rounded text-sm text-gray-800 font-mono mb-4">
            VITE_SUPABASE_URL<br />
            VITE_SUPABASE_ANON_KEY
          </div>
          <p className="text-gray-600 text-sm">
            Pastikan Anda telah membuat file <strong>.env</strong> dan mengisi kedua variabel di atas dengan benar dari Dashboard Supabase Anda.
          </p>
          <p className="text-gray-500 text-xs mt-4">
            Jangan lupa restart terminal (npm run dev) setelah membuat file .env.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Routes>
          <Route path="/" element={<PublicDashboard />} />
          <Route path="/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
