import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useTournament } from '../context/TournamentContext';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { Menu, Save, Loader2, Search } from 'lucide-react';

export const Layout: React.FC = () => {
    const { tournamentName, isSaving, saveData, tournamentId } = useTournament();
    const { showToast } = useToast();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const handleSave = async () => {
        showToast('Saving tournament data...', 'loading', 0);
        try {
            await saveData();
            showToast('Tournament saved successfully!', 'success', 3000);
        } catch {
            showToast('Failed to save tournament', 'error', 5000);
        }
    };

    const handleExit = () => {
        // Clear local storage directly to avoid state update race conditions
        localStorage.removeItem('mtkd_tournament_id');
        localStorage.removeItem('mtkd_tournament_name');
        window.location.href = '/lobby';
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 font-sans text-gray-900">
            {/* Sidebar Navigation */}
            <Sidebar
                onLogout={handleLogout}
                onExit={handleExit}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                tournamentId={tournamentId}
            />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-h-screen lg:h-screen overflow-hidden">
                {/* Top Header */}
                <header className="h-14 sm:h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-3 sm:px-4 lg:px-8 sticky top-0 z-30 shadow-sm shadow-gray-100/50">
                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors touch-target"
                        >
                            <Menu size={22} className="text-gray-600" />
                        </button>

                        <h2 className="text-sm sm:text-lg font-bold text-gray-800 truncate max-w-[120px] sm:max-w-none">{tournamentName || 'Untitled Tournament'}</h2>
                        <span className="hidden sm:flex px-2 sm:px-2.5 py-0.5 sm:py-1 bg-emerald-50 text-emerald-600 text-[10px] sm:text-xs rounded-full font-semibold border border-emerald-100 items-center gap-1 sm:gap-1.5">
                            <span className="w-1 sm:w-1.5 h-1 sm:h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            Live
                        </span>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-200 active:scale-[0.98] flex items-center gap-1.5 sm:gap-2 touch-target disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <Loader2 size={14} className="sm:w-4 sm:h-4 animate-spin" />
                            ) : (
                                <Save size={14} className="sm:w-4 sm:h-4" />
                            )}
                            <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
                        </button>

                        <div className="relative hidden md:block">
                            <Search className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                placeholder="Search players..."
                                className="pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-50 rounded-lg sm:rounded-xl text-xs sm:text-sm w-36 sm:w-48 lg:w-64 transition-all outline-none placeholder:text-gray-400"
                            />
                        </div>

                        <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center text-gray-600 font-bold text-[10px] sm:text-xs border border-gray-200 shadow-sm">
                            AD
                        </div>
                    </div>
                </header>

                {/* Scrollable Workspace */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
