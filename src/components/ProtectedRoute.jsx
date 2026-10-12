import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const ProtectedRoute = ({ children }) => {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(() => supabase ? true : false);

    useEffect(() => {
        if (!supabase) {
            return;
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => {
            if (subscription) subscription.unsubscribe();
        };
    }, []);

    if (!supabase) {
        return <Navigate to="/login" replace />;
    }

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-white text-gray-700">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Memeriksa Sesi...</p>
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
