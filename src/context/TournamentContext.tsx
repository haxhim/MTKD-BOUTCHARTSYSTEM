
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Participant, Ring, CategorySummary, Match } from '../types';
import { supabase } from '../lib/supabase';
import { generateCategoryTally } from '../utils/tallyGenerator';

interface TournamentContextType {
    tournamentId: string | null;
    tournamentName: string | null;
    setTournamentInfo: (id: string, name: string) => void;

    participants: Participant[];
    setParticipants: (p: Participant[]) => void;
    rings: Ring[];
    setRings: (r: Ring[]) => void;
    categorySummaries: CategorySummary[];
    setCategorySummaries: (s: CategorySummary[]) => void;
    matches: Map<string, Match[]>;
    setMatches: (m: Map<string, Match[]>) => void;

    loadTournament: (id: string) => Promise<void>;
    resetData: () => Promise<void>;
    resetParticipants: () => Promise<void>;
    resetRings: () => Promise<void>;
    resetBrackets: () => Promise<void>;
    resetMatchResults: () => Promise<void>;
    saveData: (p?: Participant[], r?: Ring[]) => Promise<void>;
    updateMatches: (matches: Match[]) => Promise<void>;
    deleteTournament: (id: string) => Promise<void>;
    exitTournament: () => void;
    deleteRing: (id: string) => Promise<void>;
    isSaving: boolean;
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export const TournamentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [tournamentId, setTournamentId] = useState<string | null>(null);
    const [tournamentName, setTournamentName] = useState<string | null>(null);

    const [participants, setParticipants] = useState<Participant[]>([]);
    const [rings, setRings] = useState<Ring[]>([]);
    const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([]);
    const [matches, setMatches] = useState<Map<string, Match[]>>(new Map());
    const [isSaving, setIsSaving] = useState(false);

    const setTournamentInfo = (id: string, name: string) => {
        setTournamentId(id);
        setTournamentName(name);
        localStorage.setItem('mtkd_tournament_id', id);
        localStorage.setItem('mtkd_tournament_name', name);
    };

    // Restore session on mount
    useEffect(() => {
        const storedId = localStorage.getItem('mtkd_tournament_id');
        const storedName = localStorage.getItem('mtkd_tournament_name');
        if (storedId && storedName) {
            setTournamentId(storedId);
            setTournamentName(storedName);
        }
    }, []);

    // Load data when tournamentId changes
    useEffect(() => {
        if (tournamentId) {
            loadTournament(tournamentId);
        } else {
            // Clear if logged out
            setParticipants([]);
            setRings([]);
            setCategorySummaries([]);
            setMatches(new Map());
        }
    }, [tournamentId]);

