import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Globe, Shield, Lock, Save, ExternalLink } from 'lucide-react';
import { useTournament } from '../context/TournamentContext';

export const SharePage: React.FC = () => {
    const { tournamentId } = useTournament();

    // Links
    const baseUrl = window.location.origin;
    const publicUrl = `${baseUrl}/share/${tournamentId}/public`;
    const privateUrl = `${baseUrl}/share/${tournamentId}/private`;

    // State
    const [pin, setPin] = useState('123456');
    const [isEditingPin, setIsEditingPin] = useState(false);
    const [tempPin, setTempPin] = useState('');
    const [copiedPublic, setCopiedPublic] = useState(false);
    const [copiedPrivate, setCopiedPrivate] = useState(false);

    // Load PIN from storage
    useEffect(() => {
        if (tournamentId) {
            const savedPin = localStorage.getItem(`mtkd_pin_config_${tournamentId}`);
            if (savedPin) setPin(savedPin);
        }
    }, [tournamentId]);

    const handleCopy = (url: string, setCopied: (v: boolean) => void) => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSavePin = () => {
        if (tempPin.length < 4) {
            alert('PIN must be at least 4 digits');
            return;
        }
        setPin(tempPin);
        localStorage.setItem(`mtkd_pin_config_${tournamentId}`, tempPin);
        setIsEditingPin(false);
        alert('Tournament PIN Updated Successfully');
    };

    return (
        <div className="max-w-7xl mx-auto p-8 animate-fadeIn space-y-8 pb-20">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Share Center</h1>
                <p className="text-gray-500">Manage public access links, QR codes, and security settings.</p>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* PUBLIC CARD */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                                <Globe size={20} />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg">Public Spectator View</h2>
                                <p className="text-blue-100 text-xs">Read-only access for fans & audience</p>
                            </div>
                        </div>
                        <a href={publicUrl} target="_blank" rel="noreferrer" className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Open in new tab">
                            <ExternalLink size={20} />
                        </a>
                    </div>

                    <div className="p-8 flex flex-col items-center">
                        <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 mb-6">
                            <QRCodeCanvas
                                value={publicUrl}
                                size={220}
                                level={"H"}
                                includeMargin={true}
                            />
                        </div>

                        <div className="w-full bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center gap-3">
                            <input
                                type="text"
                                value={publicUrl}
                                readOnly
                                className="bg-transparent flex-1 text-sm text-gray-600 outline-none font-mono"
                            />
                            <button
                                onClick={() => handleCopy(publicUrl, setCopiedPublic)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${copiedPublic
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {copiedPublic ? 'Copied!' : 'Copy Link'}
                            </button>
                        </div>

                        <div className="mt-4 flex gap-2 text-xs text-gray-400">
                            <span className="px-2 py-1 bg-gray-100 rounded">Live Board</span>
                            <span className="px-2 py-1 bg-gray-100 rounded">Brackets</span>
                            <span className="px-2 py-1 bg-gray-100 rounded">Results</span>
                        </div>
                    </div>
                </div>

                {/* PRIVATE CARD */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                                <Shield size={20} />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg">Official Private Area</h2>
                                <p className="text-slate-300 text-xs">Restricted access for Judges & Staff</p>
                            </div>
                        </div>
                        <a href={privateUrl} target="_blank" rel="noreferrer" className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Open in new tab">
                            <ExternalLink size={20} />
                        </a>
                    </div>

                    <div className="p-8 flex flex-col items-center">
                        <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 mb-6 relative group">
                            <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[1px] flex items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                <span className="text-xs font-bold bg-white px-2 py-1 rounded shadow text-slate-900">PIN Required</span>
                            </div>
                            <QRCodeCanvas
                                value={privateUrl}
                                size={220}
                                level={"H"}
                                includeMargin={true}
                            />
                        </div>

                        <div className="w-full bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center gap-3 mb-6">
                            <input
                                type="text"
                                value={privateUrl}
                                readOnly
                                className="bg-transparent flex-1 text-sm text-gray-600 outline-none font-mono"
                            />
                            <button
                                onClick={() => handleCopy(privateUrl, setCopiedPrivate)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${copiedPrivate
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {copiedPrivate ? 'Copied!' : 'Copy Link'}
                            </button>
                        </div>

                        {/* PIN Management */}
                        <div className="w-full pt-6 border-t border-gray-100">
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <Lock size={16} className="text-amber-500" />
                                    Access PIN
                                </label>
                                {!isEditingPin ? (
                                    <button
                                        onClick={() => { setTempPin(pin); setIsEditingPin(true); }}
                                        className="text-xs text-blue-600 hover:underline font-medium"
                                    >
                                        Change PIN
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setIsEditingPin(false)}
                                            className="text-xs text-gray-500 hover:text-gray-700"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSavePin}
                                            className="text-xs text-green-600 font-bold hover:text-green-700 flex items-center gap-1"
                                        >
                                            <Save size={12} /> Save
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-4">
                                {isEditingPin ? (
                                    <input
                                        type="text"
                                        value={tempPin}
                                        onChange={(e) => setTempPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className="text-3xl font-mono font-bold text-gray-800 bg-yellow-50 border border-yellow-200 rounded px-4 py-2 w-full text-center outline-none focus:ring-2 focus:ring-yellow-400"
                                        placeholder="000000"
                                        autoFocus
                                    />
                                ) : (
                                    <div className="flex-1 text-center bg-gray-50 rounded-xl py-3 border border-gray-100">
                                        <span className="text-3xl font-mono font-bold text-gray-800 tracking-widest">
                                            {pin}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 mt-2 text-center">
                                All judges and staff will need this PIN to access the Private Area.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
