
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Participant, Ring, CategorySummary, Match, CategoryStatus } from '../types';
import { supabase } from '../lib/supabase';
import { generateCategoryTally } from '../utils/tallyGenerator';

interface TournamentContextType {
    tournamentId: string | null;
    tournamentName: string | null;
    pin: string;
    setTournamentInfo: (id: string, name: string) => void;
    updatePin: (newPin: string) => Promise<boolean>;

    participants: Participant[];
    setParticipants: (p: Participant[]) => void;
    rings: Ring[];
    setRings: (r: Ring[]) => void;
    categorySummaries: CategorySummary[];
    setCategorySummaries: (s: CategorySummary[]) => void;
    matches: Map<string, Match[]>;
    setMatches: (m: Map<string, Match[]>) => void;
    categoryStatus: Map<string, CategoryStatus>;
    updateCategoryStatus: (categoryKey: string, given: boolean) => Promise<void>;

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
    const [pin, setPin] = useState<string>('123456');

    const [participants, setParticipants] = useState<Participant[]>([]);
    const [rings, setRings] = useState<Ring[]>([]);
    const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([]);
    const [matches, setMatches] = useState<Map<string, Match[]>>(new Map());
    const [categoryStatus, setCategoryStatus] = useState<Map<string, CategoryStatus>>(new Map());
    const [isSaving, setIsSaving] = useState(false);

    const updateCategoryStatus = async (categoryKey: string, given: boolean) => {
        if (!tournamentId) return;

        // Optimistic Update
        const newMap = new Map(categoryStatus);
        const existing = newMap.get(categoryKey);
        const now = new Date().toISOString();

        if (existing) {
            newMap.set(categoryKey, { ...existing, medals_given: given, updated_at: now });
        } else {
            newMap.set(categoryKey, { id: 'temp', category_key: categoryKey, medals_given: given, updated_at: now });
        }
        setCategoryStatus(newMap);

        // DB Update
        const { error } = await supabase
            .from('category_tracking')
            .upsert({
                tournament_id: tournamentId,
                category_key: categoryKey,
                medals_given: given,
                updated_at: now
            }, { onConflict: 'tournament_id,category_key' });

        if (error) {
            console.error("Failed to update status:", error);
            alert("Failed to update status: " + error.message);
            // Revert would go here (omitted for brevity)
        }
    };

    const updatePin = async (newPin: string): Promise<boolean> => {
        if (!tournamentId) return false;

        // Optimistic update
        const oldPin = pin;
        setPin(newPin);

        const { error } = await supabase
            .from('tournaments')
            .update({ pin: newPin })
            .eq('id', tournamentId);

        if (error) {
            console.error("Failed to update PIN:", error);
            // Revert on error
            setPin(oldPin);
            alert("Failed to save PIN to database: " + error.message);
            return false;
        }
        return true;
    };

    const setTournamentInfo = (id: string, name: string) => {
        setTournamentId(id);
        setTournamentName(name);
        localStorage.setItem('mtkd_tournament_id', id);
        localStorage.setItem('mtkd_tournament_name', name);
    };

    // Restore session on mount OR fetch latest if missing
    useEffect(() => {
        const storedId = localStorage.getItem('mtkd_tournament_id');
        const storedName = localStorage.getItem('mtkd_tournament_name');
        if (storedId && storedName) {
            setTournamentId(storedId);
            setTournamentName(storedName);
        } else {
            // Auto-load the most recent tournament if local storage is empty
            // BUT only if we are not on the lobby or login page (to allow switching/logout)
            if (!window.location.pathname.includes('/lobby') && !window.location.pathname.includes('/login')) {
                const fetchLatest = async () => {
                    const { data, error } = await supabase
                        .from('tournaments')
                        .select('id, name')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    if (data && !error) {
                        console.log("Auto-loading tournament:", data.name);
                        setTournamentInfo(data.id, data.name);
                    }
                };
                fetchLatest();
            }
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
            setCategorySummaries([]);
            setMatches(new Map());
            setCategoryStatus(new Map());
        }
    }, [tournamentId]);

    const loadTournament = async (id: string) => {
        try {
            // 1. Load Tournament Details (Name & PIN)
            const { data: tourData } = await supabase
                .from('tournaments')
                .select('name, pin')
                .eq('id', id)
                .single();

            if (tourData) {
                setTournamentName(tourData.name);
                setPin(tourData.pin || '123456');
                // Update local storage for persistence
                localStorage.setItem('mtkd_tournament_name', tourData.name);
            }

            // 2. Load Rings
            const { data: ringsData } = await supabase.from('rings').select('*').eq('tournament_id', id);
            if (ringsData) {
                const parsedRings = ringsData.map(r => ({
                    ...r,
                    priorityGroups: typeof r.priority_groups === 'string' ? JSON.parse(r.priority_groups) : r.priority_groups,
                    orderIndex: r.order_index || 0
                }));
                // Sort by orderIndex
                parsedRings.sort((a, b) => (a.orderIndex - b.orderIndex));
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
                                // Infer BYE status:
                                // If a side is NULL (no ID), but a winner is declared matching the opponent, it was a BYE.
                                let redVal: Participant | 'BYE' | null = m.red_id ? (partMap.get(m.red_id) || null) : null;
                                let blueVal: Participant | 'BYE' | null = m.blue_id ? (partMap.get(m.blue_id) || null) : null;

                                if (!redVal && m.winner_id && m.blue_id && m.winner_id === m.blue_id) {
                                    redVal = 'BYE';
                                }
                                if (!blueVal && m.winner_id && m.red_id && m.winner_id === m.red_id) {
                                    blueVal = 'BYE';
                                }

                                const matchObj: Match = {
                                    id: m.id,
                                    bout_number: m.bout_number?.toString() || '0',
                                    red: redVal,
                                    blue: blueVal,
                                    round: m.round_name,
                                    ring: m.ring_id,
                                    winner: m.winner_id ? partMap.get(m.winner_id) : undefined,
                                    nextMatchId: m.next_match_id,
                                    leftChildId: m.left_child_id || undefined, // Hydrate from DB
                                    rightChildId: m.right_child_id || undefined,
                                    score: m.score ?? undefined,
                                    rank: m.rank ?? undefined,
                                    is_table_mode: m.is_table_mode ?? undefined
                                };

                                if (!newMap.has(categoryKey)) {
                                    newMap.set(categoryKey, []);
                                }
                                newMap.get(categoryKey)?.push(matchObj);
                            }
                        });

