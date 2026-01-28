import React, { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import { CSVUploader } from './CSVUploader';
import { RingAssignment } from './RingAssignment';
import { BracketView } from './BracketView';
import { RingMatchView } from './RingMatchView';
import { MasterBoutList } from './MasterBoutList';
import { AddPlayerModal } from './AddPlayerModal';
import { JudgeInterface } from './JudgeInterface';
import { WinnersView } from './WinnersView';
import { Sidebar } from './Sidebar';
import { ResetModal, type ResetScope } from './ResetModal';
import { useToast } from './Toast';
import { supabase } from '../lib/supabase';
import { Search, Save, UserPlus, Play, Menu, RotateCcw, Loader2 } from 'lucide-react';

import { SharePage } from '../pages/SharePage';
import { CategoryWinnersView } from './CategoryWinnersView';

// Define ViewState locally since it was removed from Sidebar
export type ViewState = 'dashboard' | 'rings' | 'brackets' | 'ring_matches' | 'master_list' | 'judge' | 'winners' | 'share' | 'medals';

export const Dashboard: React.FC = () => {
    const {
        categorySummaries,
        participants,
        resetData,
        resetParticipants,
        resetRings,
        resetBrackets,
        resetMatchResults,
        tournamentName,
        saveData,
        exitTournament,
        rings,
        matches,
        isSaving
    } = useTournament();
    const { showToast } = useToast();
    const [view, setView] = useState<ViewState>('dashboard');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };

    const handleSave = async () => {
        showToast('Saving tournament data...', 'loading', 0);
        try {
            await saveData();
            showToast('Tournament saved successfully!', 'success', 3000);
        } catch {
            showToast('Failed to save tournament', 'error', 5000);
        }
    };

    const handleReset = async (scope: ResetScope) => {
        showToast(`Resetting ${scope}...`, 'loading', 0);
        try {
            switch (scope) {
                case 'all':
                    await resetData();
                    break;
                case 'participants':
                    await resetParticipants();
                    break;
                case 'rings':
                    await resetRings();
                    break;
                case 'brackets':
                    await resetBrackets();
                    break;
                case 'matches':
                case 'results':
                    await resetMatchResults();
                    break;
            }
            showToast(`${scope.charAt(0).toUpperCase() + scope.slice(1)} reset successfully!`, 'success', 3000);
        } catch {
            showToast(`Failed to reset ${scope}`, 'error', 5000);
        }
    };

    const renderContent = () => {
        if (participants.length === 0 && view === 'dashboard') {
            return (
                <div className="h-full flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12">
                    <div className="bg-white/80 backdrop-blur-sm p-6 sm:p-8 lg:p-10 rounded-xl sm:rounded-2xl shadow-xl shadow-gray-200/50 border border-white max-w-2xl w-full text-center">
                        <div className="w-14 sm:w-20 h-14 sm:h-20 bg-gradient-to-br from-blue-100 to-blue-50 text-blue-500 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg shadow-blue-100">
                            <svg className="w-7 sm:w-10 h-7 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Setup Your Tournament</h2>
                        <p className="text-gray-500 text-sm sm:text-base mb-6 sm:mb-8">Upload a CSV file with participant data to begin managing your tournament.</p>
                        <CSVUploader />
                    </div>
                </div>
            );
        }

        switch (view) {
            case 'rings':
                return <RingAssignment onBack={() => setView('dashboard')} />;
            case 'brackets':
                return <BracketView onBack={() => setView('dashboard')} />;
            case 'ring_matches':
                return <RingMatchView onBack={() => setView('dashboard')} />;
            case 'master_list':
                return <MasterBoutList onBack={() => setView('dashboard')} />;
            case 'judge':
                return <JudgeInterface onBack={() => setView('dashboard')} />;
            case 'winners':
                return <WinnersView onBack={() => setView('dashboard')} />;
            case 'share':
                return <SharePage />; // Wait, SharePage wasn't imported in Dashboard. Let's stick to the pattern.
            case 'medals':
                return <CategoryWinnersView onBack={() => setView('dashboard')} />;
            case 'dashboard':
            default:
                return renderHomeDashboard();
        }
    };

    const renderHomeDashboard = () => (
        <div className="space-y-4 sm:space-y-6 animate-fadeIn">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                <StatCard label="Total Participants" value={participants.length} color="blue" icon="users" />
                <StatCard label="Categories" value={categorySummaries.length} color="indigo" icon="grid" />
                <StatCard label="Active Rings" value={rings.length} color="amber" icon="ring" />
                <StatCard label="Total Matches" value={Array.from(matches.values()).reduce((acc, list) => acc + list.length, 0)} color="emerald" icon="swords" />
            </div>

            {/* Quick Actions & Category Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Category Statistics Table */}
                <div className="lg:col-span-2 bg-white rounded-xl sm:rounded-2xl shadow-sm shadow-gray-200/50 border border-gray-100 overflow-hidden">
                    <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50/80 to-transparent">
                        <h3 className="font-semibold text-gray-800 text-sm sm:text-base">Category Statistics</h3>
                        {participants.length > 0 && (
                            <button
                                onClick={() => setIsResetModalOpen(true)}
                                className="text-[10px] sm:text-xs text-gray-400 hover:text-red-500 font-medium transition-colors flex items-center gap-1 touch-target"
                            >
                                <RotateCcw className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                                <span className="hidden sm:inline">Reset Data</span>
                            </button>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50/50 text-gray-500 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 sm:px-6 py-2.5 sm:py-3">Category</th>
                                    <th className="px-4 sm:px-6 py-2.5 sm:py-3 text-right">Participants</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {categorySummaries.map((summary, index) => (
                                    <tr key={summary.category_key} className="hover:bg-blue-50/30 transition-colors" style={{ animationDelay: `${index * 30}ms` }}>
                                        <td className="px-4 sm:px-6 py-3 sm:py-3.5 text-gray-700 font-medium text-xs sm:text-sm">{summary.category_key}</td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-3.5 text-right">
                                            <span className="inline-flex items-center justify-center min-w-[1.5rem] sm:min-w-[2rem] px-1.5 sm:px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-semibold text-[10px] sm:text-xs">
                                                {summary.count}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {categorySummaries.length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="px-4 sm:px-6 py-6 sm:py-8 text-center text-gray-400 text-xs sm:text-sm">
                                            No categories yet. Upload participant data to begin.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Actions Panel */}
                <div className="space-y-4 sm:space-y-5">
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm shadow-gray-200/50 border border-gray-100 p-4 sm:p-6">
                        <h3 className="font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            Quick Actions
                        </h3>
                        <div className="space-y-2 sm:space-y-3">
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="w-full py-2.5 sm:py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg sm:rounded-xl font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-[0.98] flex items-center justify-center gap-2 text-sm sm:text-base touch-target"
                            >
                                <UserPlus size={16} className="sm:w-[18px] sm:h-[18px]" />
                                Add Player
                            </button>
                            <button
                                onClick={() => setView('judge')}
                                className="w-full py-2.5 sm:py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg sm:rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-200 active:scale-[0.98] flex items-center justify-center gap-2 text-sm sm:text-base touch-target"
                            >
                                <Play size={16} className="sm:w-[18px] sm:h-[18px]" />
                                Launch Judge Mode
                            </button>
                        </div>
                    </div>

                    {/* Tips Card */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-blue-100">
                        <h4 className="font-semibold text-blue-800 mb-1.5 sm:mb-2 text-xs sm:text-sm">💡 Quick Tip</h4>
                        <p className="text-blue-700 text-xs sm:text-sm leading-relaxed">
                            Assign categories to rings before generating brackets for optimal bout scheduling.
                        </p>
                    </div>
                </div>
            </div>

            <AddPlayerModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => { }}
            />

            <ResetModal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                onReset={handleReset}
            />
        </div>
    );

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 font-sans text-gray-900">
            {/* Sidebar Navigation */}
            <Sidebar
                onLogout={handleLogout}
                onExit={exitTournament}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-h-screen lg:h-screen overflow-hidden">
                {/* Top Header */}
                <header className="h-14 sm:h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-3 sm:px-4 lg:px-8 sticky top-0 z-30 shadow-sm shadow-gray-100/50">
                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors touch-target"
                        >
                            <Menu size={22} className="text-gray-600" />
                        </button>

                        <h2 className="text-sm sm:text-lg font-bold text-gray-800 truncate max-w-[120px] sm:max-w-none">{tournamentName || 'Untitled Tournament'}</h2>
                        <span className="hidden sm:flex px-2 sm:px-2.5 py-0.5 sm:py-1 bg-emerald-50 text-emerald-600 text-[10px] sm:text-xs rounded-full font-semibold border border-emerald-100 items-center gap-1 sm:gap-1.5">
                            <span className="w-1 sm:w-1.5 h-1 sm:h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            Live
                        </span>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-200 active:scale-[0.98] flex items-center gap-1.5 sm:gap-2 touch-target disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <Loader2 size={14} className="sm:w-4 sm:h-4 animate-spin" />
                            ) : (
                                <Save size={14} className="sm:w-4 sm:h-4" />
                            )}
                            <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
                        </button>

                        <div className="relative hidden md:block">
                            <Search className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                placeholder="Search players..."
                                className="pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-50 rounded-lg sm:rounded-xl text-xs sm:text-sm w-36 sm:w-48 lg:w-64 transition-all outline-none placeholder:text-gray-400"
                            />
                        </div>

                        <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center text-gray-600 font-bold text-[10px] sm:text-xs border border-gray-200 shadow-sm">
                            AD
                        </div>
                    </div>
                </header>

                {/* Scrollable Workspace */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

interface StatCardProps {
    label: string;
    value: string | number;
    color: string;
    icon: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color, icon }) => {
    const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
        blue: { bg: 'from-blue-50 to-blue-50/50', text: 'text-blue-600', iconBg: 'from-blue-500 to-blue-600' },
        indigo: { bg: 'from-indigo-50 to-indigo-50/50', text: 'text-indigo-600', iconBg: 'from-indigo-500 to-indigo-600' },
        amber: { bg: 'from-amber-50 to-amber-50/50', text: 'text-amber-600', iconBg: 'from-amber-500 to-amber-600' },
        emerald: { bg: 'from-emerald-50 to-emerald-50/50', text: 'text-emerald-600', iconBg: 'from-emerald-500 to-emerald-600' },
    };

    const iconMap: Record<string, React.ReactNode> = {
        users: <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
        grid: <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
        ring: <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>,
        swords: <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    };

    const colors = colorMap[color] || colorMap.blue;

    return (
        <div className={`bg-gradient-to-br ${colors.bg} p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-white shadow-sm shadow-gray-200/50 flex items-start gap-2 sm:gap-4 transition-all hover:shadow-md`}>
            <div className={`w-9 sm:w-12 h-9 sm:h-12 bg-gradient-to-br ${colors.iconBg} rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-lg shrink-0`}>
                {iconMap[icon]}
            </div>
            <div className="flex flex-col min-w-0">
                <span className="text-gray-500 text-[10px] sm:text-xs font-medium mb-0.5 sm:mb-1 truncate">{label}</span>
                <span className={`text-xl sm:text-2xl font-bold ${colors.text}`}>{value}</span>
            </div>
        </div>
    );
};
