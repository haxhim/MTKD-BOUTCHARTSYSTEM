import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CategoryWinnersView } from '../components/CategoryWinnersView';
import { useTournament } from '../context/TournamentContext';

export const CategoryWinnersPage: React.FC = () => {
    const navigate = useNavigate();
    const { tournamentId } = useTournament();

    return <CategoryWinnersView onBack={() => navigate(`/tournament/${tournamentId}/overview`)} />;
};
