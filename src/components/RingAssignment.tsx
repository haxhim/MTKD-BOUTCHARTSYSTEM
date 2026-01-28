import React, { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import type { Ring } from '../types';
import { generateId } from '../utils/uuid';
import { assignBoutNumbers } from '../utils/matchGenerator';
import { parseCSV } from '../utils/csvParser';
import { generateCategoryTally } from '../utils/tallyGenerator';
import { ChevronLeft, Plus, Trash2, Layers, Pencil, Upload, RefreshCw } from 'lucide-react';

export const RingAssignment: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [newRingName, setNewRingName] = useState('');
    const [editingRingId, setEditingRingId] = useState<string | null>(null);
    const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');
    const [isImporting, setIsImporting] = useState(false);

    // We need matches and setMatches from useTournament
    const { categorySummaries, rings, setRings, matches, setMatches, saveData, deleteRing, participants, setParticipants, setCategorySummaries } = useTournament();

    const handleImport = async (file: File) => {
        if (!file) return;
        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target?.result as string;
            try {
                const newParticipants = parseCSV(content);
                if (newParticipants.length === 0) {
                    alert('No valid participants found in CSV.');
                    setIsImporting(false);
                    return;
                }

                const mergedParticipants = [...participants, ...newParticipants];
                setParticipants(mergedParticipants);

                const newSummaries = generateCategoryTally(mergedParticipants);
                setCategorySummaries(newSummaries);

                // Persist immediately
                await saveData(mergedParticipants);
                alert(`Successfully imported ${newParticipants.length} participants.`);
            } catch (err) {
                console.error(err);
                alert('Failed to parse CSV.');
            } finally {
                setIsImporting(false);
            }
        };
        reader.readAsText(file);
    };

    // Helper to get unassigned categories
    const getUnassignedCategories = () => {
        const assigned = new Set<string>();
        rings.forEach(r => {
            Object.values(r.priorityGroups).forEach(cats => {
                cats.forEach(c => assigned.add(c));
            });
        });

        return categorySummaries.filter(c => {
            if (assigned.has(c.category_key)) return false;

            // Apply Gender Filter
            if (genderFilter === 'All') return true;
            // Assuming category key format "Category Gender" or checks age group helper if needed.
            // But we can check raw category string if standard: "WeightClass MALE"
            // Or assume the summary doesn't retain gender explicitly, but `category_key` usually ends with "Male" or "Female" or "M" / "F"?
            // Let's check `generateCategoryTally`. It groups by `category_key`.
            // In `parseCSV`, `category_key = ${category} ${gender}`.
            // So checking if key contains gender string is safest heuristic.

            // Heuristic case-insensitive check
            const keyLower = c.category_key.toLowerCase();
            if (genderFilter === 'Male') return keyLower.includes('male') && !keyLower.includes('female'); // "Male" but checking "Female" just in case "Female" contains "male" substring? No, "female" has "male", so include 'male' is risky for 'female'.
            // Actually "Female" contains "male".
            // So:
            if (genderFilter === 'Female') return keyLower.includes('female') || keyLower.includes(' girl') || keyLower.includes('woman');
            if (genderFilter === 'Male') return (keyLower.includes('male') && !keyLower.includes('female')) || keyLower.includes('boy') || keyLower.includes('man');

            return true;
        });
    };

    const handleRingUpdate = async (updatedRings: Ring[]) => {
        setRings(updatedRings);
        const newMatches = new Map(matches);
        assignBoutNumbers(updatedRings, newMatches);
        setMatches(newMatches);

        // Auto-save rings and matches immediately
        // We pass updatedRings specifically to ensure the latest state is saved
        await saveData(undefined, updatedRings);
    };


    const addRing = () => {
        if (!newRingName.trim()) return;
        const newRing: Ring = {
            id: generateId(),
            name: newRingName,
            priorityGroups: { 1: [] }
        };
        handleRingUpdate([...rings, newRing]);
        setNewRingName('');
    };

    const addPriority = (ringId: string) => {
        const updatedRings = rings.map(r => {
            if (r.id === ringId) {
                const priorities = Object.keys(r.priorityGroups).map(Number);
                const maxPriority = priorities.length > 0 ? Math.max(...priorities) : 0;
                return {
                    ...r,
                    priorityGroups: {
                        ...r.priorityGroups,
                        [maxPriority + 1]: []
                    }
                };
            }
            return r;
        });
        handleRingUpdate(updatedRings);
    };

    const removePriority = (ringId: string, priorityToRemove: number) => {
        const updatedRings = rings.map(r => {
            if (r.id === ringId) {
                const newPriorityGroups: { [key: number]: string[] } = {};
                const priorities = Object.keys(r.priorityGroups).map(Number).sort((a, b) => a - b);

                priorities.forEach(p => {
                    if (p < priorityToRemove) {
                        newPriorityGroups[p] = r.priorityGroups[p];
                    } else if (p > priorityToRemove) {
                        newPriorityGroups[p - 1] = r.priorityGroups[p];
                    }
                });

                return {
                    ...r,
                    priorityGroups: newPriorityGroups
                };
            }
            return r;
        });
        handleRingUpdate(updatedRings);
    };

    const assignCategory = (ringId: string, priority: number, categoryKey: string) => {
        const updatedRings = rings.map(r => {
            if (r.id === ringId) {
                const currentGroup = r.priorityGroups[priority] || [];
                return {
                    ...r,
                    priorityGroups: {
                        ...r.priorityGroups,
                        [priority]: [...currentGroup, categoryKey]
                    }
                };
            }
            return r;
        });
        handleRingUpdate(updatedRings);
    };

    const removeCategory = (ringId: string, priority: number, categoryKey: string) => {
        const updatedRings = rings.map(r => {
            if (r.id === ringId) {
                const currentGroup = r.priorityGroups[priority] || [];
                return {
                    ...r,
                    priorityGroups: {
                        ...r.priorityGroups,
                        [priority]: currentGroup.filter(c => c !== categoryKey)
                    }
                };
            }
            return r;
        });
        handleRingUpdate(updatedRings);
    };

    const getBoutCount = (categoryKey: string) => {
        const summary = categorySummaries.find(c => c.category_key === categoryKey);
        return summary ? Math.max(0, summary.count - 1) : 0;
    };

    const getPriorityBoutTotal = (ringId: string, priority: number) => {
        const ring = rings.find(r => r.id === ringId);
        if (!ring) return 0;
        const categories = ring.priorityGroups[priority] || [];
        return categories.reduce((sum, catKey) => sum + getBoutCount(catKey), 0);
    };

    const unassigned = getUnassignedCategories();

    return (
        <div className="max-w-6xl mx-auto p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-gray-50 to-slate-50 min-h-screen animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 sm:mb-8">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium transition-colors group touch-target"
                >
                    <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="hidden sm:inline">Back to Dashboard</span>
                    <span className="sm:hidden">Back</span>
                </button>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-xl hover:bg-blue-50 border border-blue-100 transition-all font-medium shadow-sm cursor-pointer border-dashed">
                        <Upload size={18} />
                        <span className="hidden sm:inline">{isImporting ? 'Importing...' : 'Import Data'}</span>
                        <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            disabled={isImporting}
                            onChange={(e) => {
                                if (e.target.files?.[0]) handleImport(e.target.files[0]);
                                e.target.value = ''; // Reset
                            }}
                        />
                    </label>

                    {/* Regenerate Button */}
                    <button
                        onClick={() => {
                            if (confirm("Regenerate all bout numbers? This will fix sorting issues.")) {
                                handleRingUpdate(rings);
                            }
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-white text-gray-600 rounded-xl hover:bg-gray-50 border border-gray-200 transition-all font-medium shadow-sm hover:text-blue-600"
                        title="Regenerate Bout Numbers"
                    >
                        <RefreshCw size={18} />
                    </button>

                    <h1 className="text-lg sm:text-xl font-bold text-gray-800">Ring Assignment</h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Unassigned Categories Panel */}
                <div className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 h-fit lg:sticky lg:top-6 order-2 lg:order-1">
                    <div className="flex flex-col gap-3 mb-3 sm:mb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-7 sm:w-8 h-7 sm:h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                                    <Layers size={14} className="text-amber-600 sm:w-4 sm:h-4" />
                                </div>
                                <h2 className="font-semibold text-gray-800 text-sm sm:text-base">Unassigned ({unassigned.length})</h2>
                            </div>

                            {/* Gender Filter */}
                            <div className="flex bg-gray-100 rounded-lg p-1">
                                {(['All', 'Male', 'Female'] as const).map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={() => setGenderFilter(filter)}
                                        className={`
                                            px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-medium rounded-md transition-all
                                            ${genderFilter === filter
                                                ? 'bg-white text-gray-800 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'}
                                        `}
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2 max-h-[300px] lg:max-h-[500px] overflow-y-auto pr-1">
                        {unassigned.length > 0 ? unassigned.map(cat => {
                            const bouts = getBoutCount(cat.category_key);
                            return (
                                <div key={cat.category_key} className="p-2.5 sm:p-3 bg-gradient-to-r from-gray-50 to-transparent rounded-lg sm:rounded-xl border border-gray-100 flex justify-between items-center group hover:border-blue-200 transition-colors">
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="text-xs sm:text-sm text-gray-700 font-medium truncate">{cat.category_key}</span>
                                        <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                                            <span className="text-[10px] sm:text-xs text-gray-400">{cat.count} participants</span>
                                            <span className="w-0.5 sm:w-1 h-0.5 sm:h-1 bg-gray-300 rounded-full"></span>
                                            <span className="text-[10px] sm:text-xs text-blue-500 font-medium">{bouts} bouts</span>
                                        </div>
                                    </div>
                                    {/* Dropdown to assign */}
                                    <select
                                        className="text-[10px] sm:text-xs p-1.5 sm:p-2 rounded-lg border border-gray-200 bg-white text-gray-600 ml-2 focus:border-blue-300 focus:ring-2 focus:ring-blue-50 outline-none transition-all cursor-pointer touch-target"
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                const [rId, p] = e.target.value.split(':');
                                                assignCategory(rId, parseInt(p), cat.category_key);
                                            }
                                        }}
                                        value=""
                                    >
                                        <option value="">Assign to...</option>
                                        {rings.map(r => (
                                            <optgroup key={r.id} label={r.name}>
                                                {Object.keys(r.priorityGroups).map(Number).sort((a, b) => a - b).map(p => (
                                                    <option key={p} value={`${r.id}:${p}`}>Priority {p}</option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>
                            );
                        }) : (
                            <div className="py-6 sm:py-8 text-center">
                                <div className="w-10 sm:w-12 h-10 sm:h-12 bg-emerald-100 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
                                    <svg className="w-5 sm:w-6 h-5 sm:h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <p className="text-gray-500 text-xs sm:text-sm font-medium">All categories assigned!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Rings Panel */}
                <div className="lg:col-span-2 space-y-4 sm:space-y-6 order-1 lg:order-2">
                    {/* Add Ring Form */}
                    <div className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100">
                        <label className="block text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 sm:mb-3">Create New Ring</label>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <input
                                type="text"
                                value={newRingName}
                                onChange={(e) => setNewRingName(e.target.value)}
                                placeholder="Enter ring name (e.g., RING A)"
                                className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl text-gray-700 placeholder:text-gray-400 focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-50 transition-all outline-none text-sm"
                            />
                            <button
                                onClick={addRing}
                                className="px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg sm:rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-200 font-semibold flex items-center justify-center gap-2 text-sm touch-target"
                            >
                                <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
                                Add Ring
                            </button>
                        </div>
                    </div>

                    {/* Ring Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                        {rings.map(ring => (
                            <div key={ring.id} className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                                {/* Ring Header */}
                                <div className="flex justify-between items-center mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-gray-100">
                                    <div className="flex items-center gap-2 sm:gap-3 flex-1">
                                        {/* Reorder Controls */}
                                        <div className="flex flex-col gap-0.5 mr-1">
                                            <button
                                                onClick={() => {
                                                    const idx = rings.findIndex(r => r.id === ring.id);
                                                    if (idx > 0) {
                                                        const newRings = [...rings];
                                                        [newRings[idx - 1], newRings[idx]] = [newRings[idx], newRings[idx - 1]];
                                                        handleRingUpdate(newRings);
                                                    }
                                                }}
                                                disabled={rings.findIndex(r => r.id === ring.id) === 0}
                                                className="text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Move Left/Up"
                                            >
                                                <ChevronLeft size={14} className="rotate-90 sm:rotate-0" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const idx = rings.findIndex(r => r.id === ring.id);
                                                    if (idx < rings.length - 1) {
                                                        const newRings = [...rings];
                                                        [newRings[idx], newRings[idx + 1]] = [newRings[idx + 1], newRings[idx]];
                                                        handleRingUpdate(newRings);
                                                    }
                                                }}
                                                disabled={rings.findIndex(r => r.id === ring.id) === rings.length - 1}
                                                className="text-gray-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Move Right/Down"
                                            >
                                                <ChevronLeft size={14} className="-rotate-90 sm:rotate-180" />
                                            </button>
                                        </div>

                                        <div className="w-8 sm:w-10 h-8 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-200 shrink-0">
                                            {ring.name.charAt(ring.name.length - 1)}
                                        </div>

                                        {/* Edit Name Logic */}
                                        {editingRingId === ring.id ? (
                                            <input
                                                autoFocus
                                                type="text"
                                                className="font-bold text-gray-800 border-b-2 border-blue-500 outline-none bg-transparent w-full text-sm sm:text-base"
                                                defaultValue={ring.name}
                                                onBlur={(e) => {
                                                    const newName = e.target.value.trim();
                                                    if (newName && newName !== ring.name) {
                                                        const updated = rings.map(r => r.id === ring.id ? { ...r, name: newName } : r);
                                                        handleRingUpdate(updated);
                                                    }
                                                    setEditingRingId(null);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.currentTarget.blur();
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <h3
                                                className="font-bold text-gray-800 cursor-pointer hover:text-blue-600 flex items-center gap-2 text-sm sm:text-base"
                                                onClick={() => setEditingRingId(ring.id)}
                                                title="Click to rename"
                                            >
                                                {ring.name}
                                                <Pencil size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </h3>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1 sm:gap-2">
                                        <button
                                            onClick={() => addPriority(ring.id)}
                                            className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-lg border border-gray-200 hover:border-blue-200 transition-all font-medium flex items-center gap-1 touch-target"
                                        >
                                            <Plus size={12} className="sm:w-[14px] sm:h-[14px]" />
                                            <span className="hidden sm:inline">Priority</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm(`Delete ${ring.name}?`)) {
                                                    deleteRing(ring.id);
                                                }
                                            }}
                                            className="text-xs p-1.5 sm:px-2 sm:py-1.5 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 rounded-lg border border-red-100 transition-all touch-target"
                                            title="Delete Ring"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Priority Groups */}
                                <div className="flex-1 space-y-3 sm:space-y-4">
                                    {Object.keys(ring.priorityGroups).map(Number).sort((a, b) => a - b).map(priority => {
                                        const totalBouts = getPriorityBoutTotal(ring.id, priority);
                                        return (
                                            <div key={priority}>
                                                <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                                        <span className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                                            Priority {priority}
                                                        </span>
                                                        <span className="px-1.5 sm:px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[9px] sm:text-[10px] font-bold">
                                                            {totalBouts} bouts
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => removePriority(ring.id, priority)}
                                                        className="text-[10px] text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 touch-target p-1"
                                                        title="Remove Priority"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                                <div className="min-h-[36px] sm:min-h-[40px] bg-gradient-to-r from-gray-50 to-transparent rounded-lg sm:rounded-xl p-1.5 sm:p-2 space-y-1 sm:space-y-1.5 border border-gray-100">
                                                    {ring.priorityGroups[priority]?.map((catKey, idx) => (
                                                        <div key={catKey} className="flex justify-between items-center text-xs sm:text-sm bg-white p-1.5 sm:p-2 rounded-lg border border-gray-100 group hover:border-blue-200 transition-colors">
                                                            <div className="flex items-center gap-2 overflow-hidden mr-2">
                                                                <span className="text-gray-400 font-mono text-[10px] sm:text-xs shrink-0 w-3">{idx + 1}.</span>
                                                                <span className="text-gray-700 truncate font-medium" title={catKey}>{catKey}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                                                <span className="text-[9px] sm:text-[10px] text-gray-400 bg-gray-100 px-1.5 sm:px-2 py-0.5 rounded-full">{getBoutCount(catKey)}b</span>
                                                                <button
                                                                    onClick={() => removeCategory(ring.id, priority, catKey)}
                                                                    className="w-4 sm:w-5 h-4 sm:h-5 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all touch-target"
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {(!ring.priorityGroups[priority] || ring.priorityGroups[priority].length === 0) && (
                                                        <span className="text-[10px] sm:text-xs text-gray-400 italic block text-center py-1.5 sm:py-2">Drop categories here</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {rings.length === 0 && (
                            <div className="col-span-full bg-white p-8 sm:p-12 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 text-center">
                                <div className="w-12 sm:w-16 h-12 sm:h-16 bg-gray-100 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                                    <svg className="w-6 sm:w-8 h-6 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                </div>
                                <p className="text-gray-500 font-medium text-sm sm:text-base">No rings created yet</p>
                                <p className="text-gray-400 text-xs sm:text-sm mt-1">Create a ring above to start organizing categories</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
