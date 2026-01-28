import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MatchControl } from '../components/MatchControl';
import { useTournament } from '../context/TournamentContext';

export const RingMatchPage: React.FC = () => {
    const navigate = useNavigate();
    const { tournamentId } = useTournament();

    return <MatchControl onBack={() => navigate(`/tournament/${tournamentId}/overview`)} />;
};
