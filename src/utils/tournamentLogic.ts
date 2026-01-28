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
