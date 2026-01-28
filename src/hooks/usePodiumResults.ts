import { useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import type { Participant } from '../types';

export interface Podium {
    category: string; // Display Name
    categoryKey: string; // Raw Key for joining
    lastRing: string;
    gold?: Participant;
    silver?: Participant;
    bronze: Participant[];
}

export const usePodiumResults = () => {
    const { matches, rings, participants } = useTournament();

    const podiums = useMemo(() => {
        const results: Podium[] = [];
        const partMap = new Map(participants.map(p => [p.id, p]));

        const resolve = (p: Participant | string | 'BYE' | null | undefined): Participant | undefined => {
            if (!p || p === 'BYE') return undefined;
            if (typeof p === 'object' && 'id' in p) return p as Participant;
            if (typeof p === 'string') return partMap.get(p);
            return undefined;
        };

        const getId = (p: Participant | string | 'BYE' | null | undefined): string | undefined => {
            if (!p || p === 'BYE') return undefined;
            if (typeof p === 'string') return p;
            return p.id;
        };

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

                if (goldMatch) gold = resolve(goldMatch.red);
                if (silverMatch) silver = resolve(silverMatch.red);
                if (bronzeMatch) {
                    const p = resolve(bronzeMatch.red);
                    if (p) bronze.push(p);
                }

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
                    gold = resolve(finalMatch.winner);

                    const goldId = getId(gold) || getId(finalMatch.winner);
                    const redId = getId(finalMatch.red);

                    // Silver is the loser
                    if (redId === goldId) {
                        silver = resolve(finalMatch.blue);
                    } else {
                        silver = resolve(finalMatch.red);
                    }
                }

                // Bronze from Semi-Finals
                const semiFinals = catMatches.filter(m => m.nextMatchId === finalMatch.id);
                semiFinals.forEach(semi => {
                    if (semi.winner && semi.winner !== 'BYE') {
                        const winnerId = getId(semi.winner);
                        const semiRedId = getId(semi.red);

                        // Loser of semi is bronze
                        if (semiRedId === winnerId) {
                            const p = resolve(semi.blue);
                            if (p) bronze.push(p);
                        } else {
                            const p = resolve(semi.red);
                            if (p) bronze.push(p);
                        }
                    }
                });
            }

            // Format Category Name for Splits (e.g. "Male_A" -> "Male - Group A")
            let displayName = categoryKey;
            const splitMatch = categoryKey.match(/^(.*)_([A-Z])$/);
            if (splitMatch) {
                displayName = `${splitMatch[1]} - Group ${splitMatch[2]}`;
            }

            // Resolve Ring Name
            const ringObj = rings.find(r => r.id === lastRing);
            const ringName = ringObj ? ringObj.name : (lastRing || 'N/A');

            results.push({
                category: displayName,
                categoryKey: categoryKey,
                lastRing: ringName,
                gold,
                silver,
                bronze
            });
        });

        // Sort by Category Name
        return results.sort((a, b) => a.category.localeCompare(b.category));
    }, [matches, rings, participants]);

    return { podiums };
};
