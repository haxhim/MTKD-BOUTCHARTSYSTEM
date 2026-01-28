
import type { Participant } from '../types';

/**
 * Splits a list of participants into subgroups for Carnival Mode.
 * Rules:
 * - Max 4 players per group.
 * - Split > 4 into subgroups (e.g., 10 -> 4, 4, 2).
 * - Avoid 2, 2, 2, 2, 2 splitting (prefer maxing out groups).
 * - Attempt to separate same-club players, but prioritize group size.
 */
export const splitParticipants = (
    participants: Participant[],
    maxSize: number = 4
): Participant[][] => {
    if (participants.length <= maxSize) {
        return [participants];
    }

    // 1. Determine split configuration
    const total = participants.length;
    // const groups removed

    // Simple greedy approach for group sizes: fill 4s until remainder left
    // 10 -> 4, 4, 2
    // 6 -> 4, 2
    // 5 -> 4, 1? Or 3, 2?
    // Requirement says: "Group size integrity takes priority". "Max 4 players".
    // "Example: 10 players -> 4, 4, 2".
    // If 5 players: 4, 1 is strictly following match size. 
    // Carnival usually wants fights, so 3, 2 might be better but let's stick to "Max 4" strictly for now unless logic refines.
    // Actually, "Maximum 4 players per sub-category". 
    // Usually standard is "Fill buckets".

    // Let's implement bucket filling.
    const numberOfFullGroups = Math.floor(total / maxSize);
    const remainder = total % maxSize;

    const groupSizes: number[] = [];
    for (let i = 0; i < numberOfFullGroups; i++) groupSizes.push(maxSize);
    if (remainder > 0) groupSizes.push(remainder);

    // 2. Distribute participants - Club Separation
    // We want to avoid same clubs in same group if possible.
    // Strategy: Sort by Club size, then Round Robin distribute?
    // But we need to fill groups sequentially? 
    // No, splitting creates virtual categories A, B, C.
    // If we have 3 players from Club X, putting them in A, B, C is better than all in A.

    // Sort clubs by size
    const clubMap = new Map<string, Participant[]>();
    participants.forEach(p => {
        const list = clubMap.get(p.club) || [];
        list.push(p);
        clubMap.set(p.club, list);
    });

    const sortedClubs = Array.from(clubMap.entries()).sort((a, b) => b[1].length - a[1].length);

    // Create empty buckets
    const buckets: Participant[][] = groupSizes.map(() => []);

    // Round Robin distribution across buckets until they are full?
    // Wait, if we round robin 10 players into 4, 4, 2 buckets.
    // Player 1 -> Bucket 1 (size 4)
    // Player 2 -> Bucket 2 (size 4)
    // Player 3 -> Bucket 3 (size 2)
    // Player 4 -> Bucket 1 ...

    // We must respect the bucket capacity.

    let currentBucketIdx = 0;

    // Flatten sorted clubs back to list of players (alternating clubs implicitly by processing order?)
    // Actually, iterating through sorted clubs and placing one by one is good.

    for (const [_, players] of sortedClubs) {
        for (const player of players) {
            // Find next bucket that is not full
            let placed = false;
            let attempts = 0;

            // Try to find a bucket for this club member
            // We start from currentBucketIdx to spread them out
            while (!placed && attempts < buckets.length) {
                const bucketIdx = (currentBucketIdx + attempts) % buckets.length;
                if (buckets[bucketIdx].length < groupSizes[bucketIdx]) {
                    buckets[bucketIdx].push(player);
                    placed = true;
                    // Move start pointer to next bucket for next player to ensure spread
                    currentBucketIdx = (bucketIdx + 1) % buckets.length;
                } else {
                    attempts++;
                }
            }
        }
    }

    return buckets;
};
