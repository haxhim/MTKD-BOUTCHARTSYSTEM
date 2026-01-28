import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { Medal, CheckCircle, Circle } from 'lucide-react';

export const MedalManager: React.FC = () => {
    const { matches, tournamentId } = useTournament();
    const [statusMap, setStatusMap] = useState<Record<string, boolean>>(() => {
        if (!tournamentId) return {};
        const saved = localStorage.getItem(`mtkd_medal_status_${tournamentId}`);
        return saved ? JSON.parse(saved) : {};
    });

    // Compute completed categories (where Final has winner OR Table Mode has Ranks)
    const completedCategories = Array.from(matches.entries()).filter(([_key, catMatches]) => {
        if (catMatches.length === 0) return false;
        const isTable = catMatches[0].is_table_mode;
        if (isTable) {
            return catMatches.some(m => m.rank === 1);
        } else {
            const final = catMatches.find(m => m.round === 'Final');
            return final && final.winner;
        }
    });

    const handleToggle = (key: string) => {
        const newStatus = { ...statusMap, [key]: !statusMap[key] };
        setStatusMap(newStatus);
        if (tournamentId) {
            localStorage.setItem(`mtkd_medal_status_${tournamentId}`, JSON.stringify(newStatus));
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-fadeIn">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Medal className="text-amber-500" />
                Medal Distribution Manager
            </h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4 border-b">Category</th>
                                <th className="px-6 py-4 border-b">Type</th>
                                <th className="px-6 py-4 border-b text-center">Medals Given?</th>
                                <th className="px-6 py-4 border-b text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {completedCategories.map(([key, catMatches]) => {
                                const isGiven = !!statusMap[key];
                                const isTable = catMatches[0].is_table_mode;

                                return (
                                    <tr key={key} className={isGiven ? 'bg-green-50/30' : ''}>
                                        <td className="px-6 py-4 font-medium text-gray-800">
                                            {key}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-xs">
                                            {isTable ? 'Table' : 'Tree'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {isGiven ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                                    <CheckCircle size={14} /> Given
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                                                    <Circle size={14} /> Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleToggle(key)}
                                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${isGiven
                                                        ? 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                                        : 'bg-green-600 border-green-600 text-white hover:bg-green-700 shadow-sm'
                                                    }`}
                                            >
                                                {isGiven ? 'Revoke' : 'Mark as Given'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {completedCategories.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                                        No categories have finished yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
