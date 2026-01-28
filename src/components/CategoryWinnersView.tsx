import React, { useState, useMemo } from 'react';
import { usePodiumResults } from '../hooks/usePodiumResults';
import { ChevronLeft, Download, Filter, Medal, Trophy } from 'lucide-react';
import { useTournament } from '../context/TournamentContext';

export const CategoryWinnersView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { podiums } = usePodiumResults();
    const { rings } = useTournament();
    const [selectedRings, setSelectedRings] = useState<string[]>([]);

    // 1. Calculate Club Standings
    const clubStandings = useMemo(() => {
        const stats = new Map<string, { gold: number; silver: number; bronze: number }>();

        podiums.forEach(p => {
            // Gold
            if (p.gold && p.gold.club) {
                const current = stats.get(p.gold.club) || { gold: 0, silver: 0, bronze: 0 };
                stats.set(p.gold.club, { ...current, gold: current.gold + 1 });
            }
            // Silver
            if (p.silver && p.silver.club) {
                const current = stats.get(p.silver.club) || { gold: 0, silver: 0, bronze: 0 };
                stats.set(p.silver.club, { ...current, silver: current.silver + 1 });
            }
            // Bronze
            p.bronze.forEach(b => {
                if (b && b.club) {
                    const current = stats.get(b.club) || { gold: 0, silver: 0, bronze: 0 };
                    stats.set(b.club, { ...current, bronze: current.bronze + 1 });
                }
            });
        });

        return Array.from(stats.entries())
            .map(([club, counts]) => ({ club, ...counts }))
            .sort((a, b) => {
                if (b.gold !== a.gold) return b.gold - a.gold;
                if (b.silver !== a.silver) return b.silver - a.silver;
                return b.bronze - a.bronze;
            });
    }, [podiums]);

    // 2. Filter Podiums
    const filteredPodiums = useMemo(() => {
        if (selectedRings.length === 0) return podiums;
        return podiums.filter(p => selectedRings.some(ringName => p.lastRing === ringName));
    }, [podiums, selectedRings]);

    // 3. Export CSV
    const handleExportCSV = () => {
        const headers = ['Category', 'Ring', 'Gold Name', 'Gold Club', 'Silver Name', 'Silver Club', 'Bronze 1 Name', 'Bronze 1 Club', 'Bronze 2 Name', 'Bronze 2 Club'];
        const rows = filteredPodiums.map(p => [
            p.category,
            p.lastRing,
            p.gold?.name || '',
            p.gold?.club || '',
            p.silver?.name || '',
            p.silver?.club || '',
            p.bronze[0]?.name || '',
            p.bronze[0]?.club || '',
            p.bronze[1]?.name || '',
            p.bronze[1]?.club || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `tournament_medal_standings_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const toggleRing = (ringName: string) => {
        setSelectedRings(prev =>
            prev.includes(ringName)
                ? prev.filter(r => r !== ringName)
                : [...prev, ringName]
        );
    };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-fadeIn pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-medium transition-colors mb-2 text-sm"
                    >
                        <ChevronLeft size={16} />
                        Back to Dashboard
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Medal className="text-amber-500" />
                        Medal Standings
                    </h1>
                </div>
                <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 transition-colors text-sm font-semibold"
                >
                    <Download size={16} />
                    Export CSV
                </button>
            </div>

            {/* Top Clubs Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {clubStandings.slice(0, 3).map((club, idx) => (
                    <div key={club.club} className={`bg-white p-4 rounded-xl border shadow-sm relative overflow-hidden ${idx === 0 ? 'border-amber-200 shadow-amber-100' : 'border-gray-200'}`}>
                        {idx === 0 && <div className="absolute top-0 right-0 p-2 bg-amber-100 text-amber-600 rounded-bl-xl text-xs font-bold">#1 Champion</div>}
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-md ${idx === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                                    idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500' :
                                        'bg-gradient-to-br from-orange-300 to-orange-500'
                                }`}>
                                {idx + 1}
                            </div>
                            <h3 className="font-bold text-gray-800 truncate flex-1" title={club.club}>{club.club}</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="bg-amber-50 p-2 rounded-lg border border-amber-100">
                                <div className="font-bold text-amber-600 text-lg">{club.gold}</div>
                                <div className="text-amber-700/60 uppercase">Gold</div>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <div className="font-bold text-slate-600 text-lg">{club.silver}</div>
                                <div className="text-slate-700/60 uppercase">Silver</div>
                            </div>
                            <div className="bg-orange-50 p-2 rounded-lg border border-orange-100">
                                <div className="font-bold text-orange-600 text-lg">{club.bronze}</div>
                                <div className="text-orange-700/60 uppercase">Bronze</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm font-semibold">
                    <Filter size={16} />
                    Filter by Ring:
                </div>
                <div className="flex flex-wrap gap-2">
                    {rings.map(r => (
                        <button
                            key={r.id}
                            onClick={() => toggleRing(r.name)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedRings.includes(r.name)
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                }`}
                        >
                            {r.name}
                        </button>
                    ))}
                    {selectedRings.length > 0 && (
                        <button
                            onClick={() => setSelectedRings([])}
                            className="text-xs text-red-500 hover:underline px-2"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 min-w-[150px]">Category</th>
                                <th className="px-4 py-3 min-w-[200px] text-amber-600 bg-amber-50/30">Gold</th>
                                <th className="px-4 py-3 min-w-[200px] text-slate-600 bg-slate-50/30">Silver</th>
                                <th className="px-4 py-3 min-w-[250px] text-orange-600 bg-orange-50/30">Bronze 1 & 2</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredPodiums.map((podium) => (
                                <tr key={podium.category} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-800">
                                        <div>{podium.category}</div>
                                        <div className="text-xs text-blue-500 font-normal mt-0.5">{podium.lastRing}</div>
                                    </td>
                                    {/* Gold */}
                                    <td className="px-4 py-3 bg-amber-50/10">
                                        {podium.gold ? (
                                            <div>
                                                <div className="font-bold text-gray-800">{podium.gold.name}</div>
                                                <div className="text-xs text-gray-500">{podium.gold.club}</div>
                                            </div>
                                        ) : <span className="text-gray-300">-</span>}
                                    </td>
                                    {/* Silver */}
                                    <td className="px-4 py-3 bg-slate-50/10">
                                        {podium.silver ? (
                                            <div>
                                                <div className="font-bold text-gray-800">{podium.silver.name}</div>
                                                <div className="text-xs text-gray-500">{podium.silver.club}</div>
                                            </div>
                                        ) : <span className="text-gray-300">-</span>}
                                    </td>
                                    {/* Bronze */}
                                    <td className="px-4 py-3 bg-orange-50/10">
                                        <div className="flex flex-col gap-2">
                                            {podium.bronze.length > 0 ? (
                                                podium.bronze.map((b, i) => (
                                                    <div key={i} className="flex flex-col">
                                                        <span className="font-bold text-gray-800">{b.name}</span>
                                                        <span className="text-xs text-gray-500">{b.club}</span>
                                                    </div>
                                                ))
                                            ) : <span className="text-gray-300">-</span>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredPodiums.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">
                                        No results found based on current filters.
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