    const loadTournament = async (id: string) => {
        try {
            // 1. Load Rings
            const { data: ringsData } = await supabase.from('rings').select('*').eq('tournament_id', id);
            if (ringsData) {
                const parsedRings = ringsData.map(r => ({
                    ...r,
                    priorityGroups: typeof r.priority_groups === 'string' ? JSON.parse(r.priority_groups) : r.priority_groups
                }));
                setRings(parsedRings as any);
            }

            // 2. Load Participants
            const { data: partData } = await supabase.from('participants').select('*').eq('tournament_id', id);
            if (partData) {
                // Ensure category_key is present. If missing (legacy data), construct it.
                // Also ensure weight_class mapping is correct if DB uses different column names?
                // The DB seems to use 'weight_class' column. Our local type uses 'category' alias for weight_class sometimes?
                // Let's normalize it.
                // Note: The DB column `weight_class` maps to `weight_class`.
                // The `csvParser` sets `category` property to the weight class string.
                // The `Participant` interface has `category` AND `weight_class`?
                // Let's check `types/index.ts`.
                // Participant: { category: string, ... }
                // DB: weight_class

                const loadedParticipants = partData.map((p: any) => {
                    const category = p.weight_class || p.category; // DB uses weight_class
                    const gender = p.gender;
                    // Reconstruct key if missing or trust DB? 
                    // To be safe against "Supabase data wont show", we force reconstruction if missing.
                    // Actually, if we reconstructed it during CSV load as "Cat Gender", let's replicate that.
                    const category_key = p.category_key || `${category} ${gender}`;

                    return {
                        ...p,
                        category: category, // Map DB weight_class back to 'category' prop if interface uses it
                        category_key: category_key
                    };
                });

                setParticipants(loadedParticipants);

                // Regenerate category summaries so the dashboard and ring assignment work
                const summaries = generateCategoryTally(loadedParticipants);
                setCategorySummaries(summaries);

                // 3. Load Matches
                const { data: matchesData } = await supabase.from('matches').select('*').eq('tournament_id', id);
                if (matchesData) {
                    const newMap = new Map<string, Match[]>();

                    if (matchesData.length > 0 && loadedParticipants) {
                        // Use loadedParticipants for map as it has the corrected category_key
                        const partMap = new Map(loadedParticipants.map((p: Participant) => [p.id, p]));

                        matchesData.forEach((m: any) => {
                            // Use stored category key (preferred) or fallback to participant deduction
                            let categoryKey = m.category_key;

                            // Fallback logic for old data (if any)
                            if (!categoryKey) {
                                const red = m.red_id ? partMap.get(m.red_id) : null;
                                const blue = m.blue_id ? partMap.get(m.blue_id) : null;
                                if (red) categoryKey = red.category_key;
                                else if (blue) categoryKey = blue.category_key;
                            }

                            if (categoryKey) {
                                const matchObj: Match = {
                                    id: m.id,
                                    bout_number: m.bout_number?.toString() || '0',
                                    red: m.red_id ? (partMap.get(m.red_id) || null) : (m.red_id === null ? null : 'BYE'), // Logic check: DB null is TBD. 
                                    blue: m.blue_id ? (partMap.get(m.blue_id) || null) : null,
                                    round: m.round_name,
                                    ring: m.ring_id,
                                    winner: m.winner_id ? partMap.get(m.winner_id) : undefined,
                                    nextMatchId: m.next_match_id,
                                    leftChildId: undefined,
                                    rightChildId: undefined
                                };

                                if (!newMap.has(categoryKey)) {
                                    newMap.set(categoryKey, []);
                                }
                                newMap.get(categoryKey)?.push(matchObj);
                            }
                        });

                        // Sort by bout number
                        newMap.forEach(list => list.sort((a, b) => Number(a.bout_number) - Number(b.bout_number)));

                        // Reconstruct tree structure (leftChildId / rightChildId) from nextMatchId
                        // Since DB only stores "next_match_id" (child -> parent), we need to reverse map it.
                        newMap.forEach((matchesList) => {
                            const matchLookup = new Map<string, Match>();
                            matchesList.forEach(m => matchLookup.set(m.id, m));

                            matchesList.forEach(match => {
                                if (match.nextMatchId) {
                                    const parent = matchLookup.get(match.nextMatchId);
                                    if (parent) {
                                        // Assign this match as a child of the parent
                                        if (!parent.leftChildId) {
                                            parent.leftChildId = match.id;
                                        } else if (!parent.rightChildId) {
                                            parent.rightChildId = match.id;
                                        }
                                    }
                                }
                            });
                        });

                        setMatches(newMap);
                    }

                }
            }
        } catch (error) {
            console.error("Failed to load tournament data", error);
        }
    };

