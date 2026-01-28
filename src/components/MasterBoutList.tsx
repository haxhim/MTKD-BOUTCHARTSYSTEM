import React, { useState, useMemo, useEffect } from 'react';
import { useTournament } from '../context/TournamentContext';
import { generatePlayerBoutData } from '../utils/reportGenerator';
import { seedParticipants } from '../utils/seedingAlgorithm';
import { generateMatches, assignBoutNumbers } from '../utils/matchGenerator';
import type { Match, Participant } from '../types';
import { ChevronLeft, UserPlus, Search, Filter } from 'lucide-react';

import { AddPlayerModal } from './AddPlayerModal';

interface MasterBoutListProps {
    onBack: () => void;
}

export const MasterBoutList: React.FC<MasterBoutListProps> = ({ onBack }) => {
    const { participants, matches, setMatches, rings } = useTournament();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClub, setSelectedClub] = useState<string>('All');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Generate matches if they don't exist, OR re-assign numbers if rings change
    useEffect(() => {
        if (participants.length === 0) return;

        if (matches.size === 0) {
            // Case 1: No matches yet. Generate from scratch.
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
                const catMatches = generateMatches(seeded, catKey, ringId);
                newMatches.set(catKey, catMatches);
            });

            assignBoutNumbers(rings, newMatches);
            setMatches(newMatches);
        } else {
            // Case 2: Matches exist. We must re-assign bout numbers in case rings changed.
            // assignBoutNumbers mutates the match objects in place. 
            // We create a new Map reference to ensure React detects the change if needed, 
            // though deep mutation might be missed if we don't be careful. 
            // Since we want to update the view, calling setMatches with a new Map is good practice.

            const updatedMatches = new Map(matches);
            assignBoutNumbers(rings, updatedMatches);

            // We only need to setMatches if something actually changed, but for now 
            // it's safer to ensure they are consistent with Ring assignments.
            // To avoid infinite loops, we should probably check if we actually *need* to update,
            // but assignBoutNumbers is fast enough. 
            // HOWEVER, simply calling setMatches in useEffect dependent on 'rings' is fine,
            // but if 'matches' is also a dependency, we might loop.
            // 'matches.size' is stable. 'matches' ref might change.
            // let's rely on rings changing.

            // Actually, we can just do it. But we need to avoid the infinite loop if we put 'matches' in dependency.
            // The previous code had [participants, rings, matches.size, setMatches].
            // If we omit 'matches' (the map itself) from deps, we are okay.

            setMatches(updatedMatches);
        }
    }, [participants, rings, matches.size, setMatches]);

    // Generate data only when participants or matches change
    const tableData = useMemo(() => {
        return generatePlayerBoutData(participants, matches);
    }, [participants, matches]);

    // Extract unique clubs for the filter dropdown
    const clubs = useMemo(() => {
        const uniqueClubs = Array.from(new Set(participants.map(p => p.club))).sort();
        return ['All', ...uniqueClubs];
    }, [participants]);

    // Filter data based on search and club selection
    const filteredData = useMemo(() => {
        return tableData.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesClub = selectedClub === 'All' || item.club === selectedClub;
            return matchesSearch && matchesClub;
        });
    }, [tableData, searchTerm, selectedClub]);

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex justify-between items-center">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium transition-colors group"
                >
                    <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                </button>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-200 font-semibold flex items-center gap-2"
                    >
                        <UserPlus size={18} />
                        Add Player
                    </button>
                    <h1 className="text-xl font-bold text-gray-800">Participants List</h1>
                </div>
            </div>

            <AddPlayerModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    // Logic to maybe refresh or show toast? 
                    // Matches/State update automatically via Context
                }}
            />

            {/* Filters Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search Input */}
                    <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Search Player</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Enter player name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-50 transition-all outline-none placeholder:text-gray-400"
                            />
                        </div>
                    </div>

                    {/* Club Filter */}
                    <div className="w-full md:w-64">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Filter by Club</label>
                        <div className="relative">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <select
                                value={selectedClub}
                                onChange={(e) => setSelectedClub(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-50 transition-all outline-none appearance-none cursor-pointer"
                            >
                                {clubs.map(club => (
                                    <option key={club} value={club}>{club}</option>
                                ))}
                            </select>
                            <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gradient-to-r from-gray-50 to-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">Club</th>
                                <th className="px-6 py-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">Bout Numbers</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredData.length > 0 ? (
                                filteredData.map((player, index) => (
                                    <tr
                                        key={player.id}
                                        className="hover:bg-blue-50/30 transition-colors"
                                        style={{ animationDelay: `${index * 20}ms` }}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg flex items-center justify-center text-gray-500 font-semibold text-sm border border-gray-200">
                                                    {player.name.charAt(0)}
                                                </div>
                                                <span className="font-medium text-gray-800">{player.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{player.club}</td>
                                        <td className="px-6 py-4">
                                            {player.boutString ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {player.boutString.split(', ').map((bout, i) => (
                                                        <span
                                                            key={i}
                                                            className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-100"
                                                        >
                                                            {bout}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic text-sm">No bouts assigned</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center">
                                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                            <Search className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <p className="text-gray-500 font-medium">No players found</p>
                                        <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filter criteria</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                        Showing <span className="font-semibold text-gray-700">{filteredData.length}</span> of <span className="font-semibold text-gray-700">{tableData.length}</span> players
                    </span>
                </div>
            </div>
        </div>
    );
};
