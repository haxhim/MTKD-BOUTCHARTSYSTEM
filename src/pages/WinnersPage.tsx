import React from 'react';
import { useNavigate } from 'react-router-dom';
import { WinnersView } from '../components/WinnersView';
import { useTournament } from '../context/TournamentContext';

export const WinnersPage: React.FC = () => {
    const navigate = useNavigate();
    const { tournamentId } = useTournament();

    return <WinnersView onBack={() => navigate(`/tournament/${tournamentId}/overview`)} />;
};
