import React, { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Copy, X, Check, Globe, Shield, Smartphone } from 'lucide-react';
import { useTournament } from '../context/TournamentContext';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
    const { tournamentId } = useTournament();
    const [activeTab, setActiveTab] = useState<'public' | 'private'>('public');
    const [copied, setCopied] = useState(false);

    if (!isOpen || !tournamentId) return null;

    const baseUrl = window.location.origin;
    const publicUrl = `${baseUrl}/share/${tournamentId}/public`;
    const privateUrl = `${baseUrl}/share/${tournamentId}/private`;

    const currentUrl = activeTab === 'public' ? publicUrl : privateUrl;

    const handleCopy = () => {
        navigator.clipboard.writeText(currentUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800">Share Tournament</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-50 p-1 m-4 rounded-xl border border-gray-200">
                    <button
                        onClick={() => setActiveTab('public')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'public'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:bg-gray-100'
                            }`}
                    >
                        <Globe size={16} />
                        Public View
                    </button>
                    <button
                        onClick={() => setActiveTab('private')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'private'
                                ? 'bg-white text-amber-600 shadow-sm'
                                : 'text-gray-500 hover:bg-gray-100'
                            }`}
                    >
                        <Shield size={16} />
                        Private Area
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col items-center text-center">
                    <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 mb-6">
                        <QRCodeCanvas
                            value={currentUrl}
                            size={200}
                            level={"H"}
                            includeMargin={true}
                        />
                    </div>

                    <h4 className="font-bold text-gray-800 mb-1">
                        {activeTab === 'public' ? 'Scan to Watch Live' : 'Scan for Officials'}
                    </h4>
                    <p className="text-sm text-gray-500 mb-6">
                        {activeTab === 'public'
                            ? 'Share this code with spectators for live results.'
                            : 'Secure access for Judges and Staff (PIN required).'}
                    </p>

                    {/* Copy Link */}
                    <div className="w-full flex items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <input
                            type="text"
                            value={currentUrl}
                            readOnly
                            className="bg-transparent flex-1 text-sm text-gray-600 outline-none"
                        />
                        <button
                            onClick={handleCopy}
                            className="p-2 bg-white rounded-lg shadow-sm border border-gray-100 hover:bg-blue-50 text-blue-600 transition-colors"
                        >
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-4 text-center">
                    <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                        <Smartphone size={12} />
                        Optimized for Mobile Devices
                    </p>
                </div>
            </div>
        </div>
    );
};
