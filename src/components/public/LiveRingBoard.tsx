import React, { useMemo } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { Clock, User, Trophy, Users } from 'lucide-react';
import type { Participant, Match } from '../../types';
import { getRingQueue } from '../../utils/tournamentLogic';

// Extended match type with category info
interface ExtendedMatch extends Match {
    category?: string;
}

export const LiveRingBoard: React.FC = () => {
    const { rings, matches } = useTournament();

    const ringStatus = useMemo(() => {
        // Sort rings A-Z by name first
        const sortedRings = [...rings].sort((a, b) => a.name.localeCompare(b.name));

        return sortedRings.map(ring => {
            // Use Shared Logic
            const queueResult = getRingQueue(matches, ring.id, rings);

            // Check if this ring is in Table Mode
            const isTableMode = ring.bout_mode?.includes('table');

            // For Table Mode: Prepare table data
            let tableData: any[] = [];
            if (isTableMode) {
                // Group by category for table mode
                const categoryMap = new Map<string, ExtendedMatch[]>();
                // We need to re-find category names because queueResult.allMatches doesn't have categoryKey easily separate
                // Actually matches map has keys.
                // iterate matches map to find categories belonging to this ring again?
                // Or since queueResult.allMatches has everything, we can try to find category?
                // Match object doesn't store category Name directly usually? 
                // Ah, Match object might not have category Key. 
                // In JudgeInterface, we constructed queues manually. 
                // getRingQueue returns plain matches. 
                // We need to map back to categories.
                // Let's iterate matches map again to build category info?

                // Optimized approach: 
                // We track matches and their categories.

                // Let's map queueResult.allMatches back to categories?
                // Actually, efficient way:
                matches.forEach((catMatches, catKey) => {
                    catMatches.forEach(m => {
                        if (m.ring === ring.id) {
                            if (!categoryMap.has(catKey)) categoryMap.set(catKey, []);
                            categoryMap.get(catKey)!.push({ ...m, category: catKey });
                        }
                    });
                });

                categoryMap.forEach((catMatches, cat) => {
                    const participants: Array<{ name: string; club: string; score: number; rank?: number }> = [];
                    catMatches.forEach(m => {
                        // Logic to extract participants from match
                        const addParticipant = (p: Participant | string | null, score: number, rank?: number) => {
                            if (p && typeof p !== 'string' && p.name) {
                                participants.push({
                                    name: p.name,
                                    club: p.club,
                                    score: score || 0,
                                    rank
                                });
                            }
                        };
                        addParticipant(m.red, m.score || 0, m.rank);
                    });
                    if (participants.length > 0) {
                        // Sort by rank or score
                        participants.sort((a, b) => (a.rank || 999) - (b.rank || 999) || b.score - a.score);
                        tableData.push({ category: cat, participants });
                    }
                });
            }

            // Current and Next Logic (Synced with Judge)
            const currentMatch = queueResult.activeMatch;
            const nextMatch = queueResult.pendingMatches && queueResult.pendingMatches.length > 1 ? queueResult.pendingMatches[1] : null;

            // Enrich current/next with category name if possible
            // Iterate all matches to find category for current/next match ID
            const enrichMatch = (m: Match | null) => {
                if (!m) return null;
                let catName = '';
                for (const [key, list] of matches.entries()) {
                    if (list.some(x => x.id === m.id)) {
                        catName = key;
                        break;
                    }
                }
                return { ...m, category: catName };
            };

            return {
                ring,
                isTableMode,
                tableData,
                current: enrichMatch(currentMatch),
                next: enrichMatch(nextMatch)
            };
        });
    }, [rings, matches]);


    const getParticipantName = (p: Participant | string | undefined | null): string => {
        if (!p) return 'TBD';
        if (typeof p === 'string') return p === 'BYE' ? 'BYE' : p || 'TBD';
        return p.name;
    };

    const getClubName = (p: Participant | string | undefined | null): string => {
        if (!p || typeof p === 'string') return '';
        return p.club;
    };

    return (
        <div className="space-y-6 animate-fadeIn pb-10">
            <div className="flex items-center gap-3 mb-4">
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                </span>
                <h1 className="text-2xl font-bold text-gray-800">Live Ring Status</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {ringStatus.map(({ ring, isTableMode, tableData, current, next }) => (
                    <div key={ring.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center font-bold text-lg">
                                    {ring.name.replace('Ring ', '').charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{ring.name}</h3>
                                    <span className="text-xs text-slate-400">
                                        {isTableMode ? '📊 Score Table Mode' : '🏆 Elimination Bracket'}
                                    </span>
                                </div>
                            </div>
                            {!isTableMode && current && (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-red-600 rounded-full text-xs font-bold animate-pulse">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full" />
                                    LIVE
                                </span>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                            {isTableMode ? (
                                // TABLE MODE: Show participants with scores
                                <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                                    {tableData.length > 0 ? (
                                        tableData.map(({ category, participants }: any) => (
                                            <div key={category}>
                                                <div className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
                                                    <Users size={12} />
                                                    {category.length > 40 ? category.slice(0, 40) + '...' : category}
                                                </div>
                                                <div className="space-y-1">
                                                    {participants.slice(0, 8).map((p: any, i: number) => (
                                                        <div
                                                            key={i}
                                                            className={`flex items-center justify-between p-3 rounded-lg transition-all ${p.rank === 1 ? 'bg-amber-50 border border-amber-200' :
                                                                p.rank === 2 ? 'bg-gray-100 border border-gray-200' :
                                                                    p.rank === 3 ? 'bg-orange-50 border border-orange-200' :
                                                                        'bg-gray-50'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${p.rank === 1 ? 'bg-amber-400 text-white' :
                                                                    p.rank === 2 ? 'bg-gray-400 text-white' :
                                                                        p.rank === 3 ? 'bg-orange-400 text-white' :
                                                                            'bg-gray-200 text-gray-600'
                                                                    }`}>
                                                                    {p.rank || i + 1}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-gray-800 text-sm">{p.name}</div>
                                                                    <div className="text-xs text-gray-500">{p.club}</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-lg font-mono font-bold text-blue-600">{p.score}</div>
                                                                <div className="text-xs text-gray-400">pts</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12 text-gray-400">
                                            <Trophy className="mx-auto mb-2 opacity-30" size={40} />
                                            <p className="font-medium">No scores yet</p>
                                            <p className="text-xs">Waiting for judge input</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // TREE MODE: Show current & next match
                                <div className="p-6 flex flex-col justify-center min-h-[220px]">
                                    {current ? (
                                        <div className="space-y-6">
                                            <div className="text-center relative">
                                                <div className="absolute top-0 right-0">
                                                    <div className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">
                                                        Bout {current.bout_number?.replace(/\D/g, '') || '#'}
                                                    </div>
                                                </div>

                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Now Playing</span>
                                                {current.category && (
                                                    <div className="text-sm font-bold text-blue-700 mt-1 truncate max-w-[280px] mx-auto px-2" title={current.category}>
                                                        {current.category}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex justify-between items-center gap-4">
                                                {/* Red Corner */}
                                                <div className="flex-1 text-center">
                                                    <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg ring-4 ring-red-50">
                                                        <User size={28} />
                                                    </div>
                                                    <div className="font-bold text-gray-900 leading-tight text-lg mb-1">{getParticipantName(current.red)}</div>
                                                    <div className="text-sm text-gray-500 font-medium">{getClubName(current.red)}</div>
                                                </div>

                                                <div className="text-4xl font-black text-slate-200 italic">VS</div>

                                                {/* Blue Corner */}
                                                <div className="flex-1 text-center">
                                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg ring-4 ring-blue-50">
                                                        <User size={28} />
                                                    </div>
                                                    <div className="font-bold text-gray-900 leading-tight text-lg mb-1">{getParticipantName(current.blue)}</div>
                                                    <div className="text-sm text-gray-500 font-medium">{getClubName(current.blue)}</div>
                                                </div>
                                            </div>

                                            {current.round && (
                                                <div className="text-center pt-2">
                                                    <span className="inline-block px-4 py-1.5 bg-gray-100 rounded-full text-xs font-bold text-gray-600 uppercase tracking-wide">
                                                        {current.round}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center text-gray-400 py-8">
                                            <Clock className="mx-auto mb-2 opacity-50" size={40} />
                                            <p className="font-medium">No Active Match</p>
                                            <p className="text-xs mt-1">Waiting for next bout</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Up Next (Tree Mode Only) */}
                        {!isTableMode && (
                            <div className="bg-gray-50 p-4 border-t border-gray-100">
                                <div className="text-xs font-bold uppercase text-gray-400 mb-2 flex items-center gap-2">
                                    <Clock size={12} />
                                    Up Next
                                </div>
                                {next ? (
                                    <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                        <div className="flex flex-col items-start min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1 w-full">
                                                <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-gray-200">
                                                    #{next.bout_number?.replace(/\D/g, '')}
                                                </span>
                                                <span className="text-[10px] text-gray-400 truncate flex-1 block">
                                                    {next.category}
                                                </span>
                                            </div>

                                            <div className="flex justify-between w-full items-center">
                                                <span className="font-bold text-gray-700 truncate max-w-[40%] text-sm">
                                                    {getParticipantName(next.red)}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-bold px-2">VS</span>
                                                <span className="font-bold text-gray-700 truncate max-w-[40%] text-right text-sm">
                                                    {getParticipantName(next.blue)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-gray-400 text-sm italic">No upcoming matches</span>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {ringStatus.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                    <Trophy className="mx-auto mb-4 text-gray-300" size={48} />
                    <p className="text-gray-500 font-medium">No rings configured</p>
                    <p className="text-gray-400 text-sm">Set up rings in the admin panel</p>
                </div>
            )}
        </div>
    );
};
