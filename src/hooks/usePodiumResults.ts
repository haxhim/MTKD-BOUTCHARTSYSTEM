import { useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import type { Participant } from '../types';

export interface Podium {
    category: string;
    lastRing: string;
    gold?: Participant;
    silver?: Participant;
    bronze: Participant[];
}

export const usePodiumResults = () => {
    const { matches, rings } = useTournament();

    const podiums = useMemo(() => {
        const results: Podium[] = [];

        matches.forEach((catMatches, categoryKey) => {
            if (catMatches.length === 0) return;

            // Determine if Table Mode from ring's bout_mode (source of truth)
            const ringId = catMatches[0].ring;
            const ring = rings.find(r => r.id === ringId);
            const isTable = ring?.bout_mode?.includes('table') || false;

            let gold: Participant | undefined;
            let silver: Participant | undefined;
            const bronze: Participant[] = [];
            let lastRing = catMatches[0].ring; // Default

            if (isTable) {

                // --- TABLE MODE LOGIC ---
                // Winners are determined by Rank (1, 2, 3) assigned in JudgeInterface
                const goldMatch = catMatches.find(m => m.rank === 1);
                const silverMatch = catMatches.find(m => m.rank === 2);
                const bronzeMatch = catMatches.find(m => m.rank === 3);

                if (goldMatch && goldMatch.red && goldMatch.red !== 'BYE') gold = goldMatch.red as Participant;
                if (silverMatch && silverMatch.red && silverMatch.red !== 'BYE') silver = silverMatch.red as Participant;
                if (bronzeMatch && bronzeMatch.red && bronzeMatch.red !== 'BYE') bronze.push(bronzeMatch.red as Participant);

                // Track ring
                if (goldMatch) lastRing = goldMatch.ring;

            } else {
                // --- TREE MODE LOGIC ---
                // Find Final Match
                const finalMatch = catMatches.find(m => m.round === 'Final');
                if (!finalMatch) return;

                lastRing = finalMatch.ring;

                // Gold & Silver from Final
                if (finalMatch.winner && finalMatch.winner !== 'BYE') {
                    gold = finalMatch.winner as Participant;
                    // Silver is the loser
                    if (finalMatch.red === gold) {
                        silver = finalMatch.blue === 'BYE' ? undefined : (finalMatch.blue as Participant);
                    } else {
                        silver = finalMatch.red === 'BYE' ? undefined : (finalMatch.red as Participant);
                    }
                }

                // Bronze from Semi-Finals
                const semiFinals = catMatches.filter(m => m.nextMatchId === finalMatch.id);
                semiFinals.forEach(semi => {
                    if (semi.winner) {
                        if (semi.red === semi.winner) {
                            if (semi.blue && semi.blue !== 'BYE') bronze.push(semi.blue as Participant);
                        } else {
                            if (semi.red && semi.red !== 'BYE') bronze.push(semi.red as Participant);
                        }
                    }
                });
            }

            // Format Category Name for Splits (e.g. "Male_A" -> "Male - Group A")
            let displayName = categoryKey;
            // distinct split check: ends with _[A-Z]
            // We can check if previous logic used single letters
            const splitMatch = categoryKey.match(/^(.*)_([A-Z])$/);
            if (splitMatch) {
                displayName = `${splitMatch[1]} - Group ${splitMatch[2]}`;
            }

            // Resolve Ring Name
            const ringObj = rings.find(r => r.id === lastRing);
            const ringName = ringObj ? ringObj.name : (lastRing || 'N/A');

            results.push({
                category: displayName,
                lastRing: ringName,
                gold,
                silver,
                bronze
            });
        });

        // Sort by Category Name
        return results.sort((a, b) => a.category.localeCompare(b.category));
    }, [matches, rings]);

    return { podiums };
};
