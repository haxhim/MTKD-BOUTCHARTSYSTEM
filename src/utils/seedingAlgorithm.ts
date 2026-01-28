import type { Participant } from '../types';
import { calculateBracketSize } from './bracketGenerator';

export const seedParticipants = (participants: Participant[]): (Participant | 'BYE')[] => {
    if (participants.length === 0) return [];

    const bracketSize = calculateBracketSize(participants.length);

    // Group by Club
    const clubMap = new Map<string, Participant[]>();
    participants.forEach(p => {
        const list = clubMap.get(p.club) || [];
        list.push(p);
        clubMap.set(p.club, list);
    });

    // Shuffle players within each club (Requirement: "Randomize order within club groups only")
    clubMap.forEach((list, club) => {
        clubMap.set(club, shuffleArray(list));
    });

    // Sort clubs by size (descending) to handle largest constraints first
    const sortedClubs = Array.from(clubMap.entries()).sort((a, b) => b[1].length - a[1].length);

    // Convert to a structure we can pass to the recursive function
    // We need a list of clubs, each with a list of players
    const clubsData = sortedClubs.map(([name, players]) => ({ name, players }));

    return distributeRecursive(clubsData, bracketSize);
};

interface ClubData {
    name: string;
    players: Participant[];
}

const distributeRecursive = (clubs: ClubData[], size: number): (Participant | 'BYE')[] => {
    // Base case: Size 1
    if (size === 1) {
        // Find a player to put here
        // In a valid split, there should be at most 1 player remaining across all clubs
        let player: Participant | undefined = undefined;
        for (const club of clubs) {
            if (club.players.length > 0) {
                player = club.players[0];
                // Consume the player (create new structure or just return it? 
                // We need to return the player, but we also need to know it's "used" if we were modifying state.
                // But here we are passing sliced arrays down, so we just take it.
                // Wait, if we pass sliced arrays, we don't need to modify.
                // But we need to ensure we only have 1 player total.
                break;
            }
        }
        return [player || 'BYE'];
    }

    // Recursive Step
    const halfSize = size / 2;
    const leftClubs: ClubData[] = [];
    const rightClubs: ClubData[] = [];

    // Calculate total players to determine target split
    let totalPlayers = 0;
    clubs.forEach(c => totalPlayers += c.players.length);

    const targetLeft = Math.ceil(totalPlayers / 2);
    let currentLeft = 0;

    // Distribute players for each club
    for (const club of clubs) {
        const players = club.players;
        const count = players.length;

        // We want to split this club's players into Left and Right
        // Goal 1: Balance this club (approx count/2 each)
        // Goal 2: Balance global total (reach targetLeft)

        let leftCountForClub = 0;
        let rightCountForClub = 0;

        // Assign players one by one
        for (let i = 0; i < count; i++) {
            // Decision: Left or Right?
            // Preference: Alternate to balance club
            // Constraint: Global balance

            const preferLeft = leftCountForClub <= rightCountForClub;

            if (preferLeft) {
                // Try adding to Left
                if (currentLeft < targetLeft) {
                    leftCountForClub++;
                    currentLeft++;
                } else {
                    // Must go Right
                    rightCountForClub++;
                }
            } else {
                // Prefer Right
                // But if we *must* fill Left (e.g. if all remaining spots are Left? No, targetLeft is a target)
                // Actually, if we put too many in Right, we might miss TargetLeft?
                // We need to ensure we don't overfill Right such that we can't reach TargetLeft?
                // Or overfill Left.

                // Simple check: Can we go Right?
                // We can go Right if we don't exceed Right Capacity?
                // Right Capacity = halfSize.
                // But we are tracking "Target Left" based on *players*, not slots.
                // The slot capacity is `halfSize`.
                // Since `totalPlayers <= size`, `targetLeft <= halfSize` is guaranteed?
                // Yes, ceil(P/2) <= ceil(S/2) = S/2 (since S is power of 2, P <= S).

                rightCountForClub++;
            }
        }

        // Create new ClubData for next level
        leftClubs.push({
            name: club.name,
            players: players.slice(0, leftCountForClub)
        });
        rightClubs.push({
            name: club.name,
            players: players.slice(leftCountForClub)
        });
    }

    // Recurse
    const leftResult = distributeRecursive(leftClubs, halfSize);
    const rightResult = distributeRecursive(rightClubs, halfSize);

    return [...leftResult, ...rightResult];
};

// Fisher-Yates Shuffle
const shuffleArray = <T>(array: T[]): T[] => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
};
