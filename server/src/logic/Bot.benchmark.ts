import { Bot } from './Bot';
import { Player, GameSettings, Card, Suit, CardValue } from './types';
import { createDeck } from './cardUtils';

const ITERATIONS = 1_000_000;

const deck = createDeck(true); // 48 cards
const hand: Card[] = deck.slice(0, 12); // Give some cards

const player: Player = {
    id: 'p1',
    name: 'Bot',
    isBot: true,
    hand: hand,
    team: 'Unknown',
    points: 0,
    tournamentPoints: 0,
    tricks: [],
};

const settings: GameSettings = {
    mitNeunen: true,
    dullenAlsHoechste: true,
    schweinchen: false,
    fuchsGefangen: true,
    karlchen: true,
    karlchenGefangen: true,
    doppelkopfPunkte: true,
    soloPrioritaet: true,
};

console.log(`Running Bot.evaluateHandForBid benchmark with ${ITERATIONS.toLocaleString()} iterations...`);

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    Bot.evaluateHandForBid(player, settings);
}
const end = performance.now();

const duration = end - start;
console.log(`Baseline Time: ${duration.toFixed(2)} ms`);
console.log(`Average time per call: ${(duration / ITERATIONS).toFixed(6)} ms`);
