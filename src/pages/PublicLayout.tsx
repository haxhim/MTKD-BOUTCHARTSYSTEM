import React, { useEffect, useState } from 'react';
import { Outlet, useParams, NavLink } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';
import { Loader2 } from 'lucide-react';

export const PublicLayout: React.FC = () => {
    const { tournamentId } = useParams<{ tournamentId: string }>();
    const { loadTournament } = useTournament();

    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

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
            // Re-fetch crucial data
            // In a real optimized app, we'd have a specific "sync" function.
            // For now, re-calling loadTournament is heavy but compliant with "use context".
            // To be lighter, we might just re-fetch matches.
            // But context loadTournament does everything.
            // Let's assume we want to refresh every 30s? User said "safe interval".
            // Or better: Supabase subscription would be here.

            // For this implementation, we will perform a lightweight re-fetch if possible,
            // or just rely on manual refresh if user interaction is minimal. 
            // However, "Live Bout Board" needs updates.
            // We'll define a simpler poller later or just re-load.

            loadTournament(tournamentId).then(() => setLastUpdated(new Date()));
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [tournamentId]);

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
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Public Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-4 py-3 shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                        M
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-900 leading-tight">MTKD Tournament</h1>
                        <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            LIVE Public Access
                        </p>
                    </div>
                </div>

                {/* Public Navigation */}
                <nav className="hidden md:flex items-center gap-1">
                    <NavLink to="live" className={({ isActive }) => `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>Live Board</NavLink>
                    <NavLink to="brackets" className={({ isActive }) => `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>Brackets</NavLink>
                    <NavLink to="results" className={({ isActive }) => `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>Results</NavLink>
                    <NavLink to="participants" className={({ isActive }) => `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>Master List</NavLink>
                </nav>

                {/* Auto-refresh indicator */}
                <div className="text-xs text-gray-400 hidden lg:block">
                    Updated: {lastUpdated.toLocaleTimeString()}
                </div>
            </header>

            <main className="p-4 max-w-7xl mx-auto">
                <Outlet />
            </main>
        </div>
    );
};
