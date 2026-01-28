
import React, { useState, useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import type { Match, Participant } from '../types';
import { advanceWinner } from '../utils/tournamentLogic';
import { ChevronLeft, Check, Home, AlertTriangle } from 'lucide-react';


interface RingQueue {
    ringName: string;
    pendingCount: number;
    nextMatch: Match | null;
    allMatches: Match[];
}

interface JudgeInterfaceProps {
    onBack: () => void;
    ringId?: string;
    onRingSelect?: (ringId: string | null) => void;
}

export const JudgeInterface: React.FC<JudgeInterfaceProps> = ({ onBack, ringId: selectedRing, onRingSelect }) => {
    const { matches, setMatches, rings, updateMatches } = useTournament();
    const [feedbackMsg, setFeedbackMsg] = useState('');
    const [scoreInput, setScoreInput] = useState<string>('');

    // Winner confirmation modal state
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        match: Match | null;
        winnerSide: 'Red' | 'Blue' | null;
        winnerName: string;
    }>({ isOpen: false, match: null, winnerSide: null, winnerName: '' });

    // Pre-process matches into Rings
    const ringQueues = useMemo(() => {
        const queues = new Map<string, Match[]>();
        const ringIdToName = new Map<string, string>();

        rings.forEach(r => {
            queues.set(r.name, []);
            ringIdToName.set(r.id, r.name);
            ringIdToName.set(r.name, r.name);
        });

        matches.forEach((catMatches) => {
            catMatches.forEach(match => {
                if (!match.ring) return;
                const resolvedRingName = ringIdToName.get(match.ring) || match.ring;
                if (!queues.has(resolvedRingName)) queues.set(resolvedRingName, []);
                queues.get(resolvedRingName)?.push(match);
            });
        });

        const result: RingQueue[] = [];
        queues.forEach((ringMatches, ringName) => {
            const sorted = [...ringMatches].sort((a, b) => {
                // Determine Bout Number Numeric Value for Sorting
                const valA = a.bout_number ? parseInt(a.bout_number.replace(/\D/g, '')) || 9999 : 9999;
                const valB = b.bout_number ? parseInt(b.bout_number.replace(/\D/g, '')) || 9999 : 9999;
                // If Equal (e.g. 9999), sort by ID or Round?
                if (valA !== valB) return valA - valB;
                // Secondary sort for Table Mode (Round 1 order) if no bout number
                if (a.is_table_mode && b.is_table_mode) return 0; // Already sorted by array order?
                return 0;
            });

            // Pending Filter
            const pending = sorted.filter(m => {
                // Table Mode: Pending if Score is missing
                if (m.is_table_mode) return m.score === undefined;
                // Tree Mode: Pending if Winner missing AND players are ready
                return m.red && m.blue && m.red !== 'BYE' && m.blue !== 'BYE' && !m.winner;
            });

            result.push({
                ringName: ringName,
                pendingCount: pending.length,
                nextMatch: pending.length > 0 ? pending[0] : null,
                allMatches: sorted
            });
        });

        return result.sort((a, b) => a.ringName.localeCompare(b.ringName));
    }, [matches, rings]);


    const handleWinner = async (match: Match, winnerSide: 'Red' | 'Blue') => {
        const winner = winnerSide === 'Red' ? match.red : match.blue;
        if (!winner || winner === 'BYE') {
            setFeedbackMsg('Error: Invalid winner (Player is TBD or BYE).');
            return;
        }
        setConfirmModal({
            isOpen: true,
            match,
            winnerSide,
            winnerName: (winner as Participant).name
        });
    };

    const confirmWinner = async () => {
        const { match, winnerSide } = confirmModal;
        if (!match || !winnerSide) return;
        const winner = winnerSide === 'Red' ? match.red : match.blue;
        if (!winner || winner === 'BYE') return;

        const updatedMatchesMap = advanceWinner(matches, match.id, winner);
        setMatches(updatedMatchesMap);
        setFeedbackMsg(`Scored Bout ${match.bout_number}. Saved.`);
        setConfirmModal({ isOpen: false, match: null, winnerSide: null, winnerName: '' });

        // Granular Save
        // We find the updated match and its next match in the new map
        for (const list of updatedMatchesMap.values()) {
            const m = list.find(x => x.id === match.id);
            if (m) {
                const toUpdate = [m];
                if (m.nextMatchId) {
                    const nextM = list.find(x => x.id === m.nextMatchId);
                    if (nextM) toUpdate.push(nextM);
                }
                await updateMatches(toUpdate);
                break;
            }
        }
    };

    const handleTableScore = async (match: Match) => {
        const scoreVal = parseFloat(scoreInput);
        if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > 10) {
            setFeedbackMsg('Invalid Score (0.00 - 10.00)');
            return;
        }

        // 1. Update Match with Score
        const matchWithScore = { ...match, score: scoreVal };

        // 2. Identify all siblings (Category + Round)
        // We need to look up the list for this category
        let categoryKey = '';
        // Find key by scanning matches map (inefficient but safe)
        for (const [key, list] of matches.entries()) {
            if (list.some(m => m.id === match.id)) {
                categoryKey = key;
                break;
            }
        }

        if (!categoryKey) return;

        // Update local state map
        const catMatches = matches.get(categoryKey) || [];
        const updatedCatMatches = catMatches.map(m => m.id === match.id ? matchWithScore : m);

        const newMatchesMap = new Map(matches);
        newMatchesMap.set(categoryKey, updatedCatMatches);
        setMatches(newMatchesMap);
        setScoreInput('');
        setFeedbackMsg(`Score ${scoreVal.toFixed(2)} Saved.`);

        // 3. Check for Round Completion & Rank
        const matchesInRound = updatedCatMatches.filter(m => m.round === match.round);
        const allScored = matchesInRound.every(m => m.score !== undefined);

        if (allScored) {
            // Calculate Ranks
            const ranked = [...matchesInRound].sort((a, b) => (b.score || 0) - (a.score || 0));
            // Apply ranks
            ranked.forEach((m, idx) => {
                m.rank = idx + 1;
            });
            // Update map again with ranks
            // Merge ranked back into updatedCatMatches
            // Since objects in ranked are references to objects in updatedCatMatches? 
            // NOTE: map() created new objects? No, distinct objects?
            // "updatedCatMatches.map(m => m.id === match.id ? matchWithScore : m)"
            // The matchWithScore is new. Others are old refs.
            // So iterating `ranked` (which is shallow copy of array) modifies the objects?
            // Yes, if I modify properties of `m` in `ranked`.
            // But `matchWithScore` is a new object.
            // Let's explicitly splice.

            const finalCatMatches = updatedCatMatches.map(m => {
                const r = ranked.find(rm => rm.id === m.id);
                return r ? { ...m, rank: r.rank } : m;
            });

            newMatchesMap.set(categoryKey, finalCatMatches);
            setMatches(new Map(newMatchesMap)); // Force refresh

            // Persist all in round
            await updateMatches(finalCatMatches);
            setFeedbackMsg(`Round Completed! Ranks Calculated.`);
        } else {
            // Just persist the single score
            await updateMatches([matchWithScore]);
        }
    };

    const cancelWinner = () => {
        setConfirmModal({ isOpen: false, match: null, winnerSide: null, winnerName: '' });
    };

    // If no ring selected, show list
    if (!selectedRing) {
        return (
            <div className="max-w-4xl mx-auto p-4 sm:p-6 animate-fadeIn">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 font-medium transition-colors">
                    <ChevronLeft size={20} /> Back to Dashboard
                </button>
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Select Ring to Judge</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {ringQueues.map(rq => (
                        <div key={rq.ringName}
                            onClick={() => onRingSelect && onRingSelect(rings.find(r => r.name === rq.ringName)?.id || null)}
                            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{rq.ringName}</span>
                                <span className={`px-3 py-1 bg-gray-100 rounded-full text-xs font-semibold ${rq.pendingCount > 0 ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}>
                                    {rq.pendingCount} Pending
                                </span>
                            </div>
                            <div className="text-sm text-gray-500">
                                {rq.nextMatch ? (
                                    <>
                                        <p className="font-medium text-gray-700 mb-1">Next: {rq.nextMatch.bout_number || 'Next Table Bout'}</p>
                                        <p>{typeof rq.nextMatch.red !== 'string' ? rq.nextMatch.red?.category : 'Unknown Category'}</p>
                                    </>
                                ) : (
                                    <p className="italic">No bouts ready.</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const currentQueue = ringQueues.find(rq => rings.find(r => r.id === selectedRing)?.name === rq.ringName);
    const activeMatch = currentQueue?.nextMatch;

    return (
        <div className="max-w-4xl mx-auto p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-gray-50 to-slate-50 min-h-screen animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <button onClick={() => onRingSelect && onRingSelect(null)} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors">
                    <Home size={18} />
                    <span className="hidden sm:inline font-medium">Rings</span>
                </button>
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                    {currentQueue?.ringName || 'Judge Interface'}
                </h2>
                <div className={`text-xs sm:text-sm font-medium px-3 py-1 rounded-full ${feedbackMsg ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-transparent'}`}>
                    {feedbackMsg || 'Saved'}
                </div>
            </div>

            {/* Active Bout Main Card */}
            {activeMatch ? (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-6 relative">
                    <div className="bg-gray-800 text-white p-3 text-center flex justify-between items-center px-4 sm:px-6">
                        <span className="font-mono text-sm opacity-70">
                            {activeMatch.is_table_mode ? 'Table Mode' : `Bout ${activeMatch.bout_number}`}
                        </span>
                        <span className="font-bold text-sm sm:text-base truncate max-w-[200px]">
                            {typeof activeMatch.red !== 'string' ? activeMatch.red?.category : ''}
                        </span>
                        <span className="text-xs bg-gray-700 px-2 py-0.5 rounded">{activeMatch.round}</span>
                    </div>

                    {!activeMatch.is_table_mode ? (
                        /* Tree Mode UI */
                        <div className="flex flex-col sm:flex-row h-[400px] sm:h-[500px]">
                            {/* RED SIDE */}
                            <div
                                onClick={() => handleWinner(activeMatch, 'Red')}
                                className="flex-1 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer flex flex-col items-center justify-center p-6 border-b sm:border-b-0 sm:border-r border-gray-200 active:bg-red-200 touch-manipulation group select-none"
                            >
                                <div className="text-red-600 font-bold text-lg mb-2 uppercase tracking-wider group-hover:scale-110 transition-transform">Red Corner</div>
                                <div className="text-2xl sm:text-4xl font-black text-gray-900 text-center leading-tight mb-2">
                                    {typeof activeMatch.red === 'string' ? activeMatch.red : activeMatch.red?.name}
                                </div>
                                <div className="text-gray-500 font-medium text-lg text-center">
                                    {typeof activeMatch.red !== 'string' ? activeMatch.red?.club : ''}
                                </div>
                            </div>

                            {/* VS Badge */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full shadow-xl border-4 border-gray-100 z-10 pointer-events-none">
                                <span className="font-black text-gray-300 text-lg sm:text-xl italic">VS</span>
                            </div>

                            {/* BLUE SIDE */}
                            <div
                                onClick={() => handleWinner(activeMatch, 'Blue')}
                                className="flex-1 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer flex flex-col items-center justify-center p-6 active:bg-blue-200 touch-manipulation group select-none"
                            >
                                <div className="text-blue-600 font-bold text-lg mb-2 uppercase tracking-wider group-hover:scale-110 transition-transform">Blue Corner</div>
                                <div className="text-2xl sm:text-4xl font-black text-gray-900 text-center leading-tight mb-2">
                                    {typeof activeMatch.blue === 'string' ? activeMatch.blue : activeMatch.blue?.name}
                                </div>
                                <div className="text-gray-500 font-medium text-lg text-center">
                                    {typeof activeMatch.blue !== 'string' ? activeMatch.blue?.club : ''}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Table Mode UI */
                        <div className="flex flex-col items-center justify-center p-8 sm:p-12 space-y-8">
                            <div className="text-center">
                                <h3 className="text-gray-500 font-bold uppercase tracking-widest text-sm mb-2">Current Performer</h3>
                                <p className="text-3xl sm:text-5xl font-black text-gray-900 mb-2">
                                    {typeof activeMatch.red !== 'string' ? activeMatch.red?.name : 'Bye'}
                                </p>
                                <p className="text-xl text-gray-600 font-medium">
                                    {typeof activeMatch.red !== 'string' ? activeMatch.red?.club : ''}
                                </p>
                            </div>

                            <div className="w-full max-w-sm">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Enter Score (0.00 - 10.00)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="10"
                                    value={scoreInput}
                                    onChange={(e) => setScoreInput(e.target.value)}
                                    className="w-full px-4 py-4 text-center text-3xl font-mono font-bold border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm"
                                    placeholder="0.00"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleTableScore(activeMatch);
                                    }}
                                />
                            </div>

                            <button
                                onClick={() => handleTableScore(activeMatch)}
                                disabled={!scoreInput}
                                className="w-full max-w-sm py-4 bg-gray-900 text-white rounded-xl font-bold text-lg hover:bg-black transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Check size={24} /> Submit Score
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check size={40} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">All Caught Up!</h3>
                    <p className="text-gray-500">No pending bouts for this ring.</p>
                </div>
            )}

            {/* Confirm Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Winner</h3>
                            <p className="text-gray-600 mb-6">
                                Declare <span className="font-bold text-black text-lg">"{confirmModal.winnerName}"</span> as the winner?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={cancelWinner}
                                    className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmWinner}
                                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-colors"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
