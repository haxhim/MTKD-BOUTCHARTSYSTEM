import type { Match, Participant } from '../types';

export const advanceWinner = (
    matchesMap: Map<string, Match[]>,
    currentMatchId: string,
    winner: Participant | 'BYE'
): Map<string, Match[]> => {
    const newMatchesMap = new Map(matchesMap);

    // 1. Find the current match
    let currentMatch: Match | undefined;
    let categoryKey: string | undefined;

    for (const [key, matches] of newMatchesMap.entries()) {
        const found = matches.find(m => m.id === currentMatchId);
        if (found) {
            currentMatch = found;
            categoryKey = key;
            break;
        }
    }

    if (!currentMatch || !categoryKey) {
        console.error("Match not found:", currentMatchId);
        return matchesMap;
    }

    // 2. Update winner of current match
    // We need to update the object in the array. 
    // Since we cloned the Map but the arrays might be shared references if shallow copy,
    // let's be careful. `new Map(matchesMap)` is shallow copy of the Map (keys/values). 
    // The values (arrays) are same references.
    // For React state immutability, we should clone the array for this category.
    const catMatches = [...(newMatchesMap.get(categoryKey) || [])];
    const matchIndex = catMatches.findIndex(m => m.id === currentMatchId);
    if (matchIndex === -1) return matchesMap;

    const updatedCurrentMatch = { ...catMatches[matchIndex], winner };
    catMatches[matchIndex] = updatedCurrentMatch;

    // 3. Propagate to Next Match
    if (updatedCurrentMatch.nextMatchId) {
        const nextMatchIndex = catMatches.findIndex(m => m.id === updatedCurrentMatch.nextMatchId);
        if (nextMatchIndex !== -1) {
            const nextMatch = { ...catMatches[nextMatchIndex] };

            // Determine which slot to fill
            // nextMatch.leftChildId should be the ID of the feeder match on the RED side
            // nextMatch.rightChildId should be the ID of the feeder match on the BLUE side

            if (nextMatch.leftChildId === currentMatchId) {
                // Feeds into Red
                nextMatch.red = winner;
            } else if (nextMatch.rightChildId === currentMatchId) {
                // Feeds into Blue
                nextMatch.blue = winner;
            } else {
                console.warn("Could not determine slot for next match. Linkage might be broken.");
            }

            catMatches[nextMatchIndex] = nextMatch;
        }
    }

    newMatchesMap.set(categoryKey, catMatches);
    return newMatchesMap;
};

// --- Ring Queue Logic (Shared between Judge & Ring Views) ---

export interface RingQueueResult {
    allMatches: Match[];
    activeMatch: Match | null;
    pendingMatches: Match[];
    pendingCount: number;
}

const sortMatches = (matches: Match[]): Match[] => {
    return [...matches].sort((a, b) => {
        // Determine Bout Number Numeric Value for Sorting
        const valA = a.bout_number ? parseInt(a.bout_number.replace(/\D/g, '')) || 9999 : 9999;
        const valB = b.bout_number ? parseInt(b.bout_number.replace(/\D/g, '')) || 9999 : 9999;
        // If Equal (e.g. 9999), sort by ID or Round?
        if (valA !== valB) return valA - valB;
        // Secondary sort for Table Mode (Round 1 order) if no bout number
        if (a.is_table_mode && b.is_table_mode) return 0;
        return 0;
    });
};

const filterPendingMatches = (matches: Match[]): Match[] => {
    return matches.filter(m => {
        // Table Mode: Pending if Score is missing
        if (m.is_table_mode) return m.score === undefined;
        // Tree Mode: Pending if Winner missing AND players are ready
        return m.red && m.blue && m.red !== 'BYE' && m.blue !== 'BYE' && !m.winner;
    });
};

export const getRingQueue = (
    matchesMap: Map<string, Match[]>,
    targetRingId: string,
    allRings: { id: string, name: string }[]
): RingQueueResult => {
    const targetRing = allRings.find(r => r.id === targetRingId);
    const targetRingName = targetRing?.name;

    let ringMatches: Match[] = [];

    matchesMap.forEach((catMatches) => {
        catMatches.forEach(match => {
            if (!match.ring) return;
            // Check if this match belongs to the target ring
            // Match.ring might be ID or Name (handling both legacy & new)
            const isMatch = match.ring === targetRingId || (targetRingName && match.ring === targetRingName);
            if (isMatch) {
                ringMatches.push(match);
            }
        });
    });

    const sorted = sortMatches(ringMatches);
    const pending = filterPendingMatches(sorted);

    return {
        allMatches: sorted,
        activeMatch: pending.length > 0 ? pending[0] : null,
        pendingMatches: pending,
        pendingCount: pending.length
    };
};
