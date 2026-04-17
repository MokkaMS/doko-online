import { GameEngine } from './GameEngine';
import { GameState, Player, Team, GameType, Suit, CardValue, Card } from './types';

const createPlayer = (id: string, team: Team, points: number): Player => ({
    id,
    name: `Player ${id}`,
    isBot: false,
    hand: [],
    team,
    isRevealed: true,
    points,
    tournamentPoints: 0,
    tricks: [],
});

const state: GameState = {
    players: [
        createPlayer('p1', 'Re', 100),
        createPlayer('p2', 'Re', 30),
        createPlayer('p3', 'Kontra', 50),
        createPlayer('p4', 'Kontra', 60),
    ],
    currentPlayerIndex: 0,
    dealerIndex: 0,
    currentTrick: [],
    trickStarterIndex: 0,
    trickWinnerIndex: null,
    gameType: GameType.Normal,
    trumpSuit: null,
    rePlayerIds: ['p1', 'p2'],
    kontraPlayerIds: ['p3', 'p4'],
    announcements: {},
    reKontraAnnouncements: {},
    specialPoints: { re: [], kontra: [] },
    notifications: [],
    currentTrickNotifications: [],
    phase: 'Finished',
};

const ITERATIONS = 1_000_000;

console.log('Running GameEngine.calculateGameResult benchmark (baseline)...');

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    GameEngine.calculateGameResult(state);
}
const end = performance.now();

const duration = end - start;
console.log(`Time taken for ${ITERATIONS.toLocaleString()} iterations: ${duration.toFixed(2)} ms`);
console.log(`Average time per call: ${(duration / ITERATIONS * 1000).toFixed(4)} μs`);
