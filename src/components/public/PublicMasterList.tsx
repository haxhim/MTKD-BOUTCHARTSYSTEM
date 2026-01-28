import React, { useMemo, useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { Search, Filter, Printer, List } from 'lucide-react';

export const PublicMasterList: React.FC = () => {
    const { matches, rings, participants } = useTournament();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRingId, setSelectedRingId] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Get unique clubs for reference
    const uniqueClubs = useMemo(() => {
        const clubs = new Set<string>();
        participants.forEach(p => {
            if (p.club) clubs.add(p.club);
        });
        return Array.from(clubs).sort();
    }, [participants]);

    // Get unique categories
    const uniqueCategories = useMemo(() => {
        const categories = new Set<string>();
        matches.forEach((_, categoryKey) => {
            // Get base category (without split suffix)
            const base = categoryKey.replace(/_[A-Z]$/, '');
            categories.add(base);
        });
        return Array.from(categories).sort();
    }, [matches]);

    // Flatten matches into list
    const boutList = useMemo(() => {
        const list: {
            boutNumber: string;
            category: string;
            ringId: string;
            redName: string;
            redClub: string;
            blueName: string;
            blueClub: string;
            ringName: string;
            winner?: string;
        }[] = [];

        matches.forEach((catMatches, categoryKey) => {
            catMatches.forEach(m => {
                if (m.bout_number) {
                    const redName = typeof m.red === 'string' ? m.red : m.red?.name || 'TBD';
                    const redClub = typeof m.red === 'string' ? '' : m.red?.club || '';
                    const blueName = typeof m.blue === 'string' ? m.blue : m.blue?.name || 'TBD';
                    const blueClub = typeof m.blue === 'string' ? '' : m.blue?.club || '';
                    const winnerName = m.winner ? (typeof m.winner === 'string' ? m.winner : m.winner.name) : undefined;

                    list.push({
                        boutNumber: m.bout_number,
                        category: categoryKey,
                        ringId: m.ring || '',
                        redName,
                        redClub,
                        blueName,
                        blueClub,
                        ringName: rings.find(r => r.id === m.ring)?.name || 'Unassigned',
                        winner: winnerName
                    });
                }
            });
        });

        // Sort by Ring Name (A-Z) then Bout Number
        return list.sort((a, b) => {
            const ringCompare = a.ringName.localeCompare(b.ringName);
            if (ringCompare !== 0) return ringCompare;
            const numA = parseInt(a.boutNumber.replace(/\D/g, ''), 10);
            const numB = parseInt(b.boutNumber.replace(/\D/g, ''), 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.boutNumber.localeCompare(b.boutNumber);
        });
    }, [matches, rings]);

    // Apply filters
    const filteredList = useMemo(() => {
        return boutList.filter(b => {
            // Ring filter
            if (selectedRingId !== 'all' && b.ringId !== selectedRingId) return false;

            // Category filter
            if (selectedCategory !== 'all') {
                const baseCategory = b.category.replace(/_[A-Z]$/, '');
                if (baseCategory !== selectedCategory) return false;
            }

            // Search filter (name or club)
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matches =
                    b.redName.toLowerCase().includes(query) ||
                    b.blueName.toLowerCase().includes(query) ||
                    b.redClub.toLowerCase().includes(query) ||
                    b.blueClub.toLowerCase().includes(query) ||
                    b.boutNumber.toLowerCase().includes(query) ||
                    b.category.toLowerCase().includes(query);
                if (!matches) return false;
            }

            return true;
        });
    }, [boutList, selectedRingId, selectedCategory, searchQuery]);

    return (
        <div className="max-w-7xl mx-auto animate-fadeIn">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white">
                    <List size={20} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Master Bout List</h1>
                    <p className="text-sm text-gray-500">{filteredList.length} of {boutList.length} bouts</p>
                </div>
            </div>

            {/* Filters Toolbar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 print:hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search name, club, bout..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                        />
                    </div>

                    {/* Ring Filter */}
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-gray-400 shrink-0" />
                        <select
                            value={selectedRingId}
                            onChange={(e) => setSelectedRingId(e.target.value)}
                            className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="all">All Rings</option>
                            {[...rings].sort((a, b) => a.name.localeCompare(b.name)).map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Category Filter */}
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="all">All Categories</option>
                        {uniqueCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    {/* Print Button */}
                    <button
                        onClick={() => window.print()}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-lg hover:from-slate-700 hover:to-slate-800 transition-all shadow-sm font-medium"
                    >
                        <Printer size={18} />
                        Print List
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-none">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 font-bold uppercase text-xs print:bg-gray-100">
                            <tr>
                                <th className="px-4 py-3 border-b whitespace-nowrap">Bout #</th>
                                <th className="px-4 py-3 border-b">Ring</th>
                                <th className="px-4 py-3 border-b">Category</th>
                                <th className="px-4 py-3 border-b">
                                    <span className="text-red-600">🔴 Red Corner</span>
                                </th>
                                <th className="px-4 py-3 border-b">
                                    <span className="text-blue-600">🔵 Blue Corner</span>
                                </th>
                                <th className="px-4 py-3 border-b text-center">Result</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredList.map((bout, i) => (
                                <tr key={i} className="hover:bg-blue-50/50 transition-colors print:hover:bg-transparent">
                                    <td className="px-4 py-3">
                                        <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                            {bout.boutNumber}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold text-gray-700">
                                            {bout.ringName}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-gray-700 max-w-[180px] truncate" title={bout.category}>
                                        {bout.category}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className={`${bout.winner === bout.redName ? 'font-bold text-green-700' : 'text-gray-800'}`}>
                                            {bout.redName}
                                            {bout.winner === bout.redName && <span className="ml-2">🏆</span>}
                                        </div>
                                        <div className="text-xs text-gray-500">{bout.redClub}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className={`${bout.winner === bout.blueName ? 'font-bold text-green-700' : 'text-gray-800'}`}>
                                            {bout.blueName}
                                            {bout.winner === bout.blueName && <span className="ml-2">🏆</span>}
                                        </div>
                                        <div className="text-xs text-gray-500">{bout.blueClub}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {bout.winner ? (
                                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                                                Completed
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold">
                                                Pending
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredList.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                                        No bouts found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
