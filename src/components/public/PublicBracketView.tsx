import React, { useMemo, useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { Search, ChevronLeft, Trophy, Grid, Users, Printer, Filter } from 'lucide-react';
import { BracketNode } from '../BracketNode';
import type { Match, Ring } from '../../types';

// Responsive scale hook
const useResponsiveScale = () => {
    const [scale, setScale] = React.useState(1);
    React.useEffect(() => {
        const updateScale = () => {
            // More granular scaling for mobile
            if (window.innerWidth < 480) setScale(0.5);
            else if (window.innerWidth < 640) setScale(0.6);
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
            <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 font-bold text-xs uppercase">
                    <tr>
                        <th className="px-3 py-3 sm:px-4">Rank</th>
                        <th className="px-3 py-3 sm:px-4">Name</th>
                        <th className="px-3 py-3 sm:px-4">Club</th>
                        <th className="px-3 py-3 sm:px-4 text-right">Score</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {sorted.map((m, i) => (
                        <tr key={m.id} className={`${i < 3 ? 'bg-amber-50/50' : ''}`}>
                            <td className="px-3 py-3 sm:px-4">
                                {m.rank ? (
                                    <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full font-bold text-xs sm:text-sm ${m.rank === 1 ? 'bg-amber-400 text-white' :
                                        m.rank === 2 ? 'bg-gray-400 text-white' :
                                            m.rank === 3 ? 'bg-orange-400 text-white' :
                                                'bg-gray-100 text-gray-600'
                                        }`}>
                                        {m.rank}
                                    </span>
                                ) : '-'}
                            </td>
                            <td className="px-3 py-3 sm:px-4 font-semibold text-gray-800 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">
                                {typeof m.red !== 'string' ? m.red?.name : 'TBD'}
                            </td>
                            <td className="px-3 py-3 sm:px-4 text-gray-500 text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">
                                {typeof m.red !== 'string' ? m.red?.club : ''}
                            </td>
                            <td className="px-3 py-3 sm:px-4 text-right font-mono font-bold text-blue-600 text-xs sm:text-sm">
                                {m.score?.toFixed(2) || '-'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Ring Card for Overview
const RingCard: React.FC<{ ring: Ring, stats: { categories: number, lastBoutNumber: number | string }, onClick: () => void }> = ({ ring, stats, onClick }) => {
    return (
        <div
            onClick={onClick}
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group active:scale-98 flex flex-col justify-between h-full"
        >
            <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform duration-300">
                    {ring.name.replace('Ring ', '').replace('RING ', '').charAt(0)}
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{ring.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${ring.bout_mode?.includes('table') ? 'bg-purple-500' : 'bg-amber-500'}`} />
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            {ring.bout_mode?.includes('table') ? 'Score Table' : 'Bracket System'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-center group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                    <div className="text-2xl font-black text-gray-800 mb-0.5">{stats.categories}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Categories</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-center group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                    <div className="text-2xl font-black text-indigo-600 mb-0.5">
                        {stats.lastBoutNumber || '-'}
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Last Bout #</div>
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
    const [clubFilter, setClubFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const scale = useResponsiveScale();

    // Sort rings A-Z
    const sortedRings = useMemo(() => {
        return [...rings].sort((a, b) => a.name.localeCompare(b.name));
    }, [rings]);

    // Calculate stats for each ring
    const ringStats = useMemo(() => {
        const stats = new Map<string, { categories: number, lastBoutNumber: number | string }>();
        rings.forEach(ring => {
            const categories = new Set(Object.values(ring.priorityGroups).flat());
            let maxBoutNum = 0;

            matches.forEach((list) => {
                if (list.length > 0 && list[0].ring === ring.id) {
                    list.forEach(m => {
                        const bNum = m.bout_number ? parseInt(m.bout_number.replace(/\D/g, '')) || 0 : 0;
                        if (bNum > maxBoutNum) maxBoutNum = bNum;
                    });
                }
            });
            stats.set(ring.id, {
                categories: categories.size,
                lastBoutNumber: maxBoutNum > 0 ? maxBoutNum : '-'
            });
        });
        return stats;
    }, [rings, matches]);

    // Selected ring data
    const selectedRing = rings.find(r => r.id === selectedRingId);
    const isTableMode = selectedRing?.bout_mode?.includes('table');

    // Extract unique clubs and categories for filters
    const { uniqueClubs, uniqueCategories } = useMemo(() => {
        const clubs = new Set<string>();
        const categories = new Set<string>();

        if (selectedRingId) {
            matches.forEach((catMatches, key) => {
                if (catMatches.length > 0 && catMatches[0].ring === selectedRingId) {
                    categories.add(key);
                    catMatches.forEach(m => {
                        if (typeof m.red !== 'string' && m.red?.club) clubs.add(m.red.club);
                        if (typeof m.blue !== 'string' && m.blue?.club) clubs.add(m.blue.club);
                    });
                }
            });
        }
        return {
            uniqueClubs: Array.from(clubs).sort(),
            uniqueCategories: Array.from(categories).sort()
        };
    }, [matches, selectedRingId]);

    // Categories for selected ring with matchMap for BracketNode
    const ringCategories = useMemo(() => {
        if (!selectedRingId) return [];
        const result: { key: string; matches: Match[]; matchMap: Map<string, Match>; rootMatchId: string | null }[] = [];

        matches.forEach((catMatches, key) => {
            if (catMatches.length > 0 && catMatches[0].ring === selectedRingId) {
                // Main Filtering Logic
                const searchLower = search.toLowerCase();

                // 1. Check Category Filter
                if (categoryFilter && key !== categoryFilter) return;

                // 2. Check Search and Club Filter (must match at least one participant in the category)
                const matchesFilter = catMatches.some(m => {
                    const redName = typeof m.red !== 'string' ? m.red?.name.toLowerCase() : '';
                    const blueName = typeof m.blue !== 'string' ? m.blue?.name.toLowerCase() : '';
                    const redClub = typeof m.red !== 'string' ? m.red?.club : '';
                    const blueClub = typeof m.blue !== 'string' ? m.blue?.club : '';

                    // Search text matching
                    const matchesSearch = !search ||
                        redName?.includes(searchLower) ||
                        blueName?.includes(searchLower) ||
                        key.toLowerCase().includes(searchLower) ||
                        (m.bout_number && m.bout_number.toString().includes(searchLower));

                    // Club matching
                    const matchesClub = !clubFilter ||
                        redClub === clubFilter ||
                        blueClub === clubFilter;

                    return matchesSearch && matchesClub;
                });

                if (!matchesFilter) return;

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
    }, [matches, selectedRingId, search, clubFilter, categoryFilter]);


    // Overview Mode
    if (viewMode === 'overview') {
        return (
            <div className="animate-fadeIn pb-10">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6 px-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white leading-none shadow-md shadow-purple-200">
                        <Grid size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold text-gray-800 tracking-tight">Tournament Brackets</h1>
                        <p className="text-sm text-gray-500 font-medium">Select a ring to view full schedule</p>
                    </div>
                </div>

                {/* Ring Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {sortedRings.map(ring => (
                        <RingCard
                            key={ring.id}
                            ring={ring}
                            stats={ringStats.get(ring.id) || { categories: 0, lastBoutNumber: '-' }}
                            onClick={() => {
                                setSelectedRingId(ring.id);
                                setViewMode('detail');
                                setSearch(''); // Reset filters on ring change
                                setClubFilter('');
                                setCategoryFilter('');
                            }}
                        />
                    ))}
                </div>

                {rings.length === 0 && (
                    <div className="text-center py-24 text-gray-400 bg-white/50 rounded-3xl border-2 border-dashed border-gray-200">
                        <Trophy className="mx-auto mb-4 opacity-20" size={64} />
                        <p className="font-bold text-lg text-gray-500">No rings configured</p>
                        <p className="text-sm">Brackets will appear here once the schedule is published</p>
                    </div>
                )}
            </div>
        );
    }

    // Detail Mode
    return (
        <div className="animate-fadeIn pb-10">
            {/* Toolbar */}
            <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4 mb-6 sticky top-0 z-20">
                {/* Top Row: Back btn, Ring info, Search */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => setViewMode('overview')}
                            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium text-sm sm:text-base shrink-0"
                        >
                            <ChevronLeft size={18} />
                            Back
                        </button>
                        <div className="h-6 w-px bg-gray-200 hidden sm:block" />
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                                {selectedRing?.name.replace('Ring ', '').charAt(0)}
                            </div>
                            <h2 className="font-bold text-gray-800 text-sm sm:text-base truncate">{selectedRing?.name}</h2>
                        </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto sm:max-w-md ml-auto">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search player, bout #, category..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                            />
                        </div>
                        <button
                            onClick={() => window.print()}
                            className="p-2 bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors shrink-0"
                            title="Print Ring Schedule"
                        >
                            <Printer size={20} />
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center border-t border-gray-50 pt-3">
                    <div className="flex items-center gap-2 text-gray-500 text-sm font-medium mb-1 sm:mb-0">
                        <Filter size={16} />
                        <span>Filters:</span>
                    </div>
                    <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 outline-none"
                        >
                            <option value="">All Categories</option>
                            {uniqueCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <select
                            value={clubFilter}
                            onChange={(e) => setClubFilter(e.target.value)}
                            className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 outline-none"
                        >
                            <option value="">All Clubs</option>
                            {uniqueClubs.map(club => (
                                <option key={club} value={club}>{club}</option>
                            ))}
                        </select>
                    </div>
                    {(categoryFilter || clubFilter || search) && (
                        <button
                            onClick={() => {
                                setCategoryFilter('');
                                setClubFilter('');
                                setSearch('');
                            }}
                            className="text-xs text-red-600 hover:text-red-800 font-medium whitespace-nowrap px-2 ml-auto sm:ml-0"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Categories & Brackets */}
            <div className="space-y-6 print:space-y-0">
                {ringCategories.map(({ key, matches: catMatches, matchMap, rootMatchId }) => (
                    <div key={key} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden print-page-break print:shadow-none print:rounded-none print:border-0 print:mb-0 print:pb-0 print:overflow-visible">
                        {/* ... (Rest of component matches rendering) */}
                        <div className="bg-gradient-to-r from-gray-50 to-white px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 print:border-b-2 print:border-black print:bg-white">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <Users size={18} className="text-gray-400 shrink-0 print:text-black" />
                                <h3 className="font-bold text-gray-800 text-sm sm:text-base truncate print:text-black print:text-xl">{key}</h3>
                            </div>
                            <div className="flex items-center gap-2 self-start sm:self-auto">
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium whitespace-nowrap">
                                    {catMatches.length} bouts
                                </span>
                                {isTableMode && (
                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-medium whitespace-nowrap">
                                        📊 Score Table
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-3 sm:p-6 overflow-x-auto">
                            {isTableMode ? (
                                <TableModeView matches={catMatches} />
                            ) : (
                                // Tree Mode - Use BracketNode visualization
                                <div className="min-w-[300px] pb-4">
                                    {/* Center the bracket if possible, but allow scroll */}
                                    <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', display: 'inline-block' }}>
                                        {rootMatchId && (
                                            <BracketNode matchId={rootMatchId} matchMap={matchMap} scale={1} />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}


                {ringCategories.length === 0 && (
                    <div className="text-center py-16 sm:py-20 text-gray-400 bg-white rounded-2xl border border-gray-200">
                        <Trophy className="mx-auto mb-4 opacity-30" size={48} />
                        <p className="font-medium">No matches found</p>
                        <p className="text-sm">Try adjusting your filters</p>
                    </div>
                )}
            </div>
        </div>
    );
};
