import React, { useState } from 'react';
import { Lock } from 'lucide-react';

interface PinEntryProps {
    onSuccess: () => void;
    correctPin?: string; // Optional if we validate against context
}

export const PinEntry: React.FC<PinEntryProps> = ({ onSuccess, correctPin = '123456' }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    const handleDigit = (digit: string) => {
        if (pin.length < 6) {
            const newPin = pin + digit;
            setPin(newPin);
            setError('');

            // Auto-submit on 6th digit
            if (newPin.length === 6) {
                validate(newPin);
            }
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
        setError('');
    };

    const validate = (inputPin: string) => {
        if (inputPin === correctPin) {
            onSuccess();
        } else {
            setError('Incorrect PIN');
            setPin('');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center animate-fadeIn">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
                    <Lock size={32} />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Private Access</h1>
                <p className="text-gray-500 mb-8">Enter the tournament PIN to continue</p>

                {/* PIN Dots */}
                <div className="flex justify-center gap-3 mb-8">
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className={`w-4 h-4 rounded-full transition-all duration-300 ${i < pin.length
                                ? 'bg-blue-600 scale-110'
                                : 'bg-gray-200'
                                } ${error ? 'bg-red-400 animate-shake' : ''}`}
                        />
                    ))}
                </div>

                {error && <p className="text-red-500 text-sm font-medium mb-4 animate-shake">{error}</p>}

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                            key={num}
                            onClick={() => handleDigit(num.toString())}
                            className="h-14 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-xl font-bold text-gray-700 transition-colors"
                        >
                            {num}
                        </button>
                    ))}
                    <div />
                    <button
                        onClick={() => handleDigit('0')}
                        className="h-14 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-xl font-bold text-gray-700 transition-colors"
                    >
                        0
                    </button>
                    <button
                        onClick={handleDelete}
                        className="h-14 rounded-xl hover:bg-red-50 active:bg-red-100 text-gray-500 hover:text-red-500 flex items-center justify-center transition-colors"
                    >
                        ←
                    </button>
                </div>
            </div>
        </div>
    );
};
