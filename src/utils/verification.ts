import { seedParticipants } from './seedingAlgorithm';
import { generateMatches } from './matchGenerator';
import type { Participant } from '../types';

const createParticipant = (name: string, club: string): Participant => ({
    id: name,
    name,
    club,
    category: 'CAT',
    gender: 'M',
    category_key: 'CAT M'
});

const runTest = () => {
    console.log('Running Verification Test...');

    // Scenario 1: 4 Club A, 4 Club B
    const participants: Participant[] = [
        createParticipant('A1', 'Club A'),
        createParticipant('A2', 'Club A'),
        createParticipant('A3', 'Club A'),
        createParticipant('A4', 'Club A'),
        createParticipant('B1', 'Club B'),
        createParticipant('B2', 'Club B'),
        createParticipant('B3', 'Club B'),
        createParticipant('B4', 'Club B'),
    ];

    console.log('Scenario 1: 4 Club A, 4 Club B (Total 8)');
    const seeded = seedParticipants(participants);
    console.log('Seeded Order:', seeded.map(p => (typeof p === 'string' ? p : `${p.name} (${p.club})`)).join(', '));

    const matchGroups = generateMatches(seeded, 'CAT M', 'RING A');
    const matches = matchGroups.flatMap(g => g.matches);
    const round1 = matches.filter(m => m.round.includes('Quarter') || m.round === 'Round 1'); // 8 players -> Quarter Final is Round 1

    console.log('Round 1 Matches:');
    let collisions = 0;
    round1.forEach(m => {
        const r = m.red;
        const b = m.blue;
        const rName = typeof r === 'string' ? r : r?.name;
        const bName = typeof b === 'string' ? b : b?.name;
        const rClub = typeof r === 'string' ? '' : r?.club;
        const bClub = typeof b === 'string' ? '' : b?.club;

        console.log(`${rName} (${rClub}) vs ${bName} (${bClub})`);

        if (rClub && bClub && rClub === bClub) {
            console.error('❌ COLLISION DETECTED!');
            collisions++;
        }
    });

    if (collisions === 0) {
        console.log('✅ No collisions in Round 1.');
    } else {
        console.log(`⚠️ ${collisions} collisions found.`);
    }
};

runTest();
