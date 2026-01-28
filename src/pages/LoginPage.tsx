import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Login } from '../components/Login';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

export const LoginPage: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    if (session) {
        return <Navigate to="/lobby" replace />;
    }

    return <Login />;
};
