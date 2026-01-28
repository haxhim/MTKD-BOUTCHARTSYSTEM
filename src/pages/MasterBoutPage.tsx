import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MasterBoutList } from '../components/MasterBoutList';
import { useTournament } from '../context/TournamentContext';

export const MasterBoutPage: React.FC = () => {
    const navigate = useNavigate();
    const { tournamentId } = useTournament();

    return <MasterBoutList onBack={() => navigate(`/tournament/${tournamentId}/overview`)} />;
};
