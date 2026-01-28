
import React, { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import type { Ring, BoutMode } from '../types';
import { generateId } from '../utils/uuid';
import { assignBoutNumbers } from '../utils/matchGenerator';
import { parseCSV } from '../utils/csvParser';
import { generateCategoryTally } from '../utils/tallyGenerator';
import { ChevronLeft, Plus, Trash2, Layers, Pencil, Upload, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const RingAssignment: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [newRingName, setNewRingName] = useState('');
    const [editingRingId, setEditingRingId] = useState<string | null>(null);
    const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');
    const [isImporting, setIsImporting] = useState(false);

    const {
        categorySummaries,
        rings,
        setRings,
        matches,
        setMatches,
        saveData,
        participants,
        setParticipants,
        setCategorySummaries,
        tournamentId
    } = useTournament();

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

                // Log Import
                if (tournamentId) {
                    await supabase.from('import_logs').insert({
                        tournament_id: tournamentId,
                        file_name: file.name,
                        row_count: content.split('\n').length,
                        valid_count: newParticipants.length,
                        rejected_count: Math.max(0, content.split('\n').length - newParticipants.length - 1) // Minus header
                    });
                }

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

    const handleRingUpdate = async (updatedRings: Ring[]) => {
        setRings(updatedRings);
        const newMatches = new Map(matches);
        assignBoutNumbers(updatedRings, newMatches);
        setMatches(newMatches);
        await saveData(undefined, updatedRings);
    };

    const handleModeChange = async (ringId: string, newMode: BoutMode) => {
        const ring = rings.find(r => r.id === ringId);
        if (!ring) return;

        // 1. Identify categories to clear
        const categoriesToClear: string[] = [];
        Object.values(ring.priorityGroups).forEach(group => {
            group.forEach(cat => {
                categoriesToClear.push(cat);
                // Also find splits in current matches
                // Matches map keys
                for (const key of matches.keys()) {
                    if (key.startsWith(cat + '_')) {
                        categoriesToClear.push(key);
                    }
                }
            });
        });

        // 2. Clear from Supabase (Critical to prevent stale matches)
        // We use 'like' for splits or just IN list
        if (categoriesToClear.length > 0 && tournamentId) {
            // We can't delete by ID easily without fetching.
            // Delete by tournament_id AND category_key (Wait, match doesn't have category_key column? 
            // matches table has `category_key`? No. 
            // matches table has IDs. 
            // We have the matches in Memory.
            const matchIdsToDelete: string[] = [];
            categoriesToClear.forEach(c => {
                const list = matches.get(c);
                if (list) list.forEach(m => matchIdsToDelete.push(m.id));
            });

            if (matchIdsToDelete.length > 0) {
                await supabase.from('matches').delete().in('id', matchIdsToDelete);
            }
        }

        // 3. Update Local State (Clear matches)
        const newMatches = new Map(matches);
        categoriesToClear.forEach(c => newMatches.delete(c));
        setMatches(newMatches);

        // 4. Update Ring Mode
        const updatedRings = rings.map(r => r.id === ringId ? { ...r, bout_mode: newMode } : r);

        // 5. Trigger Update & Save
        await handleRingUpdate(updatedRings);
    };

    // ... (Other helpers like unassigned, bout count etc remain similar)
    const getUnassignedCategories = () => {
        const assigned = new Set<string>();
        rings.forEach(r => {
            Object.values(r.priorityGroups).forEach(cats => {
                cats.forEach(c => assigned.add(c));
            });
        });

        return categorySummaries.filter(c => {
            if (assigned.has(c.category_key)) return false;
            const keyLower = c.category_key.toLowerCase();
            if (genderFilter === 'Male') return (keyLower.includes('male') && !keyLower.includes('female')) || keyLower.includes('boy') || keyLower.includes('man');
            if (genderFilter === 'Female') return keyLower.includes('female') || keyLower.includes('girl') || keyLower.includes('woman');
            return true;
        });
    };

    const addRing = () => {
        if (!newRingName.trim()) return;
        const newRing: Ring = {
            id: generateId(),
            name: newRingName,
            priorityGroups: { 1: [] },
            bout_mode: 'tree_pro'
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
                    priorityGroups: { ...r.priorityGroups, [maxPriority + 1]: [] }
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
                    if (p < priorityToRemove) newPriorityGroups[p] = r.priorityGroups[p];
                    else if (p > priorityToRemove) newPriorityGroups[p - 1] = r.priorityGroups[p];
                });
                return { ...r, priorityGroups: newPriorityGroups };
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
                    priorityGroups: { ...r.priorityGroups, [priority]: [...currentGroup, categoryKey] }
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
                    priorityGroups: { ...r.priorityGroups, [priority]: currentGroup.filter(c => c !== categoryKey) }
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium transition-colors group touch-target"
                >
                    <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                </button>
                <div className="flex flex-wrap gap-2 sm:gap-4 w-full sm:w-auto">
                    <label className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white rounded-lg sm:rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm">
                        <Upload size={18} className="text-blue-500" />
                        <span className="text-sm font-medium text-gray-700">{isImporting ? 'Importing...' : 'Import CSV'}</span>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => e.target.files && handleImport(e.target.files[0])}
                            className="hidden"
                            disabled={isImporting}
                        />
                    </label>
                    <select
                        value={genderFilter}
                        onChange={(e) => setGenderFilter(e.target.value as any)}
                        className="px-3 sm:px-4 py-2 border border-gray-200 rounded-lg sm:rounded-xl bg-white text-gray-700 font-medium focus:ring-4 focus:ring-blue-50 focus:border-blue-300 outline-none shadow-sm text-sm"
                    >
                        <option value="All">All Genders</option>
                        <option value="Male">Male Only</option>
                        <option value="Female">Female Only</option>
                    </select>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Left Column: Unassigned */}
                <div className="lg:col-span-1 space-y-4 sm:space-y-6">
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col h-[500px] sm:h-[600px] sticky top-6">
                        <h2 className="font-bold text-gray-800 mb-4 flex items-center justify-between text-base sm:text-lg">
                            <span>Unassigned Categories</span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">{unassigned.length}</span>
                        </h2>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                            {unassigned.map(cat => (
                                <div
                                    key={cat.category_key}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData('categoryKey', cat.category_key);
                                    }}
                                    className="p-3 bg-gray-50 border border-gray-100 rounded-lg sm:rounded-xl cursor-move hover:bg-white hover:border-blue-300 hover:shadow-md transition-all group active:scale-[0.98] touch-manipulation"
                                >
                                    <div className="flex justify-between items-start">
                                        <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">{cat.category_key}</span>
                                        <span className="text-xs font-semibold bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 group-hover:border-blue-200 group-hover:text-blue-600">
                                            {cat.count}
                                        </span>
                                    </div>
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className="text-[10px] text-gray-400 font-mono">
                                            Age: {cat.ageGroup}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {unassigned.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-gray-300 italic">
                                    <Layers size={48} className="mb-2 opacity-20" />
                                    <p className="text-sm">All categories assigned!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Rings */}
                <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                    {/* Ring List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        {rings.map(ring => (
                            <div
                                key={ring.id}
                                className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col"
                            >
                                {/* Ring Header */}
                                <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gradient-to-r from-gray-50/50 to-white">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 text-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-sm sm:text-base shadow-sm">
                                            {ring.name.replace('RING', '').replace('Ring', '').trim().substring(0, 1)}
                                        </div>
                                        <div>
                                            {editingRingId === ring.id ? (
                                                <input
                                                    type="text"
                                                    defaultValue={ring.name}
                                                    onBlur={(e) => {
                                                        handleRingUpdate(rings.map(r => r.id === ring.id ? { ...r, name: e.target.value } : r));
                                                        setEditingRingId(null);
                                                    }}
                                                    autoFocus
                                                    className="font-bold text-gray-800 bg-white border border-blue-300 rounded px-2 py-0.5 outline-none focus:ring-2 focus:ring-blue-100 text-sm sm:text-base w-32"
                                                />
                                            ) : (
                                                <h3 className="font-bold text-gray-800 text-sm sm:text-base flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors"
                                                    onClick={() => setEditingRingId(ring.id)}
                                                >
                                                    {ring.name}
                                                    <Pencil size={12} className="opacity-0 group-hover:opacity-50" />
                                                </h3>
                                            )}
                                            {/* Bout Mode Selector */}
                                            <select
                                                value={ring.bout_mode || 'tree_pro'}
                                                onChange={(e) => handleModeChange(ring.id, e.target.value as BoutMode)}
                                                className="mt-1 text-[10px] sm:text-xs bg-gray-50 border-none rounded px-1 py-0.5 text-gray-500 focus:ring-0 cursor-pointer hover:bg-gray-100"
                                            >
                                                <option value="tree_pro">Professional Tree</option>
                                                <option value="tree_carnival">Carnival Tree</option>
                                                <option value="table_pro">Professional Table</option>
                                                <option value="table_carnival">Carnival Table</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (confirm('Delete this ring? Unassigned categories will move back to the pool.')) {
                                                const newRings = rings.filter(r => r.id !== ring.id);
                                                handleRingUpdate(newRings);
                                            }
                                        }}
                                        className="p-1.5 sm:p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors touch-target"
                                    >
                                        <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                                    </button>
                                </div>

                                {/* Priority Groups */}
                                <div className="p-4 space-y-4 flex-1">
                                    {Object.entries(ring.priorityGroups).sort(([a], [b]) => Number(a) - Number(b)).map(([priority, cats]) => (
                                        <div
                                            key={priority}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                const catKey = e.dataTransfer.getData('categoryKey');
                                                if (catKey) {
                                                    // Remove from other rings/priorities first
                                                    let cleanRings = rings;
                                                    // Check if already assigned elsewhere logic...
                                                    // Simplified: Just add, assume single assignment enforce later or check
                                                    // Actually we should remove from others first.
                                                    cleanRings = cleanRings.map(r => {
                                                        const newGroups = { ...r.priorityGroups };
                                                        Object.keys(newGroups).forEach(p => {
                                                            newGroups[Number(p)] = newGroups[Number(p)].filter(c => c !== catKey);
                                                        });
                                                        return { ...r, priorityGroups: newGroups };
                                                    });

                                                    // Add to this ring at this priority (Need to do this on the cleaned state)
                                                    // So we effectively call handleRingUpdate with transformed state
                                                    const targetRing = cleanRings.find(r => r.id === ring.id);
                                                    if (targetRing) {
                                                        const pNum = Number(priority);
                                                        targetRing.priorityGroups[pNum] = [...(targetRing.priorityGroups[pNum] || []), catKey];
                                                        handleRingUpdate(cleanRings);
                                                    }
                                                }
                                            }}
                                            className="bg-gray-50/50 rounded-lg sm:rounded-xl border border-dashed border-gray-200 p-3"
                                        >
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                                    Priority {priority}
                                                    <span className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-400 font-mono">
                                                        {cats.length} Cats
                                                    </span>
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                                        {getPriorityBoutTotal(ring.id, Number(priority))} Bouts
                                                    </span>
                                                    <button
                                                        onClick={() => removePriority(ring.id, Number(priority))}
                                                        className="text-gray-300 hover:text-red-500"
                                                        title="Remove Priority Group"
                                                    >
                                                        <XIcon size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5 min-h-[30px]">
                                                {cats.map(cat => (
                                                    <div key={cat} className="flex justify-between items-center bg-white px-2 py-1.5 rounded border border-gray-100 shadow-sm text-xs sm:text-sm group">
                                                        <span className="truncate max-w-[140px] text-gray-700">{cat}</span>
                                                        <button
                                                            onClick={() => removeCategory(ring.id, Number(priority), cat)}
                                                            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <XIcon size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                                {cats.length === 0 && (
                                                    <div className="text-center py-2 text-gray-400 text-xs italic">
                                                        Drop categories here
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => addPriority(ring.id)}
                                        className="w-full py-2 border border-dashed border-gray-300 rounded-lg sm:rounded-xl text-gray-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all text-xs sm:text-sm font-medium flex items-center justify-center gap-2"
                                    >
                                        <Plus size={14} />
                                        Add Priority Group
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Add Ring Button */}
                        <div className="bg-gray-50 rounded-xl sm:rounded-2xl border-2 border-dashed border-gray-200 p-6 flex flex-col items-center justify-center gap-4 hover:border-blue-300 hover:bg-blue-50/30 transition-all group">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-300 group-hover:text-blue-500 group-hover:scale-110 transition-all duration-300">
                                <Plus size={24} className="sm:w-8 sm:h-8" />
                            </div>
                            <div className="w-full max-w-[200px]">
                                <input
                                    type="text"
                                    placeholder="New Ring Name"
                                    value={newRingName}
                                    onChange={(e) => setNewRingName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addRing()}
                                    className="w-full px-3 sm:px-4 py-2 text-center text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none mb-2"
                                />
                                <button
                                    onClick={addRing}
                                    className="w-full py-2 bg-gray-800 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-gray-900 transition-colors shadow-lg shadow-gray-200"
                                >
                                    Create Ring
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const XIcon = ({ size = 14, className = "" }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);
