
import type { Participant, Match, Ring, BoutMode } from '../types';
import { generateId } from './uuid';
import { splitParticipants } from './splitUtils';

export interface MatchGroup {
    categoryKey: string;
    matches: Match[];
}

export interface GenerationOptions {
    maxGroupSize?: number;
}

export const generateMatches = (
    seededParticipants: (Participant | 'BYE')[],
    categoryKey: string,
    ringId: string,
    boutMode: BoutMode = 'tree_pro',
    options?: GenerationOptions
): MatchGroup[] => {
    switch (boutMode) {
        case 'tree_carnival':
            return generateCarnivalTree(seededParticipants, categoryKey, ringId, options);
        case 'table_pro':
            return generateProfessionalTable(seededParticipants, categoryKey, ringId);
        case 'table_carnival':
            return generateCarnivalTable(seededParticipants, categoryKey, ringId, options);
        case 'tree_pro':
        default:
            return [{
                categoryKey,
                matches: generateProfessionalTreeLogic(seededParticipants, categoryKey, ringId)
            }];
    }
};

const generateCarnivalTree = (
    participants: (Participant | 'BYE')[],
    baseKey: string,
    ringId: string,
    options?: GenerationOptions
): MatchGroup[] => {
    const realParticipants = participants.filter(p => p !== 'BYE') as Participant[];
    const groups = splitParticipants(realParticipants, options?.maxGroupSize || 4);
    const results: MatchGroup[] = [];
    const getSuffix = (index: number) => String.fromCharCode(65 + index);

    groups.forEach((group, index) => {
        const key = groups.length > 1 ? `${baseKey}_${getSuffix(index)}` : baseKey;
        const matches = generateProfessionalTreeLogic(group, key, ringId);
        results.push({ categoryKey: key, matches });
    });
    return results;
};

const generateProfessionalTable = (
    participants: (Participant | 'BYE')[],
    categoryKey: string,
    ringId: string
): MatchGroup[] => {
    const realParticipants = participants.filter(p => p !== 'BYE') as Participant[];
    const matches: Match[] = realParticipants.map(p => ({
        id: generateId(),
        bout_number: '',
        red: p,
        blue: null,
        round: 'Round 1',
        ring: ringId,
        winner: undefined,
        is_table_mode: true,
        score: undefined,
        rank: undefined
    }));
    return [{ categoryKey, matches }];
};

const generateCarnivalTable = (
    participants: (Participant | 'BYE')[],
    baseKey: string,
    ringId: string,
    options?: GenerationOptions
): MatchGroup[] => {
    const realParticipants = participants.filter(p => p !== 'BYE') as Participant[];
    const groups = splitParticipants(realParticipants, options?.maxGroupSize || 4);
    const results: MatchGroup[] = [];
    const getSuffix = (i: number) => String.fromCharCode(65 + i);

    groups.forEach((group, index) => {
        const key = groups.length > 1 ? `${baseKey}_${getSuffix(index)}` : baseKey;
        const matches = generateProfessionalTable(group, key, ringId)[0].matches;
        results.push({ categoryKey: key, matches });
    });
    return results;
};

const generateProfessionalTreeLogic = (
    seededParticipants: (Participant | 'BYE')[],
    _categoryKey: string,
    ringId: string
): Match[] => {
    // If only 1 participant (e.g. Carnival split resulted in 1 person), 
    // we must create a dummy "Final" match so they appear in the bracket as a winner.
    if (seededParticipants.length === 1 && seededParticipants[0] !== 'BYE') {
        const matchId = generateId();
        const winner = seededParticipants[0] as Participant;
        const match: Match = {
            id: matchId,
            bout_number: '',
            red: winner,
            blue: 'BYE',
            round: 'Final',
            ring: ringId,
            winner: winner,
            is_table_mode: false
        };
        return [match];
    }

    if (seededParticipants.length === 0) return [];

    const matches: Match[] = [];
    let currentRoundParticipants = [...seededParticipants];

    // Auto-pad with BYEs for logic
    const targetSize = Math.pow(2, Math.ceil(Math.log2(currentRoundParticipants.length)));
    while (currentRoundParticipants.length < targetSize) {
        currentRoundParticipants.push('BYE');
    }

    let roundNumber = 1;
    let totalRounds = Math.ceil(Math.log2(targetSize));


    const rounds: Match[][] = [];

    while (currentRoundParticipants.length > 1) {
        const nextRoundParticipants: (Participant | 'BYE' | null)[] = [];
        const currentRoundMatches: Match[] = [];
        const roundName = getRoundName(roundNumber, totalRounds);

        for (let i = 0; i < currentRoundParticipants.length; i += 2) {
            const red = currentRoundParticipants[i];
            const blue = currentRoundParticipants[i + 1];
            const matchId = generateId();

            let winner: Participant | 'BYE' | undefined = undefined;
            if (red === 'BYE' && blue !== 'BYE' && blue !== null) winner = blue;
            else if (blue === 'BYE' && red !== 'BYE' && red !== null) winner = red;
            else if (red === 'BYE' && blue === 'BYE') winner = 'BYE';

            const match: Match = {
                id: matchId,
                bout_number: '',
                red: red,
                blue: blue,
                round: roundName,
                ring: ringId,
                winner: winner,
                is_table_mode: false
            };
            currentRoundMatches.push(match);
            matches.push(match);
            nextRoundParticipants.push(winner || null);
        }
        rounds.push(currentRoundMatches);
        currentRoundParticipants = nextRoundParticipants as any;
        roundNumber++;
    }

    for (let r = 0; r < rounds.length - 1; r++) {
        const currentRoundMatches = rounds[r];
        const nextRoundMatches = rounds[r + 1];
        for (let i = 0; i < currentRoundMatches.length; i++) {
            const currentMatch = currentRoundMatches[i];
            const nextMatchIndex = Math.floor(i / 2);
            const nextMatch = nextRoundMatches[nextMatchIndex];
            currentMatch.nextMatchId = nextMatch.id;
            if (i % 2 === 0) nextMatch.leftChildId = currentMatch.id;
            else nextMatch.rightChildId = currentMatch.id;
        }
    }
    return matches;
};

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

