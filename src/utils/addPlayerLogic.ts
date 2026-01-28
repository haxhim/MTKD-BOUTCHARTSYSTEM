import type { Match, Participant, Ring } from '../types';
import { generateId } from './uuid'; // Assuming uuid helper exists or I need to import/create logic

export interface AddPlayerResult {
    success: boolean;
    message: string;
    updatedMatches?: Map<string, Match[]>;
}

/**
 * Adds a new player to the tournament.
 * 1. Tries to fill a BYE slot.
 * 2. If full, creates a Qualifier Match feeding into an existing Round 1 match.
 */
export const addLateParticipant = (
    newPlayer: Participant,
    matches: Map<string, Match[]>,
    rings: Ring[]
): AddPlayerResult => {
    const categoryMatches = matches.get(newPlayer.category_key);

    if (!categoryMatches || categoryMatches.length === 0) {
        return { success: true, message: 'Player added. No existing bracket to update.' };
    }

    // Clone matches map
    const newMatchesMap = new Map(matches);
    const catMatches = [...categoryMatches]; // Clone array
    newMatchesMap.set(newPlayer.category_key, catMatches);

    // --- STRATEGY 1: Find BYE Slot ---
    const targetMatchIndex = catMatches.findIndex(m =>
        (m.red === 'BYE' || m.blue === 'BYE') &&
        (m.round.includes('Round 1') || m.round === 'Quarter Final' || m.round === 'Semi Final')
    );

    if (targetMatchIndex !== -1) {
        // ... Existing BYE logic ...
        const targetMatch = { ...catMatches[targetMatchIndex] };
        catMatches[targetMatchIndex] = targetMatch;

        if (targetMatch.red === 'BYE') {
            targetMatch.red = newPlayer;
        } else {
            targetMatch.blue = newPlayer;
        }

        // Assign Bout Number if missing
        assignBoutNumberIfMissing(targetMatch, catMatches, rings);

        // Undo auto-advance if necessary
        undoAutoAdvance(targetMatch, catMatches);

        return {
            success: true,
            message: `Player inserted into existing slot (Bout ${targetMatch.bout_number}).`,
            updatedMatches: newMatchesMap
        };
    }

    // --- STRATEGY 2: Full Bracket -> Create Qualifier Match ---
    // No BYE slots. We must create a new match that feeds into an existing Round 1 match.
    // Pick the last Round 1 match to append to? Or the first?
    // Let's pick the last Round 1 match that has actual players, to preserve flow.
    // actually, usually we expand from the bottom up or top down.
    // Let's pick the LAST match of the earliest round.

    // Find the earliest round name
    const rounds = [...new Set(catMatches.map(m => m.round))];
    // Heuristic sort: Round 1, Round 2, QF, SF, Final.
    // Just find "Round 1" or if not exists, look for QF.
    const firstRoundName = rounds.find(r => r.includes('Round 1')) || rounds.find(r => r.includes('Quarter')) || rounds[0];

    // Find matches in this round
    const roundMatches = catMatches.filter(m => m.round === firstRoundName);
    if (roundMatches.length === 0) {
        return { success: false, message: 'Could not identify a valid slot to expand.' };
    }

    // Target the last match in this round to minimize disruption?
    // Or just the first.
    let spliceTargetMatch = roundMatches[roundMatches.length - 1]; // Start with LAST match of round

    // TRAVERSE TO LEAF:
    // If this match already has a child on the side we want to splice (usually Red/Left for simplicity),
    // we must follow it to the end to ensure we add to the end of the chain.
    // Otherwise we orphan existing qualifiers.

    // Heuristic: Always splice RED side.
    let safetyCounter = 0;
    while (spliceTargetMatch.leftChildId && safetyCounter < 50) {
        const childId = spliceTargetMatch.leftChildId;
        const childMatch = catMatches.find(m => m.id === childId);
        if (childMatch) {
            spliceTargetMatch = childMatch;
        } else {
            break;
        }
        safetyCounter++;
    }

    const spliceIndex = catMatches.findIndex(m => m.id === spliceTargetMatch.id);

    // Create NEW Match (Qualifier)
    // It will take one player from SpliceTarget (e.g. Red) and the New Player.
    // The Winner goes to SpliceTarget Red.

    const displacedPlayer = spliceTargetMatch.red;
    // Note: displacedPlayer should be a Participant, not BYE (since we checked BYEs above).
    // If it is BYE for some reason (logic error), we just overwrite. But we handled BYEs.

    const newMatchId = generateId();
    const newMatch: Match = {
        id: newMatchId,
        bout_number: '', // Will assign
        red: displacedPlayer,
        blue: newPlayer,
        round: 'Qualifier', // Or "Round 0"
        ring: spliceTargetMatch.ring,
        nextMatchId: spliceTargetMatch.id,
        // It feeds into Left (Red) of target
    };

    // Update Splice Target
    // We need to clone it first
    const updatedTarget = { ...spliceTargetMatch };
    catMatches[spliceIndex] = updatedTarget;

    updatedTarget.red = null; // Winner of new match
    updatedTarget.leftChildId = newMatchId; // Link

    // Assign Bout Number to New Match
    // User wants "A04A", "A04B", "A04C" style (flat suffix for all qualifiers of the same root).
    // Use the Target's bout number as base.

    // 1. Identify Base Number
    let baseNumber = updatedTarget.bout_number;

    // If target itself is a qualifier (e.g. A05A), we want to respect that?
    // User said: "A05A, A05AA, A05AAA" is BAD. Wants "A05A, A05B, A05C".
    // This implies we should find the "Original" Round 1 bout number.
    // If baseNumber is "A05A", base is "A05".
    // Regex to strip letters from end?
    // "A05" -> Base "A05"
    // "A05A" -> Base "A05"

    // Extract base: starts with Letter, digits, then optional suffix chars.
    // Actually, usually "A01", "B10".
    // Suffix is usually purely alphabetic added by us.
    // Let's assume bout number format: [RingLetter][Digits][Suffix]
    // We want [RingLetter][Digits].

    const baseMatch = baseNumber.match(/^([A-Z0-9]+?)([A-Z]*)$/);
    let rootBout = baseNumber;
    if (baseMatch && baseMatch[2]) {
        // If there is already a suffix (e.g. 'A'), strip it ?
        // Wait, if I splice 'A05A', I am creating a child of 'A05A'.
        // If I name it 'A05B', it sounds like a sibling of 'A05A'.
        // But structurally it is a child.
        // User priority is clean names. So 'A05B' is fine even if child.
        // So yes, we strip suffix to get Root "A05".
        rootBout = baseMatch[1];
        // But wait, "A05" matches A=Ring, 05=Number.
        // If simple regex: assume suffix is uppercase letters at end.
        // But Ring can be "A".
        // Let's assume standard format A01.
        // If we detect suffixes we added (which are usually A, B, C...), we strip them.
        // Since we control generation, we can try to find the "Main Round 1" parent? 
        // Too complex to traverse up.
        // Regex: /^[A-Z]\d{2,3}/ match the standard ring+number.
        const standardMatch = baseNumber.match(/^([A-Za-z]\d+)/);
        if (standardMatch) {
            rootBout = standardMatch[1];
        }
    } else {
        // Just A05
        rootBout = baseNumber;
    }

    // 2. Find all used suffixes for this Root Base in the whole category
    // Scan all matches in category
    const usedSuffixes: string[] = [];
    catMatches.forEach(m => {
        if (m.bout_number && m.bout_number.startsWith(rootBout)) {
            const suffix = m.bout_number.replace(rootBout, '');
            if (suffix) usedSuffixes.push(suffix);
        }
    });

    // 3. Find next available single letter if possible, or double if needed
    // Sequence: A, B, C ... Z, AA, AB...
    // Actually user example: A05A, A05B, A05C. Use that logic.

    const possibleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let nextSuffix = 'A';

    // Heuristic: Try single letters first
    for (const char of possibleChars) {
        if (!usedSuffixes.includes(char)) {
            nextSuffix = char;
            break;
        }
    }

    // If Z is taken (rare), maybe AA?
    if (usedSuffixes.includes(nextSuffix)) {
        // Fallback to AA... logic or just random, but assuming < 26 qualifiers
        nextSuffix = 'AA';
    }

    newMatch.bout_number = `${rootBout}${nextSuffix}`;

    // Add new match to list
    catMatches.push(newMatch); // Add to end or beginning? End is fine, maps/lists usually unsorted for logic.

    return {
        success: true,
        message: `Bracket expanded. Created qualifier ${newMatch.bout_number} feeding into ${updatedTarget.bout_number}.`,
        updatedMatches: newMatchesMap
    };
};

