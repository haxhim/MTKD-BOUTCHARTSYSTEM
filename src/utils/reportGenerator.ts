import type { Match, Participant } from '../types';

/**
 * Generates a list of bouts for each player.
 * Format: "PlayerName : Bout1 | Bout2 | ..."
 * 
 * @param participants List of all participants
 * @param matches Map of matches (key can be ring ID or category ID, values are arrays of Matches)
 * @returns A formatted string with each player's bouts on a new line
 */
export const generatePlayerBoutList = (
    participants: Participant[],
    matches: Map<string, Match[]>
): string => {
    // This function can rely on the structured data generator now to avoid duplication logic
    const data = generatePlayerBoutData(participants, matches);
    return data
        .filter(d => d.bouts.length > 0)
        .map(d => `${d.name} : ${d.boutString}`)
        .join('\n');
};

export interface PlayerBoutData {
    id: string;
    name: string;
    club: string;
    bouts: string[];
    boutString: string;
}

/**
 * Generates structured data for the Master Bout List.
 * Includes all potential future bouts for each player by traversing the bracket tree.
 * Adds (Red) or (Blue) indication.
 */
export const generatePlayerBoutData = (
    participants: Participant[],
    matches: Map<string, Match[]>
): PlayerBoutData[] => {
    // 1. Flatten all matches into a single Map for easy lookup by ID
    const matchMap = new Map<string, Match>();
    matches.forEach((matchList) => {
        matchList.forEach(m => {
            matchMap.set(m.id, m);
        });
    });

    // 2. Map to store bouts for each participant ID
    const playerBouts = new Map<string, Set<string>>();

    participants.forEach(p => {
        playerBouts.set(p.id, new Set());
    });

    // 3. Find initial matches for each player and traverse
    matches.forEach((matchList) => {
        matchList.forEach(match => {
            if (!match.bout_number) return;

            // Check if player is directly in this match and traverse forward
            if (match.red && typeof match.red !== 'string') {
                const pId = match.red.id;
                collectFutureBouts(pId, match, matchMap, playerBouts, 'Red');
            }
            if (match.blue && typeof match.blue !== 'string') {
                const pId = match.blue.id;
                collectFutureBouts(pId, match, matchMap, playerBouts, 'Blue');
            }
        });
    });

    return participants.map(p => {
        const boutsSet = playerBouts.get(p.id);
        const bouts = boutsSet ? Array.from(boutsSet) : [];

        // Sort bouts numerically
        bouts.sort((a, b) => {
            const boutA = a.split(' ')[0];
            const boutB = b.split(' ')[0];
            return boutA.localeCompare(boutB, undefined, { numeric: true });
        });

        return {
            id: p.id,
            name: p.name,
            club: p.club,
            bouts,
            boutString: bouts.join(' | ')
        };
    });
};

/**
 * Recursively collects bout numbers for a player starting from a given match.
 */
const collectFutureBouts = (
    playerId: string,
    currentMatch: Match,
    matchMap: Map<string, Match>,
    playerBouts: Map<string, Set<string>>,
    side?: 'Red' | 'Blue'
) => {
    const bouts = playerBouts.get(playerId);
    if (!bouts) return;

    // Add current match's bout number with side
    if (currentMatch.bout_number && currentMatch.bout_number !== '0') {
        const boutLabel = side ? `${currentMatch.bout_number} (${side})` : currentMatch.bout_number;
        bouts.add(boutLabel);
    }

    // Traverse to next match if it exists
    if (currentMatch.nextMatchId) {
        const nextMatch = matchMap.get(currentMatch.nextMatchId);
        if (nextMatch) {
            // Determine side in next match
            let nextSide: 'Red' | 'Blue' | undefined;

            // If current match is the left child of next match -> Red
            if (nextMatch.leftChildId === currentMatch.id) {
                nextSide = 'Red';
            }
            // If current match is the right child of next match -> Blue
            else if (nextMatch.rightChildId === currentMatch.id) {
                nextSide = 'Blue';
            }

            collectFutureBouts(playerId, nextMatch, matchMap, playerBouts, nextSide);
        }
    }
};
