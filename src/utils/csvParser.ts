import type { Participant } from '../types';
import { generateId } from './uuid';

export const parseCSV = (csvContent: string): Participant[] => {
    const lines = csvContent.trim().split('\n');
    const participants: Participant[] = [];

    // Skip header if present (simple check)
    let startIndex = 0;
    if (lines[0].toLowerCase().includes('name') && lines[0].toLowerCase().includes('club')) {
        startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Handle CSV splitting (basic comma separation, assuming no commas in fields for now)
        const columns = line.split(',').map(col => col.trim());

        if (columns.length >= 4) {
            const name = columns[0];
            const club = columns[1];
            const category = columns[2];
            const gender = columns[3];

            const category_key = `${category} ${gender}`;

            participants.push({
                id: generateId(),
                name,
                club,
                category,
                gender,
                category_key
            });
        }
    }

    return participants;
};

export const extractAgeGroup = (category: string): number => {
    // Extract the first number found in the category string for sorting
    // e.g., "15-17 BANTAM" -> 15
    const match = category.match(/\d+/);
    return match ? parseInt(match[0], 10) : 999;
};
