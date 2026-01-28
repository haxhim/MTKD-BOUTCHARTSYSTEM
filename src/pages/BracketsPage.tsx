import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BracketView } from '../components/BracketView';
import { useTournament } from '../context/TournamentContext';

export const BracketsPage: React.FC = () => {
    const navigate = useNavigate();
    const { tournamentId } = useTournament();

    return <BracketView onBack={() => navigate(`/tournament/${tournamentId}/overview`)} />;
};
