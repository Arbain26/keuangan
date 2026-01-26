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
        <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Accents */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-lime-500/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="bg-[#161b22] border border-[#242c38] rounded-3xl p-8 md:p-10 shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-tr from-lime-400 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-lime-500/20">
                            <Lock className="w-8 h-8 text-black" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Admin Portal</h2>
                        <p className="text-gray-500 text-sm">Masuk untuk mengelola Dashboard Keuangan</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-500" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@example.com"
                                    className="block w-full pl-11 bg-[#1f2633] border border-[#2d3646] rounded-xl py-3.5 text-white placeholder-gray-600 focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 outline-none transition text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-500" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="block w-full pl-11 bg-[#1f2633] border border-[#2d3646] rounded-xl py-3.5 text-white placeholder-gray-600 focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 outline-none transition text-sm"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                <p className="text-red-400 text-xs font-medium">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center py-4 px-4 bg-lime-400 hover:bg-lime-500 text-black rounded-xl font-bold text-sm transition transform active:scale-95 shadow-lg shadow-lime-400/20 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {loading ? 'Memproses...' : 'Masuk Dashboard'}
                            {!loading && <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-[#242c38] text-center">
                        <Link to="/" className="inline-flex items-center text-xs font-bold text-lime-400 hover:text-lime-300 transition">
                            <LayoutDashboard className="w-3 h-3 mr-1.5" />
                            Kembali ke Halaman Publik
                        </Link>
                    </div>
                </div>

                <p className="text-center text-[#2d3646] text-xs mt-8">
                    &copy; {new Date().getFullYear()} FinTrack System. Secured Connection.
                </p>
            </div>
        </div>
    );
};

export default AdminLogin;
