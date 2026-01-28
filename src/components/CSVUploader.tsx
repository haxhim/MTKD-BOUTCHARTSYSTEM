import React, { useState } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { parseCSV } from '../utils/csvParser';
import { generateCategoryTally } from '../utils/tallyGenerator';
import { useTournament } from '../context/TournamentContext';

export const CSVUploader: React.FC = () => {
    const { setParticipants, setCategorySummaries, saveData } = useTournament();
    const [error, setError] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async (file: File) => {
        if (!file) return;

        setIsUploading(true);
        setError(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target?.result as string;
            try {
                const parsedParticipants = parseCSV(content);
                if (parsedParticipants.length === 0) {
                    setError('No valid participants found in CSV.');
                    setIsUploading(false);
                    return;
                }

                setParticipants(parsedParticipants);
                const summaries = generateCategoryTally(parsedParticipants);
                setCategorySummaries(summaries);
                setError(null);

                // Persist immediately
                await saveData(parsedParticipants);
                setIsUploading(false);
            } catch (err) {
                setError('Failed to parse CSV. Please check the file format.');
                console.error(err);
                setIsUploading(false);
            }
        };
        reader.readAsText(file);
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) handleFileUpload(file);
    };

    const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        setIsDragOver(false);
        const file = event.dataTransfer.files?.[0];
        if (file && file.name.endsWith('.csv')) {
            handleFileUpload(file);
        } else {
            setError('Please upload a valid CSV file.');
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    return (
        <div className="w-full">
            <label
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
                    relative block p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all duration-200
                    ${isDragOver
                        ? 'border-blue-400 bg-blue-50 scale-[1.02]'
                        : 'border-gray-200 bg-gray-50/50 hover:border-blue-300 hover:bg-blue-50/30'}
                    ${isUploading ? 'pointer-events-none opacity-70' : ''}
                `}
            >
                <div className="flex flex-col items-center gap-4">
                    {isUploading ? (
                        <>
                            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
                                <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                            </div>
                            <span className="text-blue-600 font-semibold">Processing file...</span>
                        </>
                    ) : (
                        <>
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${isDragOver ? 'bg-blue-200' : 'bg-gradient-to-br from-blue-100 to-blue-50'}`}>
                                {isDragOver ? (
                                    <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                                ) : (
                                    <Upload className="w-8 h-8 text-blue-500" />
                                )}
                            </div>
                            <div>
                                <span className="text-lg font-semibold text-gray-700 block mb-1">
                                    {isDragOver ? 'Drop your file here' : 'Upload Tournament CSV'}
                                </span>
                                <span className="text-sm text-gray-400">
                                    Drag and drop or <span className="text-blue-500 hover:underline">browse files</span>
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
                                <FileSpreadsheet size={14} />
                                <span>Accepts .csv files only</span>
                            </div>
                        </>
                    )}
                </div>
                <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleInputChange}
                />
            </label>

            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-start gap-2">
                    <svg className="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
};
