import React, { useState, useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import type { Match, Participant } from '../types';
import { advanceWinner } from '../utils/tournamentLogic';
import { ChevronLeft, ChevronRight, X, Check, Home, AlertTriangle } from 'lucide-react';

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

        // Initialize with known rings and build lookup map
        rings.forEach(r => {
            queues.set(r.name, []);
            ringIdToName.set(r.id, r.name);
            ringIdToName.set(r.name, r.name);
        });

        // Group all matches by Ring
        matches.forEach((catMatches) => {
            catMatches.forEach(match => {
                if (!match.ring) return;

                // Resolve Ring Name
                const resolvedRingName = ringIdToName.get(match.ring) || match.ring;

                if (!queues.has(resolvedRingName)) {
                    queues.set(resolvedRingName, []);
                }
                queues.get(resolvedRingName)?.push(match);
            });
        });

        // Convert to array and sort matches within each ring
        const result: RingQueue[] = [];
        queues.forEach((ringMatches, ringName) => {
            // Sort: Bouts with numbers first, then others.
            // Text sort "A01", "A02" works well.
            const sorted = [...ringMatches].sort((a, b) => {
                if (!a.bout_number && !b.bout_number) return 0;
                if (!a.bout_number) return 1;
                if (!b.bout_number) return -1;
                return a.bout_number.localeCompare(b.bout_number, undefined, { numeric: true });
            });

            // "Pending" means: Red & Blue are present (not null, not BYE - wait, BYEs are auto-advanced, but we might check non-BYE)
            // AND Winner is NOT set.
            const pending = sorted.filter(m =>
                m.red && m.blue &&
                m.red !== 'BYE' && m.blue !== 'BYE' &&
                !m.winner
            );

            result.push({
                ringName: ringName,
                pendingCount: pending.length,
                nextMatch: pending.length > 0 ? pending[0] : null,
                allMatches: sorted
            });
        });

        // Sort rings by name
        return result.sort((a, b) => a.ringName.localeCompare(b.ringName));
    }, [matches, rings]);


    const handleWinner = async (match: Match, winnerSide: 'Red' | 'Blue') => {
        const winner = winnerSide === 'Red' ? match.red : match.blue;

        if (!winner || winner === 'BYE') {
            setFeedbackMsg('Error: Invalid winner (Player is TBD or BYE).');
            return;
        }

        // Show confirmation modal instead of window.confirm
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

        // Close the modal
        setConfirmModal({ isOpen: false, match: null, winnerSide: null, winnerName: '' });

        // Granular Save Logic
        const matchesToSave: Match[] = [];

        // 1. Find the updated current match
        // We need to find the category of the match.
        // Since we have the fresh map, lets find the match by ID.
        for (const list of updatedMatchesMap.values()) {
            const updatedCurrent = list.find(m => m.id === match.id);
            if (updatedCurrent) {
                matchesToSave.push(updatedCurrent);

                // 2. Find the next match if checking propagation
                if (updatedCurrent.nextMatchId) {
                    const updatedNext = list.find(m => m.id === updatedCurrent.nextMatchId);
                    if (updatedNext) {
                        matchesToSave.push(updatedNext);
                    }
                }
                break;
            }
        }

        if (matchesToSave.length > 0) {
            await updateMatches(matchesToSave);
        }
    };

    const cancelWinner = () => {
        setConfirmModal({ isOpen: false, match: null, winnerSide: null, winnerName: '' });
    };

    // Derived state for the active view
    const activeQueue = selectedRing ? ringQueues.find(q => q.ringName === selectedRing) : null;
    const activeMatch = activeQueue?.nextMatch;

    return (
        <div className="max-w-6xl mx-auto p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-gray-50 to-slate-50 min-h-screen animate-fadeIn">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center justify-between mb-4 sm:mb-8">
                <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                    <button onClick={onBack} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 font-medium transition-colors touch-target">
                        <Home size={14} className="sm:hidden" />
                        <span className="hidden sm:inline">Dashboard</span>
                    </button>
                    <ChevronRight size={12} className="text-gray-400" />
                    <button
                        onClick={() => onRingSelect?.(null)}
                        className={`font-medium transition-colors touch-target ${selectedRing ? 'text-blue-600 hover:text-blue-700' : 'text-gray-800'}`}
                    >
                        <span className="hidden sm:inline">Judge Interface</span>
                        <span className="sm:hidden">Rings</span>
                    </button>
                    {selectedRing && (
                        <>
                            <ChevronRight size={12} className="text-gray-400" />
                            <span className="font-semibold text-gray-800">Ring {selectedRing}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Feedback Message */}
            {feedbackMsg && (
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg sm:rounded-xl flex justify-between items-center animate-fadeIn shadow-sm">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-6 sm:w-8 h-6 sm:h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <Check size={14} className="text-emerald-600 sm:w-[18px] sm:h-[18px]" />
                        </div>
                        <span className="font-medium text-sm sm:text-base">{feedbackMsg}</span>
                    </div>
                    <button onClick={() => setFeedbackMsg('')} className="text-emerald-500 hover:text-emerald-700 transition-colors touch-target p-1">
                        <X size={18} />
                    </button>
                </div>
            )}

            {!selectedRing ? (
                // RING DASHBOARD VIEW
                <div>
                    <div className="text-center mb-6 sm:mb-10">
                        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs sm:text-sm font-medium mb-2 sm:mb-3">
                            <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-blue-500 rounded-full animate-pulse"></span>
                            Live Scoring Mode
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">Select a Ring</h1>
                        <p className="text-gray-500 text-sm sm:text-base">Choose a ring to begin scoring matches</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {ringQueues.map(queue => (
                            <div
                                key={queue.ringName}
                                onClick={() => queue.nextMatch && onRingSelect?.(queue.ringName)}
                                className={`
                                    relative p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all duration-200 cursor-pointer group touch-target
                                    ${queue.nextMatch
                                        ? 'bg-white border-gray-100 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-100 active:scale-[0.98] sm:hover:-translate-y-1'
                                        : 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-4 sm:mb-5">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className={`w-10 sm:w-12 h-10 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-base sm:text-lg shadow-lg
                                            ${queue.nextMatch
                                                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-200'
                                                : 'bg-gray-200 text-gray-500'}`}
                                        >
                                            {queue.ringName.charAt(queue.ringName.length - 1)}
                                        </div>
                                        <div>
                                            <h2 className="text-base sm:text-lg font-bold text-gray-800">Ring {queue.ringName}</h2>
                                        </div>
                                    </div>
                                    {queue.pendingCount > 0 ? (
                                        <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-50 text-blue-600 rounded-full font-bold text-[10px] sm:text-xs border border-blue-100">
                                            {queue.pendingCount} pending
                                        </span>
                                    ) : (
                                        <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] sm:text-xs font-medium border border-emerald-100">
                                            Complete
                                        </span>
                                    )}
                                </div>

                                {queue.nextMatch ? (
                                    <div className="bg-gradient-to-r from-gray-50 to-transparent rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-100">
                                        <div className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 sm:mb-2">Up Next</div>
                                        <div className="text-base sm:text-lg font-bold text-gray-800 mb-1">
                                            Bout {queue.nextMatch.bout_number}
                                        </div>
                                        <div className="text-xs sm:text-sm text-gray-600">
                                            <span className="text-red-600 font-medium">{(queue.nextMatch.red as Participant).name}</span>
                                            <span className="text-gray-400 mx-1 sm:mx-2">vs</span>
                                            <span className="text-blue-600 font-medium">{(queue.nextMatch.blue as Participant).name}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 sm:py-6">
                                        <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gray-100 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2">
                                            <Check className="w-5 sm:w-6 h-5 sm:h-6 text-gray-400" />
                                        </div>
                                        <p className="text-gray-400 text-xs sm:text-sm">All matches complete</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                // JUDGING VIEW
                <div>
                    {activeMatch ? (
                        <div className="max-w-4xl mx-auto animate-fadeIn">
                            {/* Match Header */}
                            <div className="text-center mb-6 sm:mb-10">
                                <span className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-xs sm:text-sm font-semibold mb-3 sm:mb-4 shadow-lg shadow-blue-200">
                                    <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white rounded-full animate-pulse"></span>
                                    RING {selectedRing} • {activeQueue?.pendingCount} remaining
                                </span>
                                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-800 mb-1 sm:mb-2">
                                    Bout {activeMatch.bout_number}
                                </h2>
                                <p className="text-gray-500 text-base sm:text-lg">{activeMatch.round}</p>
                            </div>

                            {/* Fighter Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-10 items-stretch">
                                {/* RED Corner */}
                                <div
                                    className="relative group cursor-pointer touch-target"
                                    onClick={() => handleWinner(activeMatch, 'Red')}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl sm:rounded-3xl transform translate-y-2 sm:translate-y-3 group-hover:translate-y-3 sm:group-hover:translate-y-4 transition-transform shadow-xl sm:shadow-2xl shadow-red-200"></div>
                                    <div className="relative bg-white border-3 sm:border-4 border-red-400 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-center h-full active:scale-[0.98] sm:hover:-translate-y-1 transition-transform flex flex-col justify-between group-hover:border-red-500">
                                        <div>
                                            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 bg-red-50 text-red-600 rounded-full text-xs sm:text-sm font-bold mb-4 sm:mb-6 border border-red-100">
                                                <div className="w-2 sm:w-3 h-2 sm:h-3 bg-red-500 rounded-full"></div>
                                                RED CORNER
                                            </div>
                                            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 mb-1 sm:mb-2 break-words">
                                                {(activeMatch.red as Participant).name}
                                            </div>
                                            <div className="text-gray-500 font-medium text-sm sm:text-base lg:text-lg">
                                                {(activeMatch.red as Participant).club}
                                            </div>
                                        </div>
                                        <div className="mt-5 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100">
                                            <span className="inline-block w-full py-3 sm:py-4 bg-red-50 text-red-600 font-bold rounded-xl sm:rounded-2xl group-hover:bg-red-500 group-hover:text-white transition-all text-sm sm:text-base lg:text-lg shadow-sm group-hover:shadow-lg group-hover:shadow-red-200">
                                                Tap to Select Winner
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* BLUE Corner */}
                                <div
                                    className="relative group cursor-pointer touch-target"
                                    onClick={() => handleWinner(activeMatch, 'Blue')}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl sm:rounded-3xl transform translate-y-2 sm:translate-y-3 group-hover:translate-y-3 sm:group-hover:translate-y-4 transition-transform shadow-xl sm:shadow-2xl shadow-blue-200"></div>
                                    <div className="relative bg-white border-3 sm:border-4 border-blue-400 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-center h-full active:scale-[0.98] sm:hover:-translate-y-1 transition-transform flex flex-col justify-between group-hover:border-blue-500">
                                        <div>
                                            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs sm:text-sm font-bold mb-4 sm:mb-6 border border-blue-100">
                                                <div className="w-2 sm:w-3 h-2 sm:h-3 bg-blue-500 rounded-full"></div>
                                                BLUE CORNER
                                            </div>
                                            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 mb-1 sm:mb-2 break-words">
                                                {(activeMatch.blue as Participant).name}
                                            </div>
                                            <div className="text-gray-500 font-medium text-sm sm:text-base lg:text-lg">
                                                {(activeMatch.blue as Participant).club}
                                            </div>
                                        </div>
                                        <div className="mt-5 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100">
                                            <span className="inline-block w-full py-3 sm:py-4 bg-blue-50 text-blue-600 font-bold rounded-xl sm:rounded-2xl group-hover:bg-blue-500 group-hover:text-white transition-all text-sm sm:text-base lg:text-lg shadow-sm group-hover:shadow-lg group-hover:shadow-blue-200">
                                                Tap to Select Winner
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Skip Link */}
                            <div className="mt-8 sm:mt-12 text-center">
                                <button
                                    onClick={() => onRingSelect?.(null)}
                                    className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors font-medium text-sm sm:text-base touch-target p-2"
                                >
                                    <ChevronLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
                                    Return to Ring List
                                </button>
                            </div>
                        </div>
                    ) : (
                        // All Caught Up State
                        <div className="text-center py-12 sm:py-20 max-w-2xl mx-auto animate-fadeIn">
                            <div className="w-16 sm:w-24 h-16 sm:h-24 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg shadow-emerald-100">
                                <span className="text-3xl sm:text-5xl">🎉</span>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 sm:mb-3">All Caught Up!</h2>
                            <p className="text-lg sm:text-xl text-gray-500 mb-6 sm:mb-8">
                                No more matches ready for Ring {selectedRing}
                            </p>
                            <button
                                onClick={() => onRingSelect?.(null)}
                                className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl sm:rounded-2xl hover:from-blue-700 hover:to-blue-800 shadow-xl shadow-blue-200 transition-all active:scale-[0.98] sm:hover:-translate-y-0.5 touch-target text-sm sm:text-base"
                            >
                                Check Other Rings
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Winner Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-scaleIn">
                        {/* Header */}
                        <div className="text-center mb-6">
                            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmModal.winnerSide === 'Red'
                                ? 'bg-gradient-to-br from-red-100 to-red-50'
                                : 'bg-gradient-to-br from-blue-100 to-blue-50'
                                }`}>
                                <AlertTriangle className={`w-8 h-8 sm:w-10 sm:h-10 ${confirmModal.winnerSide === 'Red' ? 'text-red-500' : 'text-blue-500'
                                    }`} />
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
                                Confirm Pick Winner
                            </h3>
                            <p className="text-gray-500 text-sm sm:text-base">
                                Are you sure you want to declare a winner?
                            </p>
                        </div>

                        {/* Winner Info */}
                        <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-5 mb-6 border-2 ${confirmModal.winnerSide === 'Red'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-blue-50 border-blue-200'
                            }`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center font-bold text-white text-lg sm:text-xl ${confirmModal.winnerSide === 'Red'
                                    ? 'bg-gradient-to-br from-red-500 to-red-600'
                                    : 'bg-gradient-to-br from-blue-500 to-blue-600'
                                    }`}>
                                    {confirmModal.winnerSide === 'Red' ? 'R' : 'B'}
                                </div>
                                <div>
                                    <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${confirmModal.winnerSide === 'Red' ? 'text-red-500' : 'text-blue-500'
                                        }`}>
                                        {confirmModal.winnerSide} Corner Winner
                                    </div>
                                    <div className="text-lg sm:text-xl font-bold text-gray-800">
                                        {confirmModal.winnerName}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Warning */}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 flex items-start gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-amber-700 text-sm">
                                This action cannot be easily undone. Please make sure the correct winner is selected.
                            </p>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={cancelWinner}
                                className="flex-1 px-4 py-3 sm:py-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors text-sm sm:text-base"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmWinner}
                                className={`flex-1 px-4 py-3 sm:py-4 text-white font-semibold rounded-xl transition-all shadow-lg text-sm sm:text-base ${confirmModal.winnerSide === 'Red'
                                    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-200'
                                    : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-200'
                                    }`}
                            >
                                Confirm Winner
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
