import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RingMatchView } from '../components/RingMatchView';
import { useTournament } from '../context/TournamentContext';

export const RingMatchPage: React.FC = () => {
    const navigate = useNavigate();
    const { tournamentId } = useTournament();

    return <RingMatchView onBack={() => navigate(`/tournament/${tournamentId}/overview`)} />;
};
