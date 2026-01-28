
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTournament } from '../context/TournamentContext';

export const Lobby: React.FC<{ onJoin: () => void }> = ({ onJoin }) => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const { setTournamentInfo } = useTournament();
    const [recentTournaments, setRecentTournaments] = useState<any[]>([]);

    useEffect(() => {
        loadRecents();
    }, []);

    const loadRecents = async () => {
        const { data } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false }).limit(5);
        if (data) setRecentTournaments(data);
    };

    const createRoom = async () => {
        if (!name.trim()) return;
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();

        // Insert new tournament
        const { data, error } = await supabase
            .from('tournaments')
            .insert([{
                name: name,
                owner_id: user?.id
            }])
            .select()
            .single();

        if (error) {
            alert('Error creating room: ' + error.message);
            setLoading(false);
            return;
        }

        if (data) {
            setTournamentInfo(data.id, data.name);
            onJoin(); // Proceed to active state
        }
        setLoading(false);
    };

    const joinRoom = (t: any) => {
        setTournamentInfo(t.id, t.name);
        onJoin();
    };

    const handleLogout = () => {
        supabase.auth.signOut();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100 rounded-full opacity-40 blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-100 rounded-full opacity-40 blur-3xl"></div>
            </div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-gray-200/50 p-8 max-w-md w-full border border-white/50">
                <button
                    onClick={handleLogout}
                    className="absolute top-4 right-4 flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors font-medium"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                </button>

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-200 mb-4">
                        <span className="text-2xl">🏆</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">MTKD Manager</h1>
                    <p className="text-gray-500 mt-1">Tournament Management System</p>
                </div>

                <div className="space-y-6">
                    {/* Create New Room */}
                    <div className="bg-gray-50/80 rounded-xl p-5 border border-gray-100">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">Create New Tournament</label>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Enter tournament name..."
                                className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                            />
                            <button
                                onClick={createRoom}
                                disabled={loading || !name}
                                className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200 active:scale-[0.98]"
                            >
                                {loading ? (
                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                    </svg>
                                ) : 'Create'}
                            </button>
                        </div>
                    </div>

                    {/* Recent Tournaments */}
                    {recentTournaments.length > 0 && (
                        <div>
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="px-3 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-sm text-gray-400 font-medium">Recent Tournaments</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {recentTournaments.map(t => (
                                    <div key={t.id} className="flex gap-2 items-stretch animate-fadeIn">
                                        <button
                                            onClick={() => joinRoom(t)}
                                            className="flex-1 text-left p-4 rounded-xl bg-white hover:bg-blue-50/50 border border-gray-100 hover:border-blue-200 flex justify-between items-center transition-all group shadow-sm hover:shadow-md"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg flex items-center justify-center text-gray-400 group-hover:from-blue-100 group-hover:to-blue-50 group-hover:text-blue-500 transition-all">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                    </svg>
                                                </div>
                                                <span className="font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">{t.name}</span>
                                            </div>
                                            <span className="text-gray-300 text-sm group-hover:text-blue-500 transition-colors flex items-center gap-1">
                                                Open
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </span>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm(`Delete "${t.name}"?`)) {
                                                    supabase.from('tournaments').delete().eq('id', t.id).then(() => loadRecents());
                                                }
                                            }}
                                            className="px-4 rounded-xl bg-white hover:bg-red-50 text-gray-300 hover:text-red-500 border border-gray-100 hover:border-red-200 transition-all flex items-center justify-center shadow-sm"
                                            title="Delete Tournament"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
