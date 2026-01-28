import React from 'react';
import { usePodiumResults } from '../hooks/usePodiumResults';
import { ChevronLeft, Printer, Trophy, Medal } from 'lucide-react';

export const WinnersView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { podiums } = usePodiumResults();

    return (
        <div className="max-w-7xl mx-auto p-6 bg-gradient-to-br from-gray-50 to-slate-50 min-h-screen animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 no-print">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium transition-colors group"
                >
                    <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                </button>
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-amber-500" />
                        Tournament Results
                    </h1>
                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2.5 bg-white text-gray-700 rounded-xl hover:bg-gray-50 border border-gray-200 transition-all font-medium flex items-center gap-2 shadow-sm"
                    >
                        <Printer size={18} />
                        Print Results
                    </button>
                </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {podiums.map((podium, index) => (
                    <div
                        key={podium.category}
                        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden break-inside-avoid hover:shadow-lg transition-shadow"
                        style={{ animationDelay: `${index * 30}ms` }}
                    >
                        {/* Category Header */}
                        <div className="bg-gradient-to-r from-gray-50 to-white px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 truncate pr-2 text-sm" title={podium.category}>{podium.category}</h3>
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100">
                                {podium.lastRing}
                            </span>
                        </div>

                        {/* Podium Positions */}
                        <div className="p-4 space-y-3">
                            {/* GOLD */}
                            <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-amber-50 to-amber-50/30 rounded-xl border border-amber-100 group hover:border-amber-200 transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white font-bold shadow-lg shadow-amber-200 shrink-0">
                                    <Medal size={20} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[10px] text-amber-600 font-semibold uppercase tracking-wider mb-0.5">Gold</div>
                                    <div className="font-bold text-gray-800 truncate">{podium.gold?.name || '—'}</div>
                                    <div className="text-xs text-gray-500 truncate">{podium.gold?.club || '—'}</div>
                                </div>
                            </div>

                            {/* SILVER */}
                            <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-slate-50 to-slate-50/30 rounded-xl border border-slate-200 group hover:border-slate-300 transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white font-bold shadow-lg shadow-slate-200 shrink-0">
                                    2
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Silver</div>
                                    <div className="font-bold text-gray-800 truncate">{podium.silver?.name || '—'}</div>
                                    <div className="text-xs text-gray-500 truncate">{podium.silver?.club || '—'}</div>
                                </div>
                            </div>

                            {/* BRONZE */}
                            {podium.bronze.length > 0 ? (
                                podium.bronze.map((b, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-orange-50 to-orange-50/30 rounded-xl border border-orange-100 group hover:border-orange-200 transition-colors">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-300 to-orange-400 flex items-center justify-center text-white font-bold shadow-lg shadow-orange-100 shrink-0">
                                            3
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[10px] text-orange-600 font-semibold uppercase tracking-wider mb-0.5">Bronze</div>
                                            <div className="font-bold text-gray-800 truncate">{b.name}</div>
                                            <div className="text-xs text-gray-500 truncate">{b.club}</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-orange-50/50 to-transparent rounded-xl border border-orange-100/50 opacity-50">
                                    <div className="w-10 h-10 rounded-xl bg-orange-200 flex items-center justify-center text-orange-400 font-bold shrink-0">
                                        3
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[10px] text-orange-400 font-semibold uppercase tracking-wider mb-0.5">Bronze</div>
                                        <div className="text-sm text-gray-400 italic">Not decided</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {podiums.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Trophy className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium text-lg">No results available yet</p>
                        <p className="text-gray-400 mt-1">Complete matches in the Judge Interface to see results</p>
                    </div>
                )}
            </div>
        </div>
    );
};