    const saveData = async (overrideParticipants?: Participant[], overrideRings?: Ring[]) => {
        if (!tournamentId) return;

        const partsToSave = overrideParticipants || participants;
        const ringsToSave = overrideRings || rings;

        const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        setIsSaving(true);
        try {
            // 1. Save Participants (Batched with Throttling)
            if (partsToSave.length > 0) {
                const BATCH_SIZE = 20;
                for (let i = 0; i < partsToSave.length; i += BATCH_SIZE) {
                    const batch = partsToSave.slice(i, i + BATCH_SIZE);

                    const upsertBatch = async () => {
                        return await supabase
                            .from('participants')
                            .upsert(batch.map(p => ({
                                id: p.id,
                                tournament_id: tournamentId,
                                name: p.name,
                                club: p.club,
                                gender: p.gender,
                                category_key: p.category_key,
                                weight_class: (p as any).category || (p as any).weight_class,
                                age: (p as any).age || null
                            })), { onConflict: 'id' });
                    };

                    let { error: pError } = await upsertBatch();

                    // Simple Retry Logic
                    if (pError) {
                        console.warn(`Batch ${i / BATCH_SIZE + 1} failed, retrying...`);
                        await wait(1000);
                        const retryResult = await upsertBatch();
                        pError = retryResult.error;
                    }

                    if (pError) {
                        console.error(`Error saving participants batch ${i}:`, pError);
                        alert(`Failed to save participants (Batch ${i / BATCH_SIZE + 1}): ${pError.message}`);
                        throw pError;
                    }

                    await wait(200);
                }
            }

            // 2. Save Rings
            if (ringsToSave.length > 0) {
                const { error: rError } = await supabase
                    .from('rings')
                    .upsert(ringsToSave.map(r => ({
                        id: r.id,
                        tournament_id: tournamentId,
                        name: r.name,
                        priority_groups: r.priorityGroups // Explicitly map to snake_case column
                    })), { onConflict: 'id' });

                if (rError) {
                    console.error("Error saving rings:", rError);
                    alert(`Failed to save rings: ${rError.message}`);
                    throw rError;
                }
            }

            // 3. Save Matches (Batched with Throttling)
            // Flatten map but keep category key association
            const allMatches: { match: Match, categoryKey: string }[] = [];
            matches.forEach((ms, key) => {
                ms.forEach(m => allMatches.push({ match: m, categoryKey: key }));
            });

            if (allMatches.length > 0) {
                const MATCH_BATCH_SIZE = 20;
                for (let i = 0; i < allMatches.length; i += MATCH_BATCH_SIZE) {
                    const batch = allMatches.slice(i, i + MATCH_BATCH_SIZE);

                    const { error: mError } = await supabase
                        .from('matches')
                        .upsert(batch.map(item => ({
                            id: item.match.id,
                            tournament_id: tournamentId,
                            category_key: item.categoryKey,
                            bout_number: String(item.match.bout_number || '0'),
                            red_id: (typeof item.match.red === 'object' && item.match.red) ? item.match.red.id : ((item.match.red === 'BYE') ? null : null),
                            blue_id: (typeof item.match.blue === 'object' && item.match.blue) ? item.match.blue.id : null,
                            winner_id: (typeof item.match.winner === 'object' && item.match.winner) ? item.match.winner.id : null,
                            ring_id: item.match.ring,
                            round_name: item.match.round,
                            next_match_id: item.match.nextMatchId
                        })), { onConflict: 'id' });

                    if (mError) {
                        console.error("Error saving matches batch:", mError);
                        alert(`Failed to save matches: ${mError.message}`);
                        throw mError;
                    }

                    await wait(100);
                }
            }

            console.log("Save complete for", tournamentId);

        } catch (err: any) {
            console.error("Save failed:", err);
            // Alert is already shown in specific blocks
        } finally {
            setIsSaving(false);
        }
    };

    const updateMatches = async (matchesToUpdate: Match[]) => {
        if (!tournamentId || matchesToUpdate.length === 0) return;

        try {
            const payload = matchesToUpdate.map(m => {
                // Find category key for this match
                let categoryKey: string | undefined;
                for (const [key, list] of matches.entries()) {
                    if (list.some(existing => existing.id === m.id)) {
                        categoryKey = key;
                        break;
                    }
                }

                // If not found in current map (edge case), try legacy deduction
                if (!categoryKey) {
                    if (m.red && typeof m.red !== 'string') categoryKey = m.red.category_key;
                    else if (m.blue && typeof m.blue !== 'string') categoryKey = m.blue.category_key;
                }

                return {
                    id: m.id,
                    tournament_id: tournamentId,
                    category_key: categoryKey,
                    bout_number: String(m.bout_number || '0'),
                    red_id: (typeof m.red === 'object' && m.red) ? m.red.id : ((m.red === 'BYE') ? null : null),
                    blue_id: (typeof m.blue === 'object' && m.blue) ? m.blue.id : null,
                    winner_id: (typeof m.winner === 'object' && m.winner) ? m.winner.id : null,
                    ring_id: m.ring,
                    round_name: m.round,
                    next_match_id: m.nextMatchId
                };
            });

            const { error } = await supabase.from('matches').upsert(payload, { onConflict: 'id' });

            if (error) {
                console.error("Failed to update matches:", error);
                throw error;
            }
        } catch (error) {
            console.error("Error in updateMatches:", error);
        }
    };

    const deleteTournament = async (id: string) => {
        if (!confirm("Are you sure you want to delete this tournament and ALL its data?")) return;

        const { error } = await supabase.from('tournaments').delete().eq('id', id);
        if (error) {
            alert("Failed to delete: " + error.message);
        } else {
            // If current, exit
            if (tournamentId === id) {
                exitTournament();
            }
            // Reload recents potentially handled by Lobby listening or UI refresh
        }
    };

