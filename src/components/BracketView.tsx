import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useTournament } from '../context/TournamentContext';
import { seedParticipants } from '../utils/seedingAlgorithm';
import { generateMatches, assignBoutNumbers } from '../utils/matchGenerator';
import type { Match, Participant } from '../types';
import { BracketNode } from './BracketNode';
import { ChevronLeft, Printer, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';

// Hook to get responsive scale based on window width
const useResponsiveScale = () => {
    const [scale, setScale] = useState(1);
    
    useEffect(() => {
        const updateScale = () => {
            const width = window.innerWidth;
            if (width < 640) {
                setScale(0.6);
            } else if (width < 1024) {
                setScale(0.8);
            } else {
                setScale(1);
            }
        };
        
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);
    
    return scale;
};

export const BracketView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { participants, rings, matches, setMatches, categorySummaries, saveData } = useTournament();
    const [selectedCategory, setSelectedCategory] = useState<string>(categorySummaries[0]?.category_key || '');
    const [manualScale, setManualScale] = useState<number | null>(null);
    const autoScale = useResponsiveScale();
    const scale = manualScale ?? autoScale;
    const printRef = useRef<HTMLDivElement>(null);

    // Print function that only prints the bracket
    const handlePrint = () => {
        window.print();
    };

    useEffect(() => {
        // Incremental generation: Check if we have participants for categories that lack matches
        let hasChanges = false;
        const newMatches = new Map(matches);
        const participantsByCat = new Map<string, Participant[]>();

        participants.forEach(p => {
            const list = participantsByCat.get(p.category_key) || [];
            list.push(p);
            participantsByCat.set(p.category_key, list);
        });

        participantsByCat.forEach((list, catKey) => {
            // Check if matches already exist for this category
            if (newMatches.has(catKey)) {
                const existing = newMatches.get(catKey);
                // If we have matches, we are good.
                if (existing && existing.length > 0) return;

                // If we have no matches, but only 0 or 1 participant, that is correct (no matches needed).
                // So strict skip to avoid infinite loop of re-generating empty arrays.
                if (list.length <= 1) return;

                // If we have > 1 participant but 0 matches, that's a BUG/Missing state. 
                // We should proceed to generate.
            }

            hasChanges = true;
            let ringId = 'Unassigned';
            for (const ring of rings) {
                if (Object.values(ring.priorityGroups).some(cats => cats.includes(catKey))) {
                    ringId = ring.id;
                    break;
                }
            }

            try {
                const seeded = seedParticipants(list);
                const catMatches = generateMatches(seeded, catKey, ringId);
                newMatches.set(catKey, catMatches);
            } catch (err) {
                console.error(`Error generating matches for ${catKey}:`, err);
            }
        });

        if (hasChanges) {
            assignBoutNumbers(rings, newMatches);
            setMatches(newMatches);
            saveData().catch(console.error);
        }
    }, [participants, rings, matches, setMatches, saveData]);

    // Auto-select first category if none selected or invalid
    useEffect(() => {
        if (!selectedCategory && categorySummaries.length > 0) {
            console.log("Auto-selecting first category:", categorySummaries[0].category_key);
            setSelectedCategory(categorySummaries[0].category_key);
        }
    }, [categorySummaries, selectedCategory]);

    const currentMatches = matches.get(selectedCategory) || [];
    const currentParticipants = participants.filter(p => p.category_key === selectedCategory);

    // Memoize the map and root finder
    const { matchMap, rootMatches } = useMemo(() => {
        const map = new Map<string, Match>();
        currentMatches.forEach(m => map.set(m.id, m));

        const roots = currentMatches.filter(m => !m.nextMatchId);
        if (roots.length === 0) {
            return { matchMap: map, rootMatches: currentMatches.filter(m => m.round === 'Final') };
        }
        return { matchMap: map, rootMatches: roots };
    }, [currentMatches]);

    return (
        <div className="h-full flex flex-col p-3 sm:p-4 lg:p-6 overflow-hidden bg-gradient-to-br from-gray-50 to-slate-50">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6 shrink-0 no-print">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium transition-colors group touch-target"
                >
                    <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="hidden sm:inline">Back to Dashboard</span>
                    <span className="sm:hidden">Back</span>
                </button>
                <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                        <button
                            onClick={() => setManualScale(Math.max(0.3, scale - 0.1))}
                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                            title="Zoom Out"
                        >
                            <ZoomOut size={16} className="text-gray-600" />
                        </button>
                        <span className="text-xs text-gray-500 min-w-[3rem] text-center font-medium">
                            {Math.round(scale * 100)}%
                        </span>
                        <button
                            onClick={() => setManualScale(Math.min(1.5, scale + 0.1))}
                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                            title="Zoom In"
                        >
                            <ZoomIn size={16} className="text-gray-600" />
                        </button>
                        <div className="w-px h-4 bg-gray-200 mx-0.5"></div>
                        <button
                            onClick={() => setManualScale(null)}
                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                            title="Reset Zoom"
                        >
                            <RotateCcw size={14} className="text-gray-600" />
                        </button>
                        <button
                            onClick={() => setManualScale(1)}
                            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                            title="Fit to Screen"
                        >
                            <Maximize2 size={14} className="text-gray-600" />
                        </button>
                    </div>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 rounded-xl bg-white text-gray-700 font-medium focus:ring-4 focus:ring-blue-50 focus:border-blue-300 transition-all outline-none shadow-sm text-sm sm:text-base"
                    >
                        {categorySummaries.map(c => (
                            <option key={c.category_key} value={c.category_key}>{c.category_key}</option>
                        ))}
                    </select>
                    <button
                        onClick={handlePrint}
                        className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-200 font-medium flex items-center gap-2 touch-target"
                    >
                        <Printer size={18} />
                        <span className="hidden sm:inline">Print Bracket</span>
                    </button>
                </div>
            </div>

            {/* Bracket Container */}
            <div className="flex-1 overflow-auto bg-white border border-gray-100 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm print-area">
                <div ref={printRef} className="bracket-wrapper">
                    {/* Category Title */}
                    <div className="text-center mb-6 sm:mb-8 sticky left-0">
                        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs sm:text-sm font-medium mb-2 sm:mb-3">
                            <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-blue-500 rounded-full"></span>
                            Tournament Bracket
                        </div>
                        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">{selectedCategory}</h1>
                    </div>

                    {/* Bracket Tree */}
                    <div className="bracket-tree flex flex-col gap-8 sm:gap-10 lg:gap-12 items-center justify-center mx-auto">
                        {rootMatches.map(root => (
                            <div key={root.id} className="flex">
                                <BracketNode matchId={root.id} matchMap={matchMap} scale={scale} />
                            </div>
                        ))}
                        {rootMatches.length === 0 && (
                            <div className="w-full py-12 sm:py-16 text-center">
                                {currentParticipants.length === 1 ? (
                                    <div className="flex flex-col items-center animate-fadeIn">
                                        <div className="w-16 sm:w-24 h-16 sm:h-24 bg-yellow-100 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-sm border border-yellow-200">
                                            <span className="text-2xl sm:text-4xl">🥇</span>
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Category Winner</h3>
                                        <p className="text-gray-500 text-sm sm:text-base mb-4">No opponent available for this category.</p>
                                        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border border-gray-100 min-w-[250px] sm:min-w-[300px]">
                                            <p className="font-bold text-base sm:text-lg text-gray-800">{currentParticipants[0].name}</p>
                                            <p className="text-xs sm:text-sm text-gray-500">{currentParticipants[0].club}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-12 sm:w-16 h-12 sm:h-16 bg-gray-100 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                                            <svg className="w-6 sm:w-8 h-6 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                        </div>
                                        <p className="text-gray-500 font-medium text-sm sm:text-base">No matches generated yet.</p>
                                        <p className="text-gray-400 text-xs sm:text-sm mt-1">Assign categories to rings first.</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
