import React, { useState, useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import { usePodiumResults } from '../hooks/usePodiumResults';
import { ChevronLeft, Filter, CheckCircle, Clock, Trophy, AlertCircle, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';

type SortOption = 'latest' | 'earliest' | 'name' | 'priority';
type FilterOption = 'all' | 'given' | 'pending';

export const MedalDistributionManager: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const { categorySummaries, categoryStatus, updateCategoryStatus } = useTournament();
    const { podiums } = usePodiumResults();

    // State
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<FilterOption>('all');
    const [ringFilter, setRingFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<SortOption>('priority');
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // Derived Data
    const processedCategories = useMemo(() => {
        return categorySummaries.map(cat => {
            const status = categoryStatus.get(cat.category_key);
            const podium = podiums.find(p => p.categoryKey === cat.category_key);
            const hasResults = !!podium && (!!podium.gold || !!podium.silver || podium.bronze.length > 0);
            return {
                ...cat,
                isGiven: status?.medals_given || false,
                updatedAt: status?.updated_at ? new Date(status.updated_at) : null,
                winners: podium,
                hasResults,
                ringName: podium?.lastRing || 'Unassigned'
            };
        });
    }, [categorySummaries, categoryStatus, podiums]);

    // Filter & Sort
    const filteredList = useMemo(() => {
        let result = processedCategories;

        // 1. Search
        if (search) {
            const lower = search.toLowerCase();
            result = result.filter(c => c.category_key.toLowerCase().includes(lower));
        }

        // 2. Filter Status
        if (filter === 'given') {
            result = result.filter(c => c.isGiven);
        } else if (filter === 'pending') {
            result = result.filter(c => !c.isGiven);
        }

        // 3. Filter Ring
        if (ringFilter !== 'all') {
            result = result.filter(c => c.ringName === ringFilter);
        }

        // 4. Sort
        result.sort((a, b) => {
            if (sortBy === 'name') {
                return a.category_key.localeCompare(b.category_key);
            } else if (sortBy === 'latest') {
                // If updated, sort by date desc. If null, push to bottom?
                const timeA = a.updatedAt?.getTime() || 0;
                const timeB = b.updatedAt?.getTime() || 0;
                return timeB - timeA;
            } else if (sortBy === 'earliest') {
                const timeA = a.updatedAt?.getTime() || (Date.now() + 100000); // Pending/Null last? Or 0 first
                const timeB = b.updatedAt?.getTime() || (Date.now() + 100000);
                return timeA - timeB;
            } else if (sortBy === 'priority') {
                // 1. Has Results (Yes first)
                if (a.hasResults !== b.hasResults) return a.hasResults ? -1 : 1;
                // 2. Pending (Not Given) first
                if (a.isGiven !== b.isGiven) return a.isGiven ? 1 : -1;
                // 3. Name
                return a.category_key.localeCompare(b.category_key);
            }
            return 0;
        });

        return result;
    }, [processedCategories, search, filter, ringFilter, sortBy]);

    const handleToggle = async (categoryKey: string, currentStatus: boolean, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row toggle
        setIsUpdating(categoryKey);
        try {
            await updateCategoryStatus(categoryKey, !currentStatus);
        } finally {
            setIsUpdating(null);
        }
    };

    const toggleRow = (categoryKey: string) => {
        const newSet = new Set(expandedRows);
        if (newSet.has(categoryKey)) {
            newSet.delete(categoryKey);
        } else {
            newSet.add(categoryKey);
        }
        setExpandedRows(newSet);
    };

    // Get unique rings for filter dropdown
    const availableRings = useMemo(() => {
        const ringNames = new Set(processedCategories.map(c => c.ringName).filter(r => r !== 'Unassigned'));
        return Array.from(ringNames).sort();
    }, [processedCategories]);

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 animate-fadeIn pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-medium transition-colors mb-2 text-sm"
                        >
                            <ChevronLeft size={16} />
                            Back to Dashboard
                        </button>
                    )}
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Trophy className="text-amber-500" />
                        Medal Distribution Manager
                    </h1>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col items-center gap-4">
                {/* Top Row: Search */}
                <div className="w-full">
                    <input
                        type="text"
                        placeholder="Search category..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    />
                </div>

                {/* Bottom Row: Filters & Sort */}
                <div className="flex flex-wrap items-center gap-3 w-full sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Status Filter */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                <Filter size={12} /> Status:
                            </span>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                {(['all', 'pending', 'given'] as FilterOption[]).map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Ring Filter */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Ring:
                            </span>
                            <select
                                value={ringFilter}
                                onChange={(e) => setRingFilter(e.target.value)}
                                className="bg-gray-50 border border-gray-200 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Rings</option>
                                {availableRings.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            <ArrowUpDown size={12} /> Sort:
                        </span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="bg-gray-50 border border-gray-200 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="priority">Priority (Results First)</option>
                            <option value="name">Category Name</option>
                            <option value="latest">Latest Update</option>
                            <option value="earliest">Recent Update</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4 w-32 text-center">Ring</th>
                                <th className="px-6 py-4 w-32 text-center">Details</th>
                                <th className="px-6 py-4 w-48 text-center">Medals Given?</th>
                                <th className="px-6 py-4 w-40 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredList.map((cat) => {
                                const isExpanded = expandedRows.has(cat.category_key);
                                return (
                                    <React.Fragment key={cat.category_key}>
                                        <tr
                                            onClick={() => toggleRow(cat.category_key)}
                                            className={`transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'}`}
                                        >
                                            <td className="px-6 py-4 font-bold text-gray-800">
                                                <div className="flex items-center gap-2">
                                                    {isExpanded ? <ChevronUp size={16} className="text-blue-500" /> : <ChevronDown size={16} className="text-gray-400" />}
                                                    {cat.category_key}
                                                </div>
                                                {cat.updatedAt && (
                                                    <div className="text-xs text-gray-400 font-normal mt-1 ml-6 flex items-center gap-1">
                                                        <Clock size={10} />
                                                        Updated {cat.updatedAt.toLocaleString()}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-semibold border border-slate-200">
                                                    {cat.ringName}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-xs font-medium px-2 py-1 rounded ${cat.hasResults ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                                                    {cat.hasResults ? 'Results Ready' : 'No Results'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {cat.isGiven ? (
                                                    <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-600 px-3 py-1.5 rounded-full text-xs font-bold border border-green-100">
                                                        <CheckCircle size={14} className="fill-current" />
                                                        Given
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full text-xs font-bold border border-orange-100">
                                                        <AlertCircle size={14} />
                                                        Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={(e) => handleToggle(cat.category_key, cat.isGiven, e)}
                                                    disabled={isUpdating === cat.category_key}
                                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${cat.isGiven
                                                        ? 'bg-white border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200'
                                                        : 'bg-green-600 text-white shadow-md shadow-green-200 hover:bg-green-700 hover:scale-105 active:scale-95'
                                                        }`}
                                                >
                                                    {isUpdating === cat.category_key ? 'Saving...' : (cat.isGiven ? 'Revoke' : 'Mark as Given')}
                                                </button>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="bg-blue-50/20">
                                                <td colSpan={5} className="px-6 py-4 border-t border-gray-100/50">
                                                    {cat.winners ? (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pl-6">
                                                            {/* Gold */}
                                                            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                                                                <div className="text-[10px] uppercase font-bold text-amber-700/60 mb-1">1st Place (Gold)</div>
                                                                <div className="font-bold text-gray-800">{cat.winners.gold?.name || 'TBD'}</div>
                                                                <div className="text-xs text-gray-500">{cat.winners.gold?.club}</div>
                                                            </div>
                                                            {/* Silver */}
                                                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                                                                <div className="text-[10px] uppercase font-bold text-slate-700/60 mb-1">2nd Place (Silver)</div>
                                                                <div className="font-bold text-gray-800">{cat.winners.silver?.name || 'TBD'}</div>
                                                                <div className="text-xs text-gray-500">{cat.winners.silver?.club}</div>
                                                            </div>
                                                            {/* Bronze 1 */}
                                                            <div className="p-3 rounded-lg bg-orange-50 border border-orange-100">
                                                                <div className="text-[10px] uppercase font-bold text-orange-700/60 mb-1">3rd Place (Bronze)</div>
                                                                <div className="font-bold text-gray-800">{cat.winners.bronze[0]?.name || 'TBD'}</div>
                                                                <div className="text-xs text-gray-500">{cat.winners.bronze[0]?.club}</div>
                                                            </div>
                                                            {/* Bronze 2 */}
                                                            <div className="p-3 rounded-lg bg-orange-50 border border-orange-100">
                                                                <div className="text-[10px] uppercase font-bold text-orange-700/60 mb-1">3rd Place (Bronze)</div>
                                                                <div className="font-bold text-gray-800">{cat.winners.bronze[1]?.name || 'TBD'}</div>
                                                                <div className="text-xs text-gray-500">{cat.winners.bronze[1]?.club}</div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-4 text-gray-400 italic">
                                                            No results recorded for this category yet.
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            {filteredList.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                                        No categories found matching your filter.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Stats Footer */}
            <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm text-center">
                    <div className="text-2xl font-bold text-gray-800">{processedCategories.length}</div>
                    <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Categories</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-green-200 shadow-sm text-center bg-green-50/30">
                    <div className="text-2xl font-bold text-green-600">{processedCategories.filter(c => c.isGiven).length}</div>
                    <div className="text-xs text-green-700/70 uppercase font-bold tracking-wider">Completed</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-orange-200 shadow-sm text-center bg-orange-50/30">
                    <div className="text-2xl font-bold text-orange-600">{processedCategories.filter(c => !c.isGiven).length}</div>
                    <div className="text-xs text-orange-700/70 uppercase font-bold tracking-wider">Pending</div>
                </div>
            </div>
        </div>
    );
};
