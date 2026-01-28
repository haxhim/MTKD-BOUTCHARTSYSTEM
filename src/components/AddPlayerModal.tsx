import React, { useState, useMemo } from 'react';
import { X, UserPlus, Building2, Grid3X3 } from 'lucide-react';
import { useTournament } from '../context/TournamentContext';
import { generateId } from '../utils/uuid';
import { addLateParticipant } from '../utils/addPlayerLogic';
import type { Participant } from '../types';

interface AddPlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const AddPlayerModal: React.FC<AddPlayerModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { participants, setParticipants, matches, setMatches, rings, categorySummaries } = useTournament();

    // Form State
    const [name, setName] = useState('');
    const [club, setClub] = useState('');
    const [categoryKey, setCategoryKey] = useState('');
    const [error, setError] = useState('');

    // Derived lists
    const clubs = useMemo(() => {
        const unique = new Set(participants.map(p => p.club));
        return Array.from(unique).sort();
    }, [participants]);

    const categories = useMemo(() => {
        return categorySummaries.map(c => c.category_key).sort();
    }, [categorySummaries]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name || !club || !categoryKey) {
            setError('All fields are required.');
            return;
        }

        // Create new participant
        const newPlayer: Participant = {
            id: generateId(),
            name: name.toUpperCase(),
            club: club.toUpperCase(),
            category: categoryKey.split('-')[1]?.trim() || categoryKey, // Approximate category name vs key
            category_key: categoryKey,
            gender: categoryKey.includes('FEMALE') ? 'FEMALE' : 'MALE' // Heuristic
        };

        // Try to add to bracket
        const result = addLateParticipant(newPlayer, matches, rings);

        if (!result.success) {
            setError(result.message);
            return;
        }

        // Success: Update state
        setParticipants([...participants, newPlayer]);
        if (result.updatedMatches) {
            setMatches(result.updatedMatches);
        }

        // Reset and close
        setName('');
        setClub('');
        setCategoryKey('');
        onSuccess();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-slideIn">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Add Late Player</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {error && (
                        <div className="mb-5 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-start gap-2">
                            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name Field */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                <UserPlus size={16} className="text-gray-400" />
                                Player Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all text-gray-800 placeholder-gray-400"
                                placeholder="Enter full name..."
                                autoFocus
                            />
                        </div>

                        {/* Club Field */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                <Building2 size={16} className="text-gray-400" />
                                Club / Team
                            </label>
                            <div className="relative">
                                <input
                                    list="clubs-list"
                                    value={club}
                                    onChange={e => setClub(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all text-gray-800 placeholder-gray-400"
                                    placeholder="Select or type club name..."
                                />
                                <datalist id="clubs-list">
                                    {clubs.map(c => <option key={c} value={c} />)}
                                </datalist>
                            </div>
                        </div>

                        {/* Category Field */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                <Grid3X3 size={16} className="text-gray-400" />
                                Category
                            </label>
                            <select
                                value={categoryKey}
                                onChange={e => setCategoryKey(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all text-gray-800 cursor-pointer"
                            >
                                <option value="">Select a category...</option>
                                {categories.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                            >
                                <UserPlus size={18} />
                                Add Player
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
