import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RingAssignment } from '../components/RingAssignment';
import { useTournament } from '../context/TournamentContext';

export const RingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { tournamentId } = useTournament();

    return <RingAssignment onBack={() => navigate(`/tournament/${tournamentId}/overview`)} />;
};
