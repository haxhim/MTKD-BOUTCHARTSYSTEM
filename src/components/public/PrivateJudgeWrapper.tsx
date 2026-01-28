import React, { useState } from 'react';
import { JudgeInterface } from '../JudgeInterface';
import { useTournament } from '../../context/TournamentContext';
import { ChevronRight } from 'lucide-react';

export const PrivateJudgeWrapper: React.FC = () => {
    const { rings } = useTournament();
    const [selectedRingId, setSelectedRingId] = useState<string | null>(null);

    if (selectedRingId) {
        return (
            <div>
                <button
                    onClick={() => setSelectedRingId(null)}
                    className="mb-4 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                    ← Change Ring
                </button>
                <JudgeInterface
                    ringId={selectedRingId}
                    onBack={() => setSelectedRingId(null)}
                />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-10 animate-fadeIn">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Select Your Ring</h2>
            {rings.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    No rings configured for this tournament.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rings.map(ring => (
                        <button
                            key={ring.id}
                            onClick={() => setSelectedRingId(ring.id)}
                            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group text-left flex justify-between items-center"
                        >
                            <div>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ring</span>
                                <div className="text-xl font-bold text-gray-800">{ring.name}</div>
                                <div className="text-sm text-gray-500 mt-1">
                                    Mode: {ring.bout_mode?.includes('table') ? 'Score Table' : 'Elimination Tree'}
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <ChevronRight />
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
