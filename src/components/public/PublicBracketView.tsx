import React, { useMemo, useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { Search, ChevronLeft, Trophy, Grid, Users } from 'lucide-react';
import { BracketNode } from '../BracketNode';
import type { Match, Ring } from '../../types';

// Responsive scale hook
const useResponsiveScale = () => {
    const [scale, setScale] = React.useState(1);
    React.useEffect(() => {
        const updateScale = () => {
            if (window.innerWidth < 640) setScale(0.6);
            else if (window.innerWidth < 1024) setScale(0.75);
            else setScale(0.85);
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);
    return scale;
};

// Simple Table View for Table Mode
const TableModeView = ({ matches }: { matches: Match[] }) => {
    const sorted = [...matches].sort((a, b) => {
        if (a.rank !== undefined && b.rank !== undefined) return a.rank - b.rank;
        return (b.score || 0) - (a.score || 0);
    });

    return (
        <div className="overflow-x-auto w-full border border-gray-200 rounded-xl bg-white">
            <table className="w-full text-sm text-left">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 font-bold text-xs uppercase">
                    <tr>
                        <th className="px-4 py-3">Rank</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Club</th>
                        <th className="px-4 py-3 text-right">Score</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {sorted.map((m, i) => (
                        <tr key={m.id} className={`${i < 3 ? 'bg-amber-50/50' : ''}`}>
                            <td className="px-4 py-3">
                                {m.rank ? (
                                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm ${m.rank === 1 ? 'bg-amber-400 text-white' :
                                        m.rank === 2 ? 'bg-gray-400 text-white' :
                                            m.rank === 3 ? 'bg-orange-400 text-white' :
                                                'bg-gray-100 text-gray-600'
                                        }`}>
                                        {m.rank}
                                    </span>
                                ) : '-'}
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-800">{typeof m.red !== 'string' ? m.red?.name : 'TBD'}</td>
                            <td className="px-4 py-3 text-gray-500">{typeof m.red !== 'string' ? m.red?.club : ''}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">{m.score?.toFixed(2) || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Ring Card for Overview
const RingCard: React.FC<{ ring: Ring, stats: { categories: number, bouts: number, completed: number }, onClick: () => void }> = ({ ring, stats, onClick }) => {
    const progress = stats.bouts > 0 ? Math.round((stats.completed / stats.bouts) * 100) : 0;

    return (
        <div
            onClick={onClick}
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group"
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-200">
                        {ring.name.replace('Ring ', '').replace('RING ', '').charAt(0)}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{ring.name}</h3>
                        <span className="text-xs text-gray-500">
                            {ring.bout_mode?.includes('table') ? '📊 Table Mode' : '🏆 Bracket Mode'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{progress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-gray-50 p-2 rounded-lg">
                    <div className="text-lg font-bold text-gray-800">{stats.categories}</div>
                    <div className="text-[10px] text-gray-500 uppercase">Categories</div>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg">
                    <div className="text-lg font-bold text-gray-800">{stats.bouts}</div>
                    <div className="text-[10px] text-gray-500 uppercase">Bouts</div>
                </div>
                <div className="bg-green-50 p-2 rounded-lg">
                    <div className="text-lg font-bold text-green-600">{stats.completed}</div>
                    <div className="text-[10px] text-gray-500 uppercase">Done</div>
                </div>
            </div>
        </div>
    );
};

export const PublicBracketView: React.FC = () => {
    const { rings, matches } = useTournament();
    const [viewMode, setViewMode] = useState<'overview' | 'detail'>('overview');
    const [selectedRingId, setSelectedRingId] = useState<string>('');
    const [search, setSearch] = useState('');
    const scale = useResponsiveScale();

    // Sort rings A-Z
    const sortedRings = useMemo(() => {
        return [...rings].sort((a, b) => a.name.localeCompare(b.name));
    }, [rings]);

    // Calculate stats for each ring
    const ringStats = useMemo(() => {
        const stats = new Map<string, { categories: number, bouts: number, completed: number }>();
        rings.forEach(ring => {
            let boutCount = 0;
            let completedCount = 0;
            const categories = new Set(Object.values(ring.priorityGroups).flat());

            matches.forEach((list) => {
                if (list.length > 0 && list[0].ring === ring.id) {
                    boutCount += list.length;
                    completedCount += list.filter(m => m.winner || m.score !== undefined).length;
                }
            });
            stats.set(ring.id, { categories: categories.size, bouts: boutCount, completed: completedCount });
        });
        return stats;
    }, [rings, matches]);

    // Selected ring data
    const selectedRing = rings.find(r => r.id === selectedRingId);
    const isTableMode = selectedRing?.bout_mode?.includes('table');

    // Categories for selected ring with matchMap for BracketNode
    const ringCategories = useMemo(() => {
        if (!selectedRingId) return [];
        const result: { key: string; matches: Match[]; matchMap: Map<string, Match>; rootMatchId: string | null }[] = [];

        matches.forEach((catMatches, key) => {
            if (catMatches.length > 0 && catMatches[0].ring === selectedRingId) {
                if (search) {
                    const searchLower = search.toLowerCase();
                    const hasMatch = catMatches.some(m =>
                        (typeof m.red !== 'string' && m.red?.name.toLowerCase().includes(searchLower)) ||
                        (typeof m.blue !== 'string' && m.blue?.name.toLowerCase().includes(searchLower)) ||
                        key.toLowerCase().includes(searchLower)
                    );
                    if (!hasMatch) return;
                }

                // Build matchMap for BracketNode
                const matchMap = new Map<string, Match>();
                catMatches.forEach(m => matchMap.set(m.id, m));

                // Find root match (Final or match with no next)
                const rootMatches = catMatches.filter(m => !m.nextMatchId);
                const rootMatchId = rootMatches.length > 0
                    ? rootMatches[0].id
                    : (catMatches.find(m => m.round === 'Final')?.id || catMatches[catMatches.length - 1]?.id || null);

                result.push({ key, matches: catMatches, matchMap, rootMatchId });
            }
        });
        return result.sort((a, b) => a.key.localeCompare(b.key));
    }, [matches, selectedRingId, search]);


    // Overview Mode
    if (viewMode === 'overview') {
        return (
            <div className="animate-fadeIn">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                        <Grid size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Tournament Brackets</h1>
                        <p className="text-sm text-gray-500">Select a ring to view matches</p>
                    </div>
                </div>

                {/* Ring Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {sortedRings.map(ring => (
                        <RingCard
                            key={ring.id}
                            ring={ring}
                            stats={ringStats.get(ring.id) || { categories: 0, bouts: 0, completed: 0 }}
                            onClick={() => {
                                setSelectedRingId(ring.id);
                                setViewMode('detail');
                            }}
                        />
                    ))}
                </div>

                {rings.length === 0 && (
                    <div className="text-center py-20 text-gray-400">
                        <Trophy className="mx-auto mb-4 opacity-30" size={48} />
                        <p className="font-medium">No rings configured</p>
                        <p className="text-sm">Brackets will appear once rings are set up</p>
                    </div>
                )}
            </div>
        );
    }

    // Detail Mode
    return (
        <div className="animate-fadeIn">
            {/* Toolbar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between mb-6 sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setViewMode('overview')}
                        className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                    >
                        <ChevronLeft size={18} />
                        Back
                    </button>
                    <div className="h-6 w-px bg-gray-200" />
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">
                            {selectedRing?.name.replace('Ring ', '').charAt(0)}
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-800">{selectedRing?.name}</h2>
                            <span className="text-xs text-gray-500">
                                {isTableMode ? '📊 Table Mode' : '🏆 Bracket Mode'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-1 max-w-md">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search participant or category..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Categories & Brackets */}
            <div className="space-y-6">
                {ringCategories.map(({ key, matches: catMatches, matchMap, rootMatchId }) => (
                    <div key={key} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        {/* Category Header */}
                        <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Users size={18} className="text-gray-400" />
                                <h3 className="font-bold text-gray-800">{key}</h3>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                                    {catMatches.length} bouts
                                </span>
                            </div>
                            {isTableMode && (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-medium">
                                    📊 Score Table
                                </span>
                            )}
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            {isTableMode ? (
                                <TableModeView matches={catMatches} />
                            ) : (
                                // Tree Mode - Use BracketNode visualization
                                <div className="overflow-x-auto pb-4">
                                    <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', minWidth: 'fit-content' }}>
                                        {rootMatchId && (
                                            <BracketNode matchId={rootMatchId} matchMap={matchMap} scale={scale} />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}


                {ringCategories.length === 0 && (
                    <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-200">
                        <Trophy className="mx-auto mb-4 opacity-30" size={48} />
                        <p className="font-medium">No matches found</p>
                        <p className="text-sm">Try adjusting your search or select a different ring</p>
                    </div>
                )}
            </div>
        </div>
    );
};
