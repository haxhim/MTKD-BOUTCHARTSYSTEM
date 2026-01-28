import React, { useEffect, useState } from 'react';
import { Outlet, useParams, NavLink } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';
import { PinEntry } from '../components/PinEntry';
import { Loader2, ShieldCheck, LogOut, Gavel, Medal } from 'lucide-react';

export const PrivateLayout: React.FC = () => {
    const { tournamentId } = useParams<{ tournamentId: string }>();
    const { loadTournament, tournamentId: currentId, pin } = useTournament();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Initial Load
    useEffect(() => {
        const init = async () => {
            if (tournamentId && tournamentId !== currentId) {
                await loadTournament(tournamentId);
            }

            // Check Session
            const sessionPin = sessionStorage.getItem(`mtkd_pin_${tournamentId}`);
            if (sessionPin === 'verified') {
                setIsAuthenticated(true);
            }
            setIsLoading(false);
        };
        init();
    }, [tournamentId, currentId, loadTournament]);

    const handlePinSuccess = () => {
        if (tournamentId) {
            sessionStorage.setItem(`mtkd_pin_${tournamentId}`, 'verified');
            setIsAuthenticated(true);
        }
    };

    const handleLogout = () => {
        if (tournamentId) {
            sessionStorage.removeItem(`mtkd_pin_${tournamentId}`);
            setIsAuthenticated(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
        );
    }

    if (!isAuthenticated) {
        // Use the PIN loaded from DB via Context
        return <PinEntry onSuccess={handlePinSuccess} correctPin={pin} />;
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Private Header */}
            <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 px-4 py-3 shadow-md flex justify-between items-center text-white">
                <div className="flex items-center gap-3">
                    <ShieldCheck className="text-amber-400" size={24} />
                    <div>
                        <h1 className="font-bold leading-tight">Official Area</h1>
                        <p className="text-xs text-slate-400">Authorized Personnel Only</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="hidden md:flex items-center gap-1">
                    <NavLink
                        to="judge"
                        className={({ isActive }) => `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${isActive ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <Gavel size={16} />
                        Judge
                    </NavLink>
                    <NavLink
                        to="medals"
                        className={({ isActive }) => `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${isActive ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <Medal size={16} />
                        Medals
                    </NavLink>
                </nav>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors border border-slate-700"
                >
                    <LogOut size={16} />
                    <span>Exit</span>
                </button>
            </header>

            <main className="p-4 max-w-7xl mx-auto">
                <Outlet />
            </main>
        </div>
    );
};
