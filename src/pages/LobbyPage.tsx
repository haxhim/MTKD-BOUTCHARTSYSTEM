import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lobby } from '../components/Lobby';
import { useTournament } from '../context/TournamentContext';

export const LobbyPage: React.FC = () => {
    const { tournamentId } = useTournament();
    const navigate = useNavigate();

    useEffect(() => {
        if (tournamentId) {
            navigate(`/tournament/${tournamentId}/overview`);
        }
    }, [tournamentId, navigate]);

    return <Lobby onJoin={() => { /* Handled by effect */ }} />;
};