    const exitTournament = () => {
        setTournamentId(null);
        setTournamentName(null);
        localStorage.removeItem('mtkd_tournament_id');
        localStorage.removeItem('mtkd_tournament_name');
        setParticipants([]);
        setRings([]);
        setCategorySummaries([]);
        setMatches(new Map());
    };

    const resetData = async () => {
        if (!tournamentId) return;

        // Clear DB tables for this tournament
        await supabase.from('participants').delete().eq('tournament_id', tournamentId);
        await supabase.from('rings').delete().eq('tournament_id', tournamentId);
        await supabase.from('matches').delete().eq('tournament_id', tournamentId);

        // Clear State
        setParticipants([]);
        setRings([]);
        setCategorySummaries([]);
        setMatches(new Map());
    };

    const resetParticipants = async () => {
        if (!tournamentId) return;

        // Clear participants and all related data
        await supabase.from('matches').delete().eq('tournament_id', tournamentId);
        await supabase.from('participants').delete().eq('tournament_id', tournamentId);

        setParticipants([]);
        setCategorySummaries([]);
        setMatches(new Map());
    };

    const resetRings = async () => {
        if (!tournamentId) return;

        // Clear rings (matches stay but lose ring assignment)
        await supabase.from('rings').delete().eq('tournament_id', tournamentId);

        // Update matches to remove ring assignments
        const allMatches: { match: Match, categoryKey: string }[] = [];
        matches.forEach((ms, key) => {
            ms.forEach(m => allMatches.push({ match: { ...m, ring: undefined }, categoryKey: key }));
        });

        if (allMatches.length > 0) {
            await supabase
                .from('matches')
                .upsert(allMatches.map(item => ({
                    id: item.match.id,
                    tournament_id: tournamentId,
                    ring_id: null
                })), { onConflict: 'id' });
        }

        setRings([]);
        // Update local matches to remove ring
        const updatedMatches = new Map<string, Match[]>();
        matches.forEach((list, key) => {
            updatedMatches.set(key, list.map(m => ({ ...m, ring: undefined })));
        });
        setMatches(updatedMatches);
    };

    const resetBrackets = async () => {
        if (!tournamentId) return;

        // Clear all matches (brackets)
        await supabase.from('matches').delete().eq('tournament_id', tournamentId);

        setMatches(new Map());
    };

    const resetMatchResults = async () => {
        if (!tournamentId) return;

        // Clear winners from all matches but keep bracket structure
        const allMatches: Match[] = [];
        matches.forEach((list) => {
            list.forEach(m => allMatches.push(m));
        });

        if (allMatches.length > 0) {
            await supabase
                .from('matches')
                .upsert(allMatches.map(m => ({
                    id: m.id,
                    tournament_id: tournamentId,
                    winner_id: null
                })), { onConflict: 'id' });
        }

        // Update local matches to remove winners
        const updatedMatches = new Map<string, Match[]>();
        matches.forEach((list, key) => {
            updatedMatches.set(key, list.map(m => ({ ...m, winner: undefined })));
        });
        setMatches(updatedMatches);
    };

    return (
        <TournamentContext.Provider value={{
            tournamentId,
            tournamentName,
            setTournamentInfo,
            participants,
            setParticipants,
            rings,
            setRings,
            categorySummaries,
            setCategorySummaries,
            matches,
            setMatches,
            loadTournament,
            saveData,
            updateMatches,
            deleteTournament,
            exitTournament,
            resetData,
            resetParticipants,
            resetRings,
            resetBrackets,
            resetMatchResults,
            isSaving,
            deleteRing: async (ringId: string) => {
                if (!tournamentId) return;
                // Delete from DB
                const { error } = await supabase.from('rings').delete().eq('id', ringId);
                if (error) {
                    console.error("Failed to delete ring", error);
                    alert("Failed to delete ring: " + error.message);
                    return;
                }
                // Update Local State
                const updatedRings = rings.filter(r => r.id !== ringId);
                setRings(updatedRings);

                // Also need to clear ring assignments from matches locally if we want consistency?
                // The DB might cascade if configured, but let's just clear the ring_id locally if needed.
                // For now, removing the ring is enough, matches will be re-generated or ring_id will point to nothing.
            }
        }}>
            {children}
        </TournamentContext.Provider>
    );
};

export const useTournament = () => {
    const context = useContext(TournamentContext);
    if (!context) {
        throw new Error('useTournament must be used within a TournamentProvider');
    }
    return context;
};
