import React, { useState, useMemo } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { generatePlayerBoutData } from '../../utils/reportGenerator';
import { Search, Printer } from 'lucide-react';

export const PublicMasterList: React.FC = () => {
    const { participants, matches, rings } = useTournament();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClub, setSelectedClub] = useState<string>('All');

    const tableData = useMemo(() => {
        // We need to inject Ring and Category info into the generated report data
        const baseData = generatePlayerBoutData(participants, matches);

        return baseData.map(item => {
            // Find participant to get category
            const p = participants.find(part => part.id === item.id);
            const category = p?.category_key || 'Unknown';

            // Better Ring Lookup: Checks all match lists
            let actualRing = 'Unassigned';
            for (const [key, list] of matches) {
                // If this category (or split) matches
                if (key === category || key.startsWith(category + '_')) {
                    if (list.length > 0 && list[0].ring) {
                        const r = rings.find(rng => rng.id === list[0].ring);
                        actualRing = r ? r.name : 'Unknown Ring';
                        break;
                    }
                }
            }

            return { ...item, category, ring: actualRing };
        });
    }, [participants, matches, rings]);

    const clubs = useMemo(() => {
        const uniqueClubs = Array.from(new Set(participants.map(p => p.club))).sort();
        return ['All', ...uniqueClubs];
    }, [participants]);

    const filteredData = useMemo(() => {
        return tableData.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesClub = selectedClub === 'All' || item.club === selectedClub;
            return matchesSearch && matchesClub;
        });
    }, [tableData, searchTerm, selectedClub]);

    // If no matches are generated, show a friendly message instead of a warning
    if (matches.size === 0 && participants.length > 0) {
        return (
            <div className="max-w-4xl mx-auto p-8 animate-fadeIn text-center">
                <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Schedule Not Ready</h2>
                    <p className="text-gray-500">
                        The tournament schedule has not been generated yet. Please check back later.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn pb-10">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2 px-1">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white">
                    <Search size={20} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Participation List</h1>
                    <p className="text-sm text-gray-500">Check your bouts and ring assignment</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 print:hidden">
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search name, category..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none transition-all"
                        />
                    </div>
                    <select
                        value={selectedClub}
                        onChange={(e) => setSelectedClub(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 outline-none focus:border-blue-300 min-w-[200px]"
                    >
                        {clubs.map(club => (
                            <option key={club} value={club}>{club}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium whitespace-nowrap"
                    >
                        <Printer size={18} />
                        <span className="hidden sm:inline">Print</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-none print:overflow-visible">
                <div className="overflow-x-auto print:overflow-visible">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-xs print:bg-gray-100">
                            <tr>
                                <th className="px-4 py-3 sm:px-6 sm:py-4 border-b">No.</th>
                                <th className="px-4 py-3 sm:px-6 sm:py-4 border-b">Category</th>
                                <th className="px-4 py-3 sm:px-6 sm:py-4 border-b">Ring</th>
                                <th className="px-4 py-3 sm:px-6 sm:py-4 border-b">Bout(s)</th>
                                <th className="px-4 py-3 sm:px-6 sm:py-4 border-b">Name</th>
                                <th className="px-4 py-3 sm:px-6 sm:py-4 border-b">Club</th>
                                <th className="px-4 py-3 sm:px-6 sm:py-4 border-b text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredData.length > 0 ? (
                                filteredData.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-blue-50/50 transition-colors print:hover:bg-transparent">
                                        <td className="px-4 py-3 sm:px-6 sm:py-4 font-mono text-gray-400">{index + 1}</td>
                                        <td className="px-4 py-3 sm:px-6 sm:py-4 font-medium text-blue-800 max-w-[150px] sm:max-w-none truncate" title={item.category}>
                                            {item.category}
                                        </td>
                                        <td className="px-4 py-3 sm:px-6 sm:py-4">
                                            <span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold text-gray-600 border border-gray-200 whitespace-nowrap">
                                                {item.ring}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 sm:px-6 sm:py-4">
                                            {item.bouts.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {item.bouts.map((b, i) => {
                                                        const isRed = b.includes('(Red)');
                                                        const isBlue = b.includes('(Blue)');
                                                        let badgeClass = "bg-gray-100 text-gray-700 border-gray-200";

                                                        if (isRed) badgeClass = "bg-red-50 text-red-700 border-red-200";
                                                        if (isBlue) badgeClass = "bg-blue-50 text-blue-700 border-blue-200";

                                                        return (
                                                            <span key={i} className={`px-2 py-0.5 rounded text-xs font-semibold border whitespace-nowrap ${badgeClass}`}>
                                                                {b}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">No bouts</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 sm:px-6 sm:py-4 font-bold text-gray-800">{item.name}</td>
                                        <td className="px-4 py-3 sm:px-6 sm:py-4 text-gray-600">{item.club}</td>
                                        <td className="px-4 py-3 sm:px-6 sm:py-4 text-center">
                                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${item.bouts.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                        No players found matching your criteria.
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
