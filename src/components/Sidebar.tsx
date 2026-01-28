
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Swords,
    Trophy,
    Gavel,
    Network,
    FileSpreadsheet,
    LogOut,
    ArrowLeftRight,
    X
} from 'lucide-react';
import mtkdLogo from '../assets/mtkd-logo.webp';

interface SidebarProps {
    onLogout: () => void;
    onExit?: () => void;
    isOpen?: boolean;
    onClose?: () => void;
    tournamentId?: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLogout, onExit, isOpen = true, onClose, tournamentId }) => {
    const baseUrl = `/tournament/${tournamentId}`;

    const navItems = [
        { path: `${baseUrl}/overview`, label: 'Dashboard', icon: LayoutDashboard },
        { path: `${baseUrl}/participants`, label: 'Participants', icon: Users },
        { path: `${baseUrl}/rings`, label: 'Ring Assignment', icon: Network },
        { path: `${baseUrl}/brackets`, label: 'Brackets', icon: Swords },
        { path: `${baseUrl}/matches`, label: 'Match Control', icon: FileSpreadsheet },
        { path: `${baseUrl}/judge`, label: 'Judge Interface', icon: Gavel },
        { path: `${baseUrl}/winners`, label: 'Results & Podium', icon: Trophy },
    ] as const;

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-50
                w-64 bg-white border-r border-gray-100 flex flex-col min-h-screen h-screen shadow-xl lg:shadow-sm
                transform transition-transform duration-300 ease-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Brand Header */}
                <div className="p-4 lg:p-5 border-b border-gray-100 flex items-center justify-between">
                    <button
                        onClick={onExit}
                        className="flex items-center gap-2 lg:gap-3 flex-1 text-left hover:bg-gray-50 rounded-xl -ml-1 p-2 transition-all group"
                        title="Switch Tournament"
                    >
                        <div className="w-10 h-10 flex items-center justify-center">
                            <img src={mtkdLogo} alt="MTKD Logo" className="w-full h-full object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="font-bold text-gray-800 text-sm lg:text-base tracking-tight">MTKD Manager</h1>
                            <p className="text-[10px] lg:text-xs text-gray-400 group-hover:text-blue-500 transition-colors flex items-center gap-1">
                                <ArrowLeftRight size={10} />
                                Switch Tournament
                            </p>
                        </div>
                    </button>

                    {/* Mobile Close Button */}
                    <button
                        onClick={onClose}
                        className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-2 lg:p-3 space-y-1 overflow-y-auto">
                    <div className="px-3 py-2">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Menu</span>
                    </div>
                    {navItems.map((item) => {
                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={onClose}
                                className={({ isActive }) => `
                                    w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-2.5 rounded-xl transition-all duration-200 group text-sm font-medium touch-target
                                    ${isActive
                                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-200'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100'
                                    }
                                `}
                            >
                                {({ isActive }) => (
                                    <>
                                        <Icon
                                            size={18}
                                            className={`transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-blue-500'}`}
                                        />
                                        <span className="flex-1 text-left">{item.label}</span>
                                        {isActive && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/50"></div>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Footer Actions */}
                <div className="p-2 lg:p-3 border-t border-gray-100 space-y-1 bg-gray-50/50">
                    <button
                        onClick={() => { onExit?.(); onClose?.(); }}
                        className="w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 text-gray-500 hover:text-gray-700 hover:bg-white rounded-xl transition-all text-sm font-medium group touch-target"
                    >
                        <LogOut size={18} className="rotate-180 text-gray-400 group-hover:text-blue-500 transition-colors" />
                        <span>Switch Tournament</span>
                    </button>
                    <button
                        onClick={() => { onLogout(); onClose?.(); }}
                        className="w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all text-sm font-medium group touch-target"
                    >
                        <LogOut size={18} className="text-gray-400 group-hover:text-red-500 transition-colors" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>
        </>
    );
};
