import { GameEngine } from './GameEngine';
import { GameState, Player, Team } from './types';

const createPlayer = (id: string, team: Team, isRevealed: boolean): Player => ({
    id,
    name: `Player ${id}`,
    isBot: false,
    hand: [],
    team,
    isRevealed,
    points: 0,
    tournamentPoints: 0,
    tricks: [],
});

const state = {
    rePlayerIds: ['p1', 'p2'],
    kontraPlayerIds: ['p3', 'p4'],
    players: [
        createPlayer('p1', 'Re', true),
        createPlayer('p2', 'Re', false),
        createPlayer('p3', 'Kontra', true),
        createPlayer('p4', 'Kontra', false),
    ],
} as unknown as GameState;

const ITERATIONS = 10_000_000;

console.log('Running GameEngine.checkAndRevealRemainingPlayers benchmark...');

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    // Modify state slightly to ensure compiler doesn't optimize away the call completely
    state.players[1].isRevealed = (i % 2 === 0);
    GameEngine.checkAndRevealRemainingPlayers(state);
}
const end = performance.now();

const duration = end - start;
console.log(`Time taken for ${ITERATIONS.toLocaleString()} iterations: ${duration.toFixed(2)} ms`);