/**
 * Helper to assign bout number if missing, using round-specific logic
 */
const assignBoutNumberIfMissing = (match: Match, allMatches: Match[], rings: Ring[]) => {
    if (match.bout_number) return;

    const ringId = match.ring;
    const existingBouts = allMatches
        .filter(m => m.bout_number && m.round === match.round)
        .map(m => m.bout_number);

    let baseBout = "00";
    if (existingBouts.length > 0) {
        existingBouts.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        baseBout = existingBouts[existingBouts.length - 1];
    } else {
        const ring = rings.find(r => r.id === ringId);
        const ringName = ring ? ring.name.replace('RING ', '').trim() : 'A';
        baseBout = `${ringName}00`;
    }

    match.bout_number = `${baseBout}A`;
};

/**
 * Helper to undo auto-advance
 */
const undoAutoAdvance = (match: Match, allMatches: Match[]) => {
    if (!match.nextMatchId) return;

    const nextMatchIndex = allMatches.findIndex(m => m.id === match.nextMatchId);
    if (nextMatchIndex !== -1) {
        const nextMatch = { ...allMatches[nextMatchIndex] };
        allMatches[nextMatchIndex] = nextMatch;

        if (nextMatch.leftChildId === match.id) nextMatch.red = null;
        if (nextMatch.rightChildId === match.id) nextMatch.blue = null;

        nextMatch.winner = undefined;

        undoRecursively(nextMatch, allMatches);
    }
};

const undoRecursively = (match: Match, allMatches: Match[]) => {
    if (!match.nextMatchId) return;
    const upIndex = allMatches.findIndex(m => m.id === match.nextMatchId);
    if (upIndex !== -1) {
        const upMatch = { ...allMatches[upIndex] };
        allMatches[upIndex] = upMatch;

        if (upMatch.leftChildId === match.id) upMatch.red = null;
        if (upMatch.rightChildId === match.id) upMatch.blue = null;
        upMatch.winner = undefined;

        undoRecursively(upMatch, allMatches);
    }
};
