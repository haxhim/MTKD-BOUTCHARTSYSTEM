import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';
import { useEffect } from 'react';

export const TournamentRoute = () => {
    const { tournamentId, loadTournament, setTournamentInfo } = useTournament();
    const { tournamentId: paramId } = useParams();

    useEffect(() => {
        // Deep linking logic: if URL has an ID but context doesn't (or differs), load it.
        // Note: Ideally we would fetch the name too, but for legacy compatibility we might default.
        if (paramId && paramId !== tournamentId) {
            // We set the info to ensure context is aware
            // If we don't know the name, we use a placeholder or handle it.
            // For now, let's assume we proceed. The Context's loadTournament will fetch data.
            // We should ideally fetch the name from Supabase here or inside context.
            // But preserving existing contract: setTournamentInfo updates state and localStorage.

            // NOTE: Changing context to load if needed.
            // In a real scenario we'd fetch the tournament details. 
            // For now we assume the user might have clicked a link.

            // To properly fix "Name Missing" on deep link, we might need to modify TournamentContext
            // to fetch the name if it's missing.

            setTournamentInfo(paramId, localStorage.getItem('mtkd_tournament_name') || 'Tournament');
            loadTournament(paramId);
        }
    }, [paramId, tournamentId, loadTournament, setTournamentInfo]);

    if (!paramId) {
        return <Navigate to="/lobby" replace />;
    }

    return <Outlet />;
};