const getPathSignature = (match: Match, parentMap: Map<string, Match>): string => {
    let path = "";
    let current = match;
    let parent = current.nextMatchId ? parentMap.get(current.nextMatchId) : undefined;
    while (parent) {
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
    const globalMatchLookup = new Map<string, Match>();
    categoryMatchesMap.forEach(matches => {
        matches.forEach(m => globalMatchLookup.set(m.id, m));
    });

    categoryMatchesMap.forEach(matches => {
        matches.sort((a, b) => {
            const rDiff = getRoundRank(a.round) - getRoundRank(b.round);
            if (rDiff !== 0) return rDiff;
            const sigA = getPathSignature(a, globalMatchLookup);
            const sigB = getPathSignature(b, globalMatchLookup);
            return sigA.localeCompare(sigB);
        });
        matches.forEach(m => {
            // Updated logic for Table mode numbers
            if (m.round !== 'Qualifier' && !m.is_table_mode) {
                m.bout_number = '';
            }
            if (m.is_table_mode && m.round !== 'Round 1') {
                m.bout_number = '';
            }
        });
    });

    rings.forEach(ring => {
        let boutCounter = 1;
        const priorities = Object.keys(ring.priorityGroups).map(Number).sort((a, b) => a - b);

        priorities.forEach(priority => {
            const categories = ring.priorityGroups[priority];
            const expandedCategories: string[] = [];

            // Preserve the order from priority groups, only sort splits (A, B, C...) within each root category
            categories.forEach(rootCat => {
                if (categoryMatchesMap.has(rootCat)) {
                    expandedCategories.push(rootCat);
                } else {
                    // Find all split groups for this root category and sort them
                    const splits: string[] = [];
                    for (const key of categoryMatchesMap.keys()) {
                        if (key.startsWith(rootCat + '_')) {
                            splits.push(key);
                        }
                    }
                    // Sort splits alphabetically (A, B, C order)
                    splits.sort();
                    expandedCategories.push(...splits);
                }
            });
            // DO NOT sort expandedCategories - preserve user-defined order from priority groups!


            const categoryIndices: Record<string, number> = {};
            const categoryMatches: Record<string, Match[]> = {};

            expandedCategories.forEach(catKey => {
                categoryIndices[catKey] = 0;
                categoryMatches[catKey] = categoryMatchesMap.get(catKey) || [];
            });

            let anyMatchesLeft = true;
            while (anyMatchesLeft) {
                anyMatchesLeft = false;
                expandedCategories.forEach(catKey => {
                    const matches = categoryMatches[catKey];
                    let index = categoryIndices[catKey];
                    if (index >= matches.length) return;

                    const currentRoundName = matches[index].round;

                    while (index < matches.length && matches[index].round === currentRoundName) {
                        const match = matches[index];
                        match.ring = ring.id;
                        const isRedBye = match.red === 'BYE';
                        const isBlueBye = match.blue === 'BYE';

                        if (match.round === 'Qualifier' && !match.is_table_mode) {
                            index++;
                            continue;
                        }

                        if (!isRedBye && !isBlueBye) {
                            const ringLetter = ring.name.replace('RING', '').replace('Ring', '').trim();
                            // Both tree and table modes get bout numbers for judge interface
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
