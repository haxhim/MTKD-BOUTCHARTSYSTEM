import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { JudgeInterface } from '../components/JudgeInterface';
import { useTournament } from '../context/TournamentContext';

export const JudgePage: React.FC = () => {
    const navigate = useNavigate();
    const { tournamentId } = useTournament();
    const { ringId } = useParams<{ ringId: string }>();

    const handleRingSelect = (id: string | null) => {
        if (id) {
            navigate(`/tournament/${tournamentId}/judge/${id}`);
        } else {
            navigate(`/tournament/${tournamentId}/judge`);
        }
    };

    return (
        <JudgeInterface
            onBack={() => navigate(`/tournament/${tournamentId}/overview`)}
            ringId={ringId}
            onRingSelect={handleRingSelect}
        />
    );
};
