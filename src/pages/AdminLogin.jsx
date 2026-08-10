import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, LayoutDashboard, AlertCircle } from 'lucide-react';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            navigate('/admin');
        }
    };

    return (
        <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Accents */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="bg-white border border-gray-100 rounded-3xl p-8 md:p-10 shadow-xl shadow-gray-200/50">
                    <div className="text-center mb-8">
                        <img src="/logo.jpg" alt="Logo FinTrack" width="64" height="64" decoding="async" className="w-16 h-16 rounded-2xl mx-auto mb-6 shadow-lg shadow-blue-500/20 object-cover" />
                        <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Admin Portal</h2>
                        <p className="text-gray-700 text-sm">Masuk untuk mengelola Dashboard Keuangan</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-1.5">
                            <label htmlFor="login-email" className="text-xs font-bold text-gray-700 uppercase tracking-wider ml-1">Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-500" />
                                </div>
                                <input
                                    id="login-email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@example.com"
                                    className="block w-full pl-11 bg-gray-50 border border-gray-200 rounded-xl py-3.5 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="login-password" className="text-xs font-bold text-gray-700 uppercase tracking-wider ml-1">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-500" />
                                </div>
                                <input
                                    id="login-password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="block w-full pl-11 bg-gray-50 border border-gray-200 rounded-xl py-3.5 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition text-sm"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-start gap-3">
                                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                                <p className="text-red-600 text-xs font-medium">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition transform active:scale-95 shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {loading ? 'Memproses...' : 'Masuk Dashboard'}
                            {!loading && <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-100 space-y-4 text-center">
                        <p className="text-sm text-gray-700">
                            Belum punya akun? <Link to="/register" className="font-bold text-blue-600 hover:text-blue-700 transition">Daftar sekarang</Link>
                        </p>
                        <div>
                            <Link to="/" className="inline-flex items-center text-xs font-bold text-gray-600 hover:text-gray-900 transition">
                                <LayoutDashboard className="w-3 h-3 mr-1.5" />
                                Kembali ke Halaman Publik
                            </Link>
                        </div>
                    </div>
                </div>

                <p className="text-center text-gray-600 text-xs mt-8">
                    &copy; {new Date().getFullYear()} FinTrack System. Secured Connection.
                </p>
            </div>
        </main>
    );
};

export default AdminLogin;
