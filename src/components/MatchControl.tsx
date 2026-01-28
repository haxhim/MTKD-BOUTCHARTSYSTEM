
import React, { useState, useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import { ChevronLeft, Filter, Calendar } from 'lucide-react';
import { BracketNode } from './BracketNode';
import type { Match, Ring } from '../types';

const useResponsiveScale = () => {
    // Simple responsive scale
    const [scale, setScale] = React.useState(1);
    React.useEffect(() => {
        const updateScale = () => {
            if (window.innerWidth < 640) setScale(0.65);
            else if (window.innerWidth < 1024) setScale(0.8);
            else setScale(0.9);
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);
    return scale;
};

// Reusing TableView (Simplified)
const SimpleTableView = ({ matches, title }: { matches: Match[], title?: string }) => {
    const sorted = [...matches].sort((a, b) => {
        if (a.rank !== undefined && b.rank !== undefined) return a.rank - b.rank;
        return (b.score || 0) - (a.score || 0);
    });

    return (
        <div className="overflow-x-auto w-full border border-gray-200 rounded-lg bg-white">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 font-bold text-xs uppercase">
                    <tr>
                        <th className="px-4 py-2">Rank</th>
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">Club</th>
                        <th className="px-4 py-2">Category</th>
                        <th className="px-4 py-2 text-right">Score</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {sorted.map(m => (
                        <tr key={m.id}>
                            <td className="px-4 py-2 font-bold text-gray-700">{m.rank ? `#${m.rank}` : '-'}</td>
                            <td className="px-4 py-2">{typeof m.red !== 'string' ? m.red?.name : 'Bye'}</td>
                            <td className="px-4 py-2 text-gray-500">{typeof m.red !== 'string' ? m.red?.club : ''}</td>
                            <td className="px-4 py-2 text-gray-500">{title || '-'}</td>
                            <td className="px-4 py-2 text-right font-mono font-bold text-blue-600">{m.score?.toFixed(2) || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// Ring Card Component
const RingCard: React.FC<{ ring: Ring, stats: { categories: number, bouts: number }, onClick: () => void }> = ({ ring, stats, onClick }) => (
    <div
        onClick={onClick}
        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
    >
        <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{ring.name}</h3>
            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${ring.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {ring.isActive ? 'Active' : 'Inactive'}
            </span>
        </div>

        <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
                <span>Mode:</span>
                <span className="font-medium text-gray-900">{ring.bout_mode === 'tree_carnival' ? 'Carnival Tree' :
                    ring.bout_mode === 'table_pro' ? 'Professional Table' :
                        ring.bout_mode === 'table_carnival' ? 'Carnival Table' : 'Professional Tree'}</span>
            </div>
            <div className="flex justify-between">
                <span>Categories:</span>
                <span className="font-medium text-gray-900">{stats.categories}</span>
            </div>
            <div className="flex justify-between">
                <span>Total Bouts:</span>
                <span className="font-medium text-gray-900">{stats.bouts}</span>
            </div>
        </div>
    </div>
);

export const MatchControl: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { rings, matches } = useTournament();
    const [viewMode, setViewMode] = useState<'overview' | 'detail'>('overview');
    const [selectedRingId, setSelectedRingId] = useState<string>('');
    const scale = useResponsiveScale();

    // Calculate stats for all rings
    const ringStats = useMemo(() => {
        const stats = new Map<string, { categories: number, bouts: number }>();
        rings.forEach(ring => {
            let boutCount = 0;
            let categoryCount = 0;
            // Count unique categories assigned
            const categories = new Set(Object.values(ring.priorityGroups).flat());
            categoryCount = categories.size;

            // Count bouts
            matches.forEach((list, key) => {
                if (list.length > 0 && list[0].ring === ring.id) {
                    boutCount += list.length;
                }
            });

            stats.set(ring.id, { categories: categoryCount, bouts: boutCount });
        });
        return stats;
    }, [rings, matches]);

    // Data for detail view (Existing Logic)
    const ringData = useMemo(() => {
        if (!selectedRingId) return [];
        const ring = rings.find(r => r.id === selectedRingId);
        if (!ring) return [];

        const relevantGroups: { title: string, matches: Match[], isTable: boolean }[] = [];
        matches.forEach((catMatches, key) => {
            if (catMatches.length > 0 && catMatches[0].ring === selectedRingId) {
                relevantGroups.push({
                    title: key,
                    matches: catMatches,
                    isTable: catMatches[0].is_table_mode || false
                });
            }
        });
        return relevantGroups.sort((a, b) => a.title.localeCompare(b.title));
    }, [matches, selectedRingId, rings]);

    const handleRingClick = (id: string) => {
        setSelectedRingId(id);
        setViewMode('detail');
    };

    if (viewMode === 'overview') {
        return (
            <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fadeIn">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Match Control</h1>
                        <p className="text-gray-500">Select a ring to view its schedule and brackets</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rings.map(ring => (
                        <RingCard
                            key={ring.id}
                            ring={ring}
                            stats={ringStats.get(ring.id) || { categories: 0, bouts: 0 }}
                            onClick={() => handleRingClick(ring.id)}
                        />
                    ))}
                </div>
            </div>
        );
    }

    // Detail View
    const selectedRing = rings.find(r => r.id === selectedRingId);

    return (
        <div className="flex flex-col h-full bg-gray-50 animate-fadeIn">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => setViewMode('overview')} className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium transition-colors">
                        <ChevronLeft size={20} /> Back to Rings
                    </button>
                    <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
                    <h2 className="font-bold text-lg text-gray-800">{selectedRing?.name} Schedule</h2>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => window.print()} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors">
                        Print Schedule
                    </button>
                </div>
            </div>

            {/* Content: List of Brackets */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-12 bg-white/50">
                {ringData.length > 0 ? (
                    ringData.map(group => (
                        <div key={group.title} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden break-inside-avoid">
                            <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-3 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800 text-lg">{group.title}</h3>
                                <span className={`text-xs font-bold uppercase px-2 py-1 rounded border shadow-sm ${group.isTable ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white text-gray-500 border-gray-200'}`}>
                                    {group.isTable ? 'Table Mode' : 'Tree Mode'}
                                </span>
                            </div>

                            <div className="p-6 flex justify-center overflow-x-auto">
                                {group.isTable ? (
                                    <SimpleTableView matches={group.matches} title={group.title} />
                                ) : (
                                    <div className="flex flex-col gap-4 min-w-min">
                                        {(() => {
                                            const groupMap = new Map<string, Match>();
                                            group.matches.forEach(m => groupMap.set(m.id, m));
                                            const roots = group.matches.filter(m => !m.nextMatchId);
                                            const displayRoots = roots.length === 0 ? group.matches.filter(m => m.round === 'Final') : roots;

                                            return displayRoots.map(root => (
                                                <div key={root.id} className="flex justify-center">
                                                    <BracketNode matchId={root.id} matchMap={groupMap} scale={scale} />
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20 text-gray-400">
                        <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">No matches scheduled for {selectedRing?.name}.</p>
                        <p className="text-sm">Generate matches in the Bracket Control view first.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
