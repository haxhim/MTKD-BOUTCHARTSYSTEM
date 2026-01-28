
import React, { useState, useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import { generatePlayerBoutData } from '../utils/reportGenerator';


import { ChevronLeft, Search } from 'lucide-react';

import { AddPlayerModal } from './AddPlayerModal';

interface MasterBoutListProps {
    onBack: () => void;
}

export const MasterBoutList: React.FC<MasterBoutListProps> = ({ onBack }) => {
    const { participants, matches, rings } = useTournament();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClub, setSelectedClub] = useState<string>('All');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // --- STRICT WORKFLOW CHECK ---
    // If no matches are generated, the user should NOT be here.
    // They must go: Participants -> Rings -> Brackets (Generation) -> Master List
    if (matches.size === 0 && participants.length > 0) {
        return (
            <div className="max-w-4xl mx-auto p-8 animate-fadeIn text-center">
                <div className="bg-amber-50 rounded-2xl p-8 border border-amber-200">
                    <h2 className="text-2xl font-bold text-amber-800 mb-4">Workflow Check Required</h2>
                    <p className="text-gray-700 mb-6 max-w-lg mx-auto">
                        The Master Bout List relies on generated matches, but no matches were found.
                        Please ensure you have followed the correct tournament flow:
                    </p>
                    <ol className="text-left text-gray-700 space-y-3 max-w-md mx-auto mb-8 bg-white p-6 rounded-xl border border-amber-100 shadow-sm">
                        <li className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs">1</span>
                            <span>Add Participants</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs">2</span>
                            <span>Assign Rings</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">3</span>
                            <span className="font-bold">Generate Brackets</span>
                        </li>
                    </ol>
                    <div className="flex justify-center gap-4">
                        <button
                            onClick={onBack}
                            className="px-6 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const tableData = useMemo(() => {
        // We need to inject Ring and Category info into the generated report data
        const baseData = generatePlayerBoutData(participants, matches);
        // Helper to find Ring for a category
        // Inefficient but safe for now: loop matches to find ring for category
        const categoryRingMap = new Map<string, string>();
        matches.forEach((list, key) => {
            // Find base category key if split
            // Actually, we can just look up the match ring directly if report data has match IDs?
            // Report Generator output has 'bouts' strings.
            // We might need to enhance 'generatePlayerBoutData' or just do a lookup here.
            if (list.length > 0) categoryRingMap.set(key, list[0].ring || 'Unassigned');
        });

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

    return (
        <div className="max-w-6xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6 animate-fadeIn min-h-screen bg-gray-50">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium transition-colors self-start sm:self-auto"
                >
                    <ChevronLeft size={20} /> Back to Dashboard
                </button>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search name, category..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none"
                        />
                    </div>
                    <select
                        value={selectedClub}
                        onChange={(e) => setSelectedClub(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 outline-none focus:border-blue-300"
                    >
                        {clubs.map(club => (
                            <option key={club} value={club}>{club}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4 border-b">No.</th>
                                <th className="px-6 py-4 border-b">Category</th>
                                <th className="px-6 py-4 border-b">Ring</th>
                                <th className="px-6 py-4 border-b">Bout(s)</th>
                                <th className="px-6 py-4 border-b">Name</th>
                                <th className="px-6 py-4 border-b">Club</th>
                                <th className="px-6 py-4 border-b text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredData.length > 0 ? (
                                filteredData.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-gray-400">{index + 1}</td>
                                        <td className="px-6 py-4 font-medium text-blue-800">{item.category}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold text-gray-600 border border-gray-200">
                                                {item.ring}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.bouts.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {item.bouts.map((b, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold border border-blue-200">
                                                            {b}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">No bouts</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-800">{item.name}</td>
                                        <td className="px-6 py-4 text-gray-600">{item.club}</td>
                                        <td className="px-6 py-4 text-center">
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

            <AddPlayerModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={() => { }} />
        </div>
    );
};
