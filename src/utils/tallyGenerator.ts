import type { Participant, CategorySummary } from '../types';
import { extractAgeGroup } from './csvParser';

export const generateCategoryTally = (participants: Participant[]): CategorySummary[] => {
    const tallyMap = new Map<string, number>();

    participants.forEach(p => {
        const count = tallyMap.get(p.category_key) || 0;
        tallyMap.set(p.category_key, count + 1);
    });

    const summaries: CategorySummary[] = Array.from(tallyMap.entries()).map(([key, count]) => {
        // Extract age group from the key (which contains the category name)
        const ageGroup = extractAgeGroup(key).toString();
        return {
            category_key: key,
            count,
            ageGroup
        };
    });

    // Sort by age group ascending
    summaries.sort((a, b) => {
        const ageA = parseInt(a.ageGroup, 10);
        const ageB = parseInt(b.ageGroup, 10);
        return ageA - ageB;
    });

    return summaries;
};