                        // Sort by bout number (Robust Alphanumeric Parsing - User Provided)
                        const getBoutNum = (s: string) => {
                            const match = s.match(/(\d+)/);
                            return match ? parseInt(match[1], 10) : 99999;
                        };
                        newMap.forEach(list => list.sort((a, b) => getBoutNum(a.bout_number || '0') - getBoutNum(b.bout_number || '0')));

                        // Reconstruct tree structure if missing (legacy data fallback)
                        newMap.forEach((matchesList) => {
                            const matchLookup = new Map<string, Match>();
                            matchesList.forEach(m => matchLookup.set(m.id, m));

                            matchesList.forEach(match => {
                                if (match.nextMatchId) {
                                    const parent = matchLookup.get(match.nextMatchId);
                                    if (parent) {
                                        // Only if DB didn't provide children (backward compatibility)
                                        if (!parent.leftChildId && !parent.rightChildId) {
                                            if (match.id !== parent.leftChildId && match.id !== parent.rightChildId) {
                                                if (!parent.leftChildId) parent.leftChildId = match.id;
                                                else parent.rightChildId = match.id;
                                            }
                                        }
                                    }
                                }
                            });
                        });

                        setMatches(newMap);
                    } else {
                        // Ensure stale matches are cleared when none exist in DB
                        setMatches(new Map());
                    }

                    // 4. Load Category Status
                    const { data: statusData } = await supabase.from('category_tracking').select('*').eq('tournament_id', id);
                    if (statusData) {
                        const statusMap = new Map<string, CategoryStatus>();
                        statusData.forEach((s: any) => statusMap.set(s.category_key, s));
                        setCategoryStatus(statusMap);
                    } else {
                        setCategoryStatus(new Map());
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
                    .upsert(ringsToSave.map((r, index) => ({
                        id: r.id,
                        tournament_id: tournamentId,
                        name: r.name,
                        priority_groups: r.priorityGroups, // Explicitly map to snake_case column
                        order_index: r.orderIndex ?? index, // Save order
                        bout_mode: r.bout_mode || 'tree_pro' // Save bout mode
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
                const MATCH_BATCH_SIZE = 50;
                for (let i = 0; i < allMatches.length; i += MATCH_BATCH_SIZE) {
                    const batch = allMatches.slice(i, i + MATCH_BATCH_SIZE);

                    const upsertMatches = async () => {
                        return await supabase
                            .from('matches')
                            .upsert(batch.map(item => ({
                                id: item.match.id,
                                tournament_id: tournamentId,
                                bout_number: item.match.bout_number,
                                red_id: item.match.red && item.match.red !== 'BYE' ? item.match.red.id : null,
                                blue_id: item.match.blue && item.match.blue !== 'BYE' ? item.match.blue.id : null,
                                winner_id: item.match.winner && item.match.winner !== 'BYE' ? item.match.winner.id : null,
                                round_name: item.match.round,
                                ring_id: item.match.ring,
                                next_match_id: item.match.nextMatchId,
                                left_child_id: item.match.leftChildId,
                                right_child_id: item.match.rightChildId,
                                category_key: item.categoryKey,
                                score: item.match.score ?? null,
                                rank: item.match.rank ?? null,
                                is_table_mode: item.match.is_table_mode ?? null
                            })), { onConflict: 'id' });
                    };

                    let { error: mError } = await upsertMatches();

                    // Retry logic for matches
                    if (mError) {
                        console.warn(`Match batch ${i / MATCH_BATCH_SIZE + 1} failed, retrying...`);
                        await wait(1000);
                        mError = (await upsertMatches()).error;
                    }

                    if (mError) {
                        console.error(`Error saving matches batch ${i}:`, mError);
                        alert(`Failed to save matches: ${mError.message}`);
                        throw mError;
                    }
                    await wait(200);
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
                    next_match_id: m.nextMatchId,
                    left_child_id: m.leftChildId,
                    right_child_id: m.rightChildId,
                    score: m.score ?? null,
                    rank: m.rank ?? null,
                    is_table_mode: m.is_table_mode ?? null
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
            pin,
            updatePin,
            setTournamentInfo,
            participants,
            setParticipants,
            rings,
            setRings,
            categorySummaries,
            setCategorySummaries,
            matches,
            setMatches,
            categoryStatus,
            updateCategoryStatus, // Exported function
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
