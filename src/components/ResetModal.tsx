import React from 'react';
import { RotateCcw, Users, GitBranch, Target, Gavel, Trophy, X, AlertTriangle } from 'lucide-react';

export type ResetScope = 'all' | 'participants' | 'rings' | 'brackets' | 'matches' | 'results';

interface ResetOption {
    scope: ResetScope;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
}

const resetOptions: ResetOption[] = [
    {
        scope: 'participants',
        label: 'Participants',
        description: 'Remove all participants and their data',
        icon: <Users className="w-5 h-5" />,
        color: 'blue',
    },
    {
        scope: 'rings',
        label: 'Ring Assignments',
        description: 'Clear all ring configurations and category assignments',
        icon: <Target className="w-5 h-5" />,
        color: 'amber',
    },
    {
        scope: 'brackets',
        label: 'Brackets',
        description: 'Reset all bracket structures (keeps participants)',
        icon: <GitBranch className="w-5 h-5" />,
        color: 'indigo',
    },
    {
        scope: 'matches',
        label: 'Match Results',
        description: 'Clear all match winners (regenerate brackets)',
        icon: <Gavel className="w-5 h-5" />,
        color: 'purple',
    },
    {
        scope: 'results',
        label: 'Results & Podium',
        description: 'Clear final placements and winners',
        icon: <Trophy className="w-5 h-5" />,
        color: 'emerald',
    },
    {
        scope: 'all',
        label: 'Reset Everything',
        description: 'Clear all tournament data and start fresh',
        icon: <RotateCcw className="w-5 h-5" />,
        color: 'red',
    },
];

interface ResetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onReset: (scope: ResetScope) => void;
}

export const ResetModal: React.FC<ResetModalProps> = ({ isOpen, onClose, onReset }) => {
    const [selectedScope, setSelectedScope] = React.useState<ResetScope | null>(null);
    const [confirmText, setConfirmText] = React.useState('');

    if (!isOpen) return null;

    const selectedOption = resetOptions.find(o => o.scope === selectedScope);
    const isConfirmValid = confirmText.toLowerCase() === 'reset';

    const handleReset = () => {
        if (selectedScope && isConfirmValid) {
            onReset(selectedScope);
            setSelectedScope(null);
            setConfirmText('');
            onClose();
        }
    };

    const colorMap: Record<string, { bg: string; border: string; text: string; hoverBg: string }> = {
        blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', hoverBg: 'hover:bg-blue-100' },
        amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', hoverBg: 'hover:bg-amber-100' },
        indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600', hoverBg: 'hover:bg-indigo-100' },
        purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600', hoverBg: 'hover:bg-purple-100' },
        emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', hoverBg: 'hover:bg-emerald-100' },
        red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', hoverBg: 'hover:bg-red-100' },
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-fadeIn">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                            <RotateCcw className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Reset Tournament Data</h3>
                            <p className="text-xs text-gray-500">Select what you want to reset</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {!selectedScope ? (
                        <div className="grid gap-3">
                            {resetOptions.map((option) => {
                                const colors = colorMap[option.color];
                                return (
                                    <button
                                        key={option.scope}
                                        onClick={() => setSelectedScope(option.scope)}
                                        className={`flex items-center gap-4 p-4 rounded-xl border-2 ${colors.border} ${colors.bg} ${colors.hoverBg} transition-all text-left group`}
                                    >
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.text} bg-white shadow-sm`}>
                                            {option.icon}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className={`font-semibold ${colors.text}`}>{option.label}</h4>
                                            <p className="text-xs text-gray-500">{option.description}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center">
                            {/* Warning */}
                            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-800 mb-2">
                                Reset {selectedOption?.label}?
                            </h4>
                            <p className="text-gray-500 text-sm mb-6">
                                This action cannot be undone. Type <strong className="text-red-600">reset</strong> to confirm.
                            </p>
                            
                            <input
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="Type 'reset' to confirm"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center font-medium focus:border-red-300 focus:ring-4 focus:ring-red-50 outline-none transition-all mb-4"
                            />

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setSelectedScope(null);
                                        setConfirmText('');
                                    }}
                                    className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleReset}
                                    disabled={!isConfirmValid}
                                    className={`flex-1 py-2.5 px-4 rounded-xl font-semibold transition-all ${
                                        isConfirmValid
                                            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-200'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    Reset Now
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
