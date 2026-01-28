
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useTournament } from '../context/TournamentContext';
import { seedParticipants } from '../utils/seedingAlgorithm';
import { generateMatches, assignBoutNumbers } from '../utils/matchGenerator';
import type { Match, Participant } from '../types';
import type { GenerationOptions } from '../utils/matchGenerator';
import { BracketNode } from './BracketNode';
import { ChevronLeft, Printer, ZoomIn, ZoomOut, RotateCcw, Maximize2, Settings, RefreshCw, Play } from 'lucide-react';

const useResponsiveScale = () => {
    const [scale, setScale] = useState(1);
    useEffect(() => {
        const updateScale = () => {
            const width = window.innerWidth;
            if (width < 640) setScale(0.6);
            else if (width < 1024) setScale(0.8);
            else setScale(1);
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);
    return scale;
};

const TableView = ({ matches }: { matches: Match[] }) => {
    const sorted = [...matches].sort((a, b) => {
        if (a.round !== b.round) return a.round.localeCompare(b.round);
        if (a.rank !== undefined && b.rank !== undefined) return a.rank - b.rank;
        if (a.score !== undefined && b.score !== undefined) return b.score - a.score;
        return 0;
    });

    return (
        <div className="overflow-x-auto w-full max-w-4xl mx-auto shadow-lg rounded-xl border border-gray-200 mb-8 bg-white">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-xs">
                    <tr>
                        <th className="px-6 py-3 border-b">Rank</th>
                        <th className="px-6 py-3 border-b">Name</th>
                        <th className="px-6 py-3 border-b">Club</th>
                        <th className="px-6 py-3 border-b text-center">Score</th>
                        <th className="px-6 py-3 border-b text-center">Round</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {sorted.map((m) => (
                        <tr key={m.id} className="hover:bg-blue-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-gray-700">
                                {m.rank ? `#${m.rank}` : '-'}
                            </td>
                            <td className="px-6 py-4 font-medium text-gray-900">
                                {typeof m.red !== 'string' ? m.red?.name : 'Bye'}
                            </td>
                            <td className="px-6 py-4 text-gray-500">
                                {typeof m.red !== 'string' ? m.red?.club : '-'}
                            </td>
                            <td className="px-6 py-4 text-center font-mono font-medium text-blue-600">
                                {m.score !== undefined ? m.score.toFixed(2) : '-.--'}
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className="px-2 py-1 bg-gray-100 rounded text-gray-600 text-xs text-nowrap">
                                    {m.round}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export const BracketView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { participants, rings, matches, setMatches, categorySummaries, saveData } = useTournament();
    const [selectedCategory, setSelectedCategory] = useState<string>(categorySummaries[0]?.category_key || '');
    const [manualScale, setManualScale] = useState<number | null>(null);
    const autoScale = useResponsiveScale();
    const scale = manualScale ?? autoScale;
    const printRef = useRef<HTMLDivElement>(null);

    // Generation Settings
    const [showSettings, setShowSettings] = useState(false);
    const [maxGroupSize, setMaxGroupSize] = useState(4);
    const [isGenerating, setIsGenerating] = useState(false);

    const handlePrint = () => window.print();

    useEffect(() => {
        if (!selectedCategory && categorySummaries.length > 0) {
            setSelectedCategory(categorySummaries[0].category_key);
        }
    }, [categorySummaries, selectedCategory]);

    // Manual Generation Function
    const handleGenerate = async () => {
        // STRICT BLOCK: Check prerequisites
        if (rings.length === 0) {
            alert("No Rings Found! Please go to Ring Assignment and create rings first.");
            return;
        }

        // Check for unassigned categories (optional but good for strictness)
        // Actually, user wants "admin need to set ring"
        // Let's enforce that EVERY category with participants has a ring.
        const participantsByCat = new Map<string, Participant[]>();
        participants.forEach(p => {
            const list = participantsByCat.get(p.category_key) || [];
            list.push(p);
            participantsByCat.set(p.category_key, list);
        });

        const unassignedCategories: string[] = [];
        participantsByCat.forEach((_, catKey) => {
            let assigned = false;
            for (const r of rings) {
                if (Object.values(r.priorityGroups).some(c => c.includes(catKey))) {
                    assigned = true;
                    break;
                }
            }
            if (!assigned) unassignedCategories.push(catKey);
        });

        if (unassignedCategories.length > 0) {
            alert(`Cannot Generate: ${unassignedCategories.length} Categories are not assigned to any Ring.\n\nPlease go to Ring Assignment and assign all categories first.`);
            return;
        }

        if (!window.confirm("Are you sure you want to regenerate ALL matches? This will reset current progress.")) return;

        setIsGenerating(true);
        const newMatches = new Map(matches);

        let hasChanges = false;

        participantsByCat.forEach((list, catKey) => {
            if (list.length === 0) return;

            // Find ring config
            let ringId = 'Unassigned';
            let boutMode = 'tree_pro';
            // Need strict type check logic if we want to be safe, but casting for now
            for (const ring of rings) {
                if (Object.values(ring.priorityGroups).some(cats => cats.includes(catKey))) {
                    ringId = ring.id;
                    boutMode = ring.bout_mode || 'tree_pro';
                    break;
                }
            }

            // Should theoretically be impossible to have Unassigned here due to check above, 
            // unless logic differs.
            if (ringId === 'Unassigned') return;

            // Clean up existing matches for this category (Base + Splits)
            newMatches.delete(catKey);
            for (const key of newMatches.keys()) {
                if (key.startsWith(catKey + '_')) {
                    newMatches.delete(key);
                }
            }

            // Generate
            if (list.length <= 1 && !boutMode.includes('table')) {
                // Skip single players unless table
            } else {
                try {
                    const seeded = seedParticipants(list);
                    // @ts-ignore
                    const matchGroups = generateMatches(seeded, catKey, ringId, boutMode as any, { maxGroupSize });
                    matchGroups.forEach(group => {
                        newMatches.set(group.categoryKey, group.matches);
                    });
                    hasChanges = true;
                } catch (err) {
                    console.error(`Error generating matches for ${catKey}:`, err);
                }
            }
        });

        if (hasChanges) {
            assignBoutNumbers(rings, newMatches);
            setMatches(newMatches);
            await saveData();
        }
        setIsGenerating(false);
        setShowSettings(false);
    };

    const categoryGroups = useMemo(() => {
        const groups: { key: string, matches: Match[], isTable: boolean }[] = [];
        const baseMatches = matches.get(selectedCategory);
        if (baseMatches && baseMatches.length > 0) {
            groups.push({
                key: selectedCategory,
                matches: baseMatches,
                isTable: baseMatches[0].is_table_mode || false
            });
        }
        const splitKeys: string[] = [];
        for (const key of matches.keys()) {
            if (key.startsWith(selectedCategory + '_')) {
                splitKeys.push(key);
            }
        }
        splitKeys.sort();
        splitKeys.forEach(k => {
            const m = matches.get(k);
            if (m && m.length > 0) {
                groups.push({
                    key: k,
                    matches: m,
                    isTable: m[0].is_table_mode || false
                });
            }
        });
        return groups;
    }, [matches, selectedCategory]);

    const currentParticipants = participants.filter(p => p.category_key === selectedCategory);

    return (
        <div className="h-full flex flex-col p-3 sm:p-4 lg:p-6 overflow-hidden bg-gradient-to-br from-gray-50 to-slate-50">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 shrink-0 no-print">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium transition-colors">
                    <ChevronLeft size={20} /> <span className="hidden sm:inline">Back</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white min-w-[200px]"
                    >
                        {categorySummaries.map(c => <option key={c.category_key} value={c.category_key}>{c.category_key}</option>)}
                    </select>

                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-2 rounded-lg border ${showSettings ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-600'}`}
                        title="Generator Settings"
                    >
                        <Settings size={18} />
                    </button>

                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm whitespace-nowrap"
                    >
                        <RefreshCw size={18} className={isGenerating ? 'animate-spin' : ''} />
                        <span>{isGenerating ? 'Generating...' : 'Generate All'}</span>
                    </button>

                    <button onClick={handlePrint} className="p-2 bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"><Printer size={18} /></button>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="mb-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm animate-fadeIn">
                    <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">Competition Rules</h3>
                    <div className="flex items-center gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Max Group Size (Carnival)</label>
                            <input
                                type="number"
                                min="2"
                                max="16"
                                value={maxGroupSize}
                                onChange={(e) => setMaxGroupSize(parseInt(e.target.value) || 4)}
                                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
                            />
                        </div>
                        <div className="flex-1 text-xs text-gray-400">
                            Updates splitting logic for Carnival modes. Does not affect Professional modes.
                        </div>
                    </div>
                </div>
            )}

            {/* Bracket Content */}
            <div className="flex-1 overflow-auto bg-white border border-gray-100 rounded-xl p-4 sm:p-6 shadow-sm print-area">
                <div ref={printRef} className="bracket-wrapper">
                    <div className="text-center mb-8 sticky left-0">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium mb-2">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            Tournament Bracket
                        </div>
                        <h1 className="text-xl font-bold text-gray-800">{selectedCategory}</h1>
                    </div>

                    {categoryGroups.length > 0 ? (
                        <div className="flex flex-col gap-12">
                            {categoryGroups.map(group => (
                                <div key={group.key} className="border-t pt-8 first:border-t-0 first:pt-0">
                                    {group.key !== selectedCategory && (
                                        <h3 className="text-center font-bold text-gray-500 mb-6 bg-gray-50 py-2 rounded-lg mx-auto w-32 border border-gray-200 shadow-sm">
                                            Group {group.key.split('_').pop()}
                                        </h3>
                                    )}

                                    {group.isTable ? (
                                        <TableView matches={group.matches} />
                                    ) : (
                                        <div className="bracket-tree flex flex-col gap-8 items-center justify-center mx-auto">
                                            {(() => {
                                                const groupMap = new Map<string, Match>();
                                                group.matches.forEach(m => groupMap.set(m.id, m));
                                                const roots = group.matches.filter(m => !m.nextMatchId);
                                                // Ensure we show finals if no open next matches (finished bracket)
                                                const displayRoots = roots.length === 0 ? group.matches.filter(m => m.round === 'Final') : roots;

                                                return displayRoots.length > 0 ? displayRoots.map(root => (
                                                    <div key={root.id} className="flex">
                                                        <BracketNode matchId={root.id} matchMap={groupMap} scale={scale} />
                                                    </div>
                                                )) : <div className="text-gray-400 italic">No structure found</div>;
                                            })()}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="w-full py-12 text-center">
                            {/* Empty State / Not Generated */}
                            {currentParticipants.length > 0 ? (
                                <div className="flex flex-col items-center max-w-sm mx-auto">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                        <RefreshCw size={32} />
                                    </div>
                                    <h3 className="font-bold text-gray-800 mb-2">Ready to Generate</h3>
                                    <p className="text-gray-500 text-sm mb-6">
                                        {currentParticipants.length} participants in this category.<br />
                                        Click <b>Generate All</b> to create brackets.
                                    </p>
                                    <button
                                        onClick={handleGenerate}
                                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
                                    >
                                        <Play size={18} fill="currentColor" /> Generate Now
                                    </button>
                                </div>
                            ) : (
                                <p className="text-gray-400">No participants in this category.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
