import { GameEngine } from './GameEngine';
import { Card, CardValue, Suit, Player, GameSettings, Team } from './types';

const ITERATIONS = 1_000_000;

const players: Player[] = [
    { id: 'p0', name: 'P0', isBot: false, hand: [], team: 'Re', isRevealed: true, points: 0, tournamentPoints: 0, tricks: [] },
    { id: 'p1', name: 'P1', isBot: false, hand: [], team: 'Kontra', isRevealed: true, points: 0, tournamentPoints: 0, tricks: [] },
    { id: 'p2', name: 'P2', isBot: false, hand: [], team: 'Re', isRevealed: true, points: 0, tournamentPoints: 0, tricks: [] },
    { id: 'p3', name: 'P3', isBot: false, hand: [], team: 'Kontra', isRevealed: true, points: 0, tournamentPoints: 0, tricks: [] },
];

const trick: Card[] = [
    { suit: Suit.Kreuz, value: CardValue.Ass, id: 'c1' },
    { suit: Suit.Karo, value: CardValue.Ass, id: 'c2' }, // Fuchs
    { suit: Suit.Pik, value: CardValue.Ass, id: 'c3' },
    { suit: Suit.Herz, value: CardValue.Ass, id: 'c4' },
];

const settings: GameSettings = {
    mitNeunen: true,
    dullenAlsHoechste: true,
    schweinchen: true,
    fuchsGefangen: true,
    karlchen: true,
    karlchenGefangen: true,
    doppelkopfPunkte: true,
    soloPrioritaet: true,
};

console.log(`Running checkTrickSpecialPoints benchmark with ${ITERATIONS.toLocaleString()} iterations...`);

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    GameEngine.checkTrickSpecialPoints(trick, 0, 0, players, settings, false);
}
const end = performance.now();

console.log(`Time taken: ${(end - start).toFixed(2)} ms`);
