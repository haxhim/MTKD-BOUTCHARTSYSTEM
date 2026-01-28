
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                alert('Account created! You can now log in.');
                setIsSignUp(false); // Switch to login after signup
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full opacity-50 blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-100 rounded-full opacity-50 blur-3xl"></div>
            </div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-gray-200/50 p-8 max-w-sm w-full border border-white/50">
                {/* Logo/Brand Section */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-200 mb-4">
                        <span className="text-2xl font-bold text-white">M</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">Welcome Back</h1>
                    <p className="text-gray-500 mt-1">MTKD Tournament Manager</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-start gap-2">
                        <svg className="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder:text-gray-400 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder:text-gray-400 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-3 px-4 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-200 active:scale-[0.98]"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                            </span>
                        ) : (isSignUp ? 'Create Account' : 'Sign In')}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="px-3 bg-white text-sm text-gray-400">or</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm hover:underline transition-colors"
                    >
                        {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Create one'}
                    </button>
                </div>
            </div>
        </div>
    );
};
