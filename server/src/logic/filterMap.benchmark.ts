import { Player, Team } from './types';

const players: Player[] = [
    { id: 'p1', team: 'Re' } as Player,
    { id: 'p2', team: 'Re' } as Player,
    { id: 'p3', team: 'Kontra' } as Player,
    { id: 'p4', team: 'Kontra' } as Player,
];

const winner: Team = 'Re';
const ITERATIONS = 10_000_000;

console.log(`Running Filter+Map vs For-loop benchmark (${ITERATIONS.toLocaleString()} iterations)...`);

// Filter + Map
const start1 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    const winnerTeam = players.filter(p => p.team === winner).map(p => p.id);
}
const end1 = performance.now();
const duration1 = end1 - start1;
console.log(`Filter+Map: ${duration1.toFixed(2)} ms`);

// For loop
const start2 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    const winnerTeam: string[] = [];
    for (let j = 0; j < players.length; j++) {
        if (players[j].team === winner) {
            winnerTeam.push(players[j].id);
        }
    }
}
const end2 = performance.now();
const duration2 = end2 - start2;
console.log(`For-loop: ${duration2.toFixed(2)} ms`);

console.log(`Improvement: ${((duration1 - duration2) / duration1 * 100).toFixed(2)}%`);
