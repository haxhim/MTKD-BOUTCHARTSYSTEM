import type { Participant, Match, Ring } from '../types';
import { generateId } from './uuid';

export const generateMatches = (
    seededParticipants: (Participant | 'BYE')[],
    _categoryKey: string,
    ringId: string
): Match[] => {
    const matches: Match[] = [];
    let currentRoundParticipants = seededParticipants;
    let roundNumber = 1;

    // Calculate total rounds
    const totalRounds = Math.log2(seededParticipants.length);

    // We'll store matches in layers.
    const rounds: Match[][] = [];

    while (currentRoundParticipants.length > 1) {
        const nextRoundParticipants: (Participant | 'BYE' | null)[] = [];
        const currentRoundMatches: Match[] = [];

        const roundName = getRoundName(roundNumber, totalRounds);

        for (let i = 0; i < currentRoundParticipants.length; i += 2) {
            const red = currentRoundParticipants[i];
            const blue = currentRoundParticipants[i + 1];

            const matchId = generateId();

            // Determine if we can auto-advance (if one is BYE)
            let winner: Participant | 'BYE' | undefined = undefined;
            if (red === 'BYE' && blue !== 'BYE' && blue !== null) {
                winner = blue;
            } else if (blue === 'BYE' && red !== 'BYE' && red !== null) {
                winner = red;
            } else if (red === 'BYE' && blue === 'BYE') {
                winner = 'BYE';
            }

            const match: Match = {
                id: matchId,
                bout_number: '', // Assigned later
                red: red,
                blue: blue,
                round: roundName,
                ring: ringId,
                winner: winner
            };

            currentRoundMatches.push(match);
            matches.push(match);

            nextRoundParticipants.push(winner || null);
        }

        rounds.push(currentRoundMatches);
        currentRoundParticipants = nextRoundParticipants as any;
        roundNumber++;
    }

    // Link matches (nextMatchId)
    for (let r = 0; r < rounds.length - 1; r++) {
        const currentRound = rounds[r];
        const nextRound = rounds[r + 1];

        for (let i = 0; i < currentRound.length; i++) {
            const currentMatch = currentRound[i];
            const nextMatchIndex = Math.floor(i / 2);
            const nextMatch = nextRound[nextMatchIndex];

            currentMatch.nextMatchId = nextMatch.id;

            if (i % 2 === 0) {
                nextMatch.leftChildId = currentMatch.id;
            } else {
                nextMatch.rightChildId = currentMatch.id;
            }
        }
    }

    return matches;
    return matches;
};

// Start of Helpers
const getRoundName = (roundNum: number, totalRounds: number): string => {
    const diff = totalRounds - roundNum;
    if (diff === 0) return 'Final';
    if (diff === 1) return 'Semi Final';
    if (diff === 2) return 'Quarter Final';
    return `Round ${roundNum}`;
};

const getRoundRank = (roundName: string): number => {
    const r = roundName.toLowerCase();

    if (r.includes("final") && !r.includes("semi") && !r.includes("quarter")) return 300;
    if (r.includes("semi")) return 200;
    if (r.includes("quarter")) return 100;

    const match = r.match(/round\s*(\d+)/);
    if (match) return parseInt(match[1], 10);

    return 999;
};

// Helper for Path Signature (Visual Tree Ordering)
const getPathSignature = (match: Match, parentMap: Map<string, Match>): string => {
    let path = "";
    let current = match;
    let parent = current.nextMatchId ? parentMap.get(current.nextMatchId) : undefined;

    while (parent) {
        // We need to know if current is left or right child of parent
        const isLeft = parent.leftChildId === current.id;
        path = (isLeft ? "0" : "1") + path;

        current = parent;
        parent = current.nextMatchId ? parentMap.get(current.nextMatchId) : undefined;
    }

    return path;
};

export const assignBoutNumbers = (
    rings: Ring[],
    categoryMatchesMap: Map<string, Match[]>
): void => {

    // 0. Pre-process: Build Parent Map for Path Signature
    // We need a lookup for all matches to traverse up
    const globalMatchLookup = new Map<string, Match>();
    categoryMatchesMap.forEach(matches => {
        matches.forEach(m => globalMatchLookup.set(m.id, m));
    });

    // 1. Sort Matches Authoritatively
    categoryMatchesMap.forEach(matches => {
        matches.sort((a, b) => {
            const rDiff = getRoundRank(a.round) - getRoundRank(b.round);
            if (rDiff !== 0) return rDiff;

            // Same round: sort by tree position (Path Signature)
            const sigA = getPathSignature(a, globalMatchLookup);
            const sigB = getPathSignature(b, globalMatchLookup);
            return sigA.localeCompare(sigB);
        });

        // Clear existing numbers for non-Qualifiers
        matches.forEach(m => {
            if (m.round !== 'Qualifier') {
                m.bout_number = '';
            }
        });
    });

    rings.forEach(ring => {
        let boutCounter = 1;

        // Process Priority Groups in order (1, 2...)
        const priorities = Object.keys(ring.priorityGroups).map(Number).sort((a, b) => a - b);

        priorities.forEach(priority => {
            const categories = ring.priorityGroups[priority];

            // Initialize indices for each category in this group
            const categoryIndices: Record<string, number> = {};
            const categoryMatches: Record<string, Match[]> = {};

            categories.forEach(catKey => {
                categoryIndices[catKey] = 0;
                categoryMatches[catKey] = categoryMatchesMap.get(catKey) || [];
            });

            let anyMatchesLeft = true;

            // Loop until all matches in this priority group are assigned
            while (anyMatchesLeft) {
                anyMatchesLeft = false;

                categories.forEach(catKey => {
                    const matches = categoryMatches[catKey];
                    let index = categoryIndices[catKey];

                    if (index >= matches.length) return;

                    // We found at least one unassigned match in this category
                    // We will process the ENTIRE current round for this category
                    const currentRoundName = matches[index].round;

                    // Since matches are PRE-SORTED, we just iterate them linearly.
                    // The sort ensured they are in (Round 1, Round 2...) order AND (Top-to-Bottom) order.

                    while (index < matches.length && matches[index].round === currentRoundName) {
                        const match = matches[index];

                        // Assign the match to this ring
                        match.ring = ring.id;
                        const isRedBye = match.red === 'BYE';
                        const isBlueBye = match.blue === 'BYE';

                        if (match.round === 'Qualifier') {
                            // Skip numbering qualifiers, assuming they have fixed IDs or handled elsewhere
                            index++;
                            continue;
                        }

                        if (!isRedBye && !isBlueBye) {
                            const ringLetter = ring.name.replace('RING ', '').trim();
                            match.bout_number = `${ringLetter}${boutCounter.toString().padStart(2, '0')}`;
                            boutCounter++;
                        }

                        index++;
                    }

                    categoryIndices[catKey] = index;
                    if (index < matches.length) anyMatchesLeft = true;
                });
            }
        });
    });
};
