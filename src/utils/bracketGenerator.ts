

export const calculateBracketSize = (playerCount: number): number => {
    if (playerCount <= 1) return 2; // Minimum bracket size
    if (playerCount > 256) return 256; // Max cap as per requirements (129-286 -> 256 matches? Wait, 256 bracket size supports 256 players. 129-286 players need 256 bracket? No, 256 bracket supports 256 players. If 286, we need 512? Prompt says "129-286 -> 256". Wait. 256 bracket size means 256 slots. If 286 players, we need 512 slots.
    // Prompt says: "129-286 256 128". This table seems to imply Bracket Size is the number of matches? Or slots?
    // "Player Count: 129-286, Bracket Size: 256, Matches: 128"
    // If Bracket Size is 256, it fits 256 players.
    // If we have 286 players, we need 512 slots.
    // BUT the prompt explicitly says "Maximum bracket size allowed: 256".
    // And "129-286 -> 256". This implies if > 256, we cap at 256? Or maybe the prompt means 256 matches?
    // "Bracket Size 256" usually means 256 positions.
    // If 286 players, and max bracket is 256, we can't fit them.
    // However, "Matches: 128" for "Bracket Size: 256" is correct for a 256-size bracket (128 matches in first round).
    // If 286 players, maybe we have a prelim round?
    // "Always select the next power of two".
    // If 286, next power of two is 512.
    // But "Maximum bracket size allowed: 256".
    // This is a contradiction if players > 256.
    // I will assume for now that if players > 256, we might have an issue or the prompt implies we treat it as 256 and maybe some have to fight extra?
    // Or maybe "286" is a typo and it should be 256?
    // "Supports up to 286 players per category".
    // If I have 286 players, and max bracket is 256.
    // Maybe I should use 512 if > 256? But "Maximum bracket size allowed: 256".
    // I will stick to "Next Power of Two" logic. If > 256, I will return 512 if allowed, but if strictly capped, I might need to clarify.
    // Given "Supports up to 286", and "Max bracket size 256", maybe it means the *visual* bracket?
    // Or maybe the table is:
    // 65-128 -> 128
    // 129-256 -> 256
    // 257-286 -> 512?
    // But "Maximum bracket size allowed: 256".
    // I will assume standard power of 2 logic. Math.pow(2, Math.ceil(Math.log2(n))).

    const size = Math.pow(2, Math.ceil(Math.log2(playerCount)));
    return size;
};

export const generateByes = (bracketSize: number, playerCount: number): number => {
    return bracketSize - playerCount;
};
