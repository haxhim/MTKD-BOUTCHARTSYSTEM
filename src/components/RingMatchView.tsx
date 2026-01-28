import React, { useEffect, useState, useCallback } from 'react';
import { useTournament } from '../context/TournamentContext';
import { seedParticipants } from '../utils/seedingAlgorithm';
import { generateMatches, assignBoutNumbers } from '../utils/matchGenerator';
import type { Match, Participant } from '../types';
import { BracketNode } from './BracketNode';
import { ChevronLeft, ChevronRight, Printer, ZoomIn, ZoomOut, RotateCcw, Maximize2, Circle } from 'lucide-react';

// Hook to get responsive scale based on window width
const useResponsiveScale = () => {
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const updateScale = () => {
            const width = window.innerWidth;
            if (width < 640) {
                setScale(0.55);
            } else if (width < 1024) {
                setScale(0.75);
            } else {
                setScale(0.9);
            }
        };

        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    return scale;
};

export const RingMatchView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { participants, rings, matches, setMatches } = useTournament();
    const [selectedRingId, setSelectedRingId] = useState<string>(rings[0]?.id || '');
    const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
    const [manualScale, setManualScale] = useState<number | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const autoScale = useResponsiveScale();
    const scale = manualScale ?? autoScale;

    // Ensure matches are generated
    useEffect(() => {
        if (matches.size > 0) return;

        const newMatches = new Map<string, Match[]>();
        const participantsByCat = new Map<string, Participant[]>();

        participants.forEach(p => {
            const list = participantsByCat.get(p.category_key) || [];
            list.push(p);
            participantsByCat.set(p.category_key, list);
        });

        participantsByCat.forEach((list, catKey) => {
            let ringId = 'Unassigned';
            for (const ring of rings) {
                if (Object.values(ring.priorityGroups).some(cats => cats.includes(catKey))) {
                    ringId = ring.id;
                    break;
                }
            }

            const seeded = seedParticipants(list);
            const matchGroups = generateMatches(seeded, catKey, ringId);
            const flatMatches = matchGroups.flatMap(g => g.matches);
            newMatches.set(catKey, flatMatches);
        });

        assignBoutNumbers(rings, newMatches);
        setMatches(newMatches);
    }, [participants, rings, matches.size, setMatches]);

    // Get categories for the selected ring
    const ringCategories = React.useMemo(() => {
        const currentRing = rings.find(r => r.id === selectedRingId);
        if (!currentRing) return [];

        const sortedCategories: string[] = [];
        const priorities = Object.keys(currentRing.priorityGroups).map(Number).sort((a, b) => a - b);
        priorities.forEach(p => {
            sortedCategories.push(...currentRing.priorityGroups[p]);
        });

        return sortedCategories.map(catKey => {
            const catMatches = matches.get(catKey) || [];
            if (catMatches.length === 0) return null;

            const map = new Map<string, Match>();
            catMatches.forEach(m => map.set(m.id, m));
            const roots = catMatches.filter(m => !m.nextMatchId);
            const rootMatches = roots.length > 0 ? roots : catMatches.filter(m => m.round === 'Final');

            return {
                key: catKey,
                matches: catMatches,
                matchMap: map,
                roots: rootMatches
            };
        }).filter(item => item !== null);
    }, [matches, selectedRingId, rings]);

    // Reset category index when ring changes
    useEffect(() => {
        setCurrentCategoryIndex(0);
    }, [selectedRingId]);

    // Navigation functions with animation
    const goToPrevious = useCallback(() => {
        if (currentCategoryIndex > 0 && !isTransitioning) {
            setIsTransitioning(true);
            setTimeout(() => {
                setCurrentCategoryIndex(prev => prev - 1);
                setIsTransitioning(false);
            }, 150);
        }
    }, [currentCategoryIndex, isTransitioning]);

    const goToNext = useCallback(() => {
        if (currentCategoryIndex < ringCategories.length - 1 && !isTransitioning) {
            setIsTransitioning(true);
            setTimeout(() => {
                setCurrentCategoryIndex(prev => prev + 1);
                setIsTransitioning(false);
            }, 150);
        }
    }, [currentCategoryIndex, ringCategories.length, isTransitioning]);

    const goToCategory = useCallback((index: number) => {
        if (index !== currentCategoryIndex && !isTransitioning) {
            setIsTransitioning(true);
            setTimeout(() => {
                setCurrentCategoryIndex(index);
                setIsTransitioning(false);
            }, 150);
        }
    }, [currentCategoryIndex, isTransitioning]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') goToPrevious();
            if (e.key === 'ArrowRight') goToNext();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goToPrevious, goToNext]);

    const currentRingName = rings.find(r => r.id === selectedRingId)?.name || 'Unknown Ring';
    const currentCategory = ringCategories[currentCategoryIndex];

    return (
        <div className="h-full flex flex-col p-3 sm:p-4 lg:p-6 overflow-hidden bg-gradient-to-br from-gray-50 to-slate-50 min-h-screen">
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
                            title="100%"
                        >
                            <Maximize2 size={14} className="text-gray-600" />
                        </button>
                    </div>
                    <select
                        value={selectedRingId}
                        onChange={(e) => setSelectedRingId(e.target.value)}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 rounded-xl bg-white text-gray-700 font-medium focus:ring-4 focus:ring-blue-50 focus:border-blue-300 transition-all outline-none shadow-sm text-sm sm:text-base"
                    >
                        {rings.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => window.print()}
                        className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-200 font-medium flex items-center gap-2 touch-target"
                    >
                        <Printer size={18} />
                        <span className="hidden sm:inline">Print All</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area - Carousel Style */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white border border-gray-100 rounded-xl sm:rounded-2xl shadow-sm">
                {ringCategories.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center py-16">
                            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                            <p className="text-gray-500 font-medium text-lg">No categories assigned to this ring</p>
                            <p className="text-gray-400 text-sm mt-1">Assign categories in Ring Assignment first</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Category Navigation Bar */}
                        <div className="shrink-0 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white px-4 sm:px-6 py-3 no-print">
                            <div className="flex items-center justify-between gap-4">
                                {/* Previous Button */}
                                <button
                                    onClick={goToPrevious}
                                    disabled={currentCategoryIndex === 0}
                                    className={`p-2.5 rounded-xl transition-all duration-200 ${currentCategoryIndex === 0
                                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 shadow-sm'
                                        }`}
                                >
                                    <ChevronLeft size={20} />
                                </button>

                                {/* Category Pills */}
                                <div className="flex-1 flex items-center justify-center gap-2 overflow-x-auto py-1 px-2 scrollbar-hide">
                                    {ringCategories.map((cat, index) => (
                                        <button
                                            key={cat!.key}
                                            onClick={() => goToCategory(index)}
                                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 ${index === currentCategoryIndex
                                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200 scale-105'
                                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                                }`}
                                        >
                                            {cat!.key}
                                        </button>
                                    ))}
                                </div>

                                {/* Next Button */}
                                <button
                                    onClick={goToNext}
                                    disabled={currentCategoryIndex === ringCategories.length - 1}
                                    className={`p-2.5 rounded-xl transition-all duration-200 ${currentCategoryIndex === ringCategories.length - 1
                                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 shadow-sm'
                                        }`}
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>

                            {/* Dot Indicators */}
                            <div className="flex items-center justify-center gap-1.5 mt-3">
                                {ringCategories.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => goToCategory(index)}
                                        className="p-0.5"
                                    >
                                        <Circle
                                            size={index === currentCategoryIndex ? 10 : 8}
                                            className={`transition-all duration-200 ${index === currentCategoryIndex
                                                    ? 'fill-blue-500 text-blue-500'
                                                    : 'fill-gray-300 text-gray-300 hover:fill-gray-400 hover:text-gray-400'
                                                }`}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Bracket Display Area */}
                        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                            <div
                                className={`bracket-wrapper transition-all duration-300 ${isTransitioning ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'
                                    }`}
                            >
                                {currentCategory && (
                                    <>
                                        {/* Category Title */}
                                        <div className="text-center mb-6 sm:mb-8">
                                            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs sm:text-sm font-medium mb-2 sm:mb-3">
                                                <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-blue-500 rounded-full animate-pulse"></span>
                                                {currentRingName} • Category {currentCategoryIndex + 1} of {ringCategories.length}
                                            </div>
                                            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">
                                                {currentCategory.key}
                                            </h1>
                                        </div>

                                        {/* Bracket Tree */}
                                        <div className="bracket-tree flex flex-col gap-8 sm:gap-10 lg:gap-12 items-center justify-center mx-auto">
                                            {currentCategory.roots.map(root => (
                                                <div key={root.id} className="flex">
                                                    <BracketNode matchId={root.id} matchMap={currentCategory.matchMap} scale={scale} />
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Bottom Navigation Helper */}
                        <div className="shrink-0 border-t border-gray-100 bg-gradient-to-r from-white to-gray-50/80 px-4 sm:px-6 py-3 no-print">
                            <div className="flex items-center justify-between text-sm text-gray-500">
                                <span className="hidden sm:inline">Use ← → arrow keys to navigate</span>
                                <span className="sm:hidden">Swipe or tap to navigate</span>
                                <span className="font-medium">
                                    {currentCategoryIndex + 1} / {ringCategories.length} categories
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Hidden Print Content - All Categories (One per page) */}
            <div className="hidden print:block">
                {ringCategories.map((catData) => (
                    <div key={catData!.key} className="print-page">
                        <div className="print-bracket">
                            {catData!.roots.map(root => (
                                <div key={root.id} className="flex justify-center">
                                    <BracketNode matchId={root.id} matchMap={catData!.matchMap} scale={0.65} />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
