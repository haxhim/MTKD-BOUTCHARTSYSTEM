import React, { useEffect, useState } from 'react';
import { Outlet, useParams, NavLink } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';
import { Loader2 } from 'lucide-react';

import mtkdLogo from '../assets/mtkd-logo.webp';
import { Menu, X } from 'lucide-react';

export const PublicLayout: React.FC = () => {
    const { tournamentId } = useParams<{ tournamentId: string }>();
    const { loadTournament } = useTournament();

    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const init = async () => {
            if (tournamentId) {
                // Always load for public views to ensure fresh data
                await loadTournament(tournamentId);
            }
            setIsLoading(false);
        };
        init();
    }, [tournamentId]);


    // Polling for live updates (safe fallback)
    useEffect(() => {
        if (!tournamentId) return;

        const interval = setInterval(() => {
            loadTournament(tournamentId).then(() => setLastUpdated(new Date()));
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [tournamentId]);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-blue-600" size={40} />
                    <p className="text-gray-500 font-medium">Loading Tournament...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
            {/* Public Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
                <div className="px-4 py-3 flex justify-between items-center max-w-7xl mx-auto w-full">
                    <div className="flex items-center gap-3">
                        <img
                            src={mtkdLogo}
                            alt="MTKD Logo"
                            className="w-10 h-10 object-contain"
                        />
                        <div>
                            <h1 className="font-bold text-gray-900 leading-tight text-lg">MTKD Tournament</h1>
                            <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                LIVE Public Access
                            </p>
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-1">
                        <NavLink to="live" className={({ isActive }) => `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>Live Board</NavLink>
                        <NavLink to="brackets" className={({ isActive }) => `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>Brackets</NavLink>
                        <NavLink to="results" className={({ isActive }) => `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>Results</NavLink>
                        <NavLink to="participants" className={({ isActive }) => `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>Master List</NavLink>
                    </nav>

                    {/* Mobile Menu Button + Auto-refresh indicator */}
                    <div className="flex items-center gap-4">
                        <div className="text-xs text-gray-400 hidden lg:block">
                            Updated: {lastUpdated.toLocaleTimeString()}
                        </div>
                        <button
                            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden border-t border-gray-100 bg-white absolute w-full left-0 shadow-lg animate-fadeIn">
                        <nav className="flex flex-col p-2 space-y-1">
                            <NavLink to="live" className={({ isActive }) => `px-4 py-3 rounded-lg text-base font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`} onClick={() => setIsMobileMenuOpen(false)}>Live Board</NavLink>
                            <NavLink to="brackets" className={({ isActive }) => `px-4 py-3 rounded-lg text-base font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`} onClick={() => setIsMobileMenuOpen(false)}>Brackets</NavLink>
                            <NavLink to="results" className={({ isActive }) => `px-4 py-3 rounded-lg text-base font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`} onClick={() => setIsMobileMenuOpen(false)}>Results</NavLink>
                            <NavLink to="participants" className={({ isActive }) => `px-4 py-3 rounded-lg text-base font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`} onClick={() => setIsMobileMenuOpen(false)}>Master List</NavLink>
                        </nav>
                        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 text-center">
                            Last Updated: {lastUpdated.toLocaleTimeString()}
                        </div>
                    </div>
                )}
            </header>

            <main className="flex-1 p-4 max-w-7xl mx-auto w-full">
                <Outlet />
            </main>
        </div>
    );
};
