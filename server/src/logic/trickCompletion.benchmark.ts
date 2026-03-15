import { GameType } from './types';

const ITERATIONS = 10_000_000;

// Setup a mock state simulating a non-Hochzeit game (which is the most common case)
const stateNormal = {
    gameType: GameType.Normal,
    rePlayerIds: ['p1', 'p2'],
    players: [
        { tricks: [{}, {}, {}] },
        { tricks: [{}] },
        { tricks: [{}, {}] },
        { tricks: [{}, {}, {}, {}] },
    ],
};

// Setup a mock state simulating a Hochzeit game where partner is not yet found
const stateHochzeit = {
    gameType: GameType.Hochzeit,
    rePlayerIds: ['p1'],
    players: [
        { tricks: [{}, {}, {}] },
        { tricks: [{}] },
        { tricks: [{}, {}] },
        { tricks: [{}, {}, {}, {}] },
    ],
};

console.log(`Running benchmark with ${ITERATIONS.toLocaleString()} iterations...`);

// 1. Baseline: Current Implementation (Normal Game)
console.log('\n--- Normal Game (Most Common Case) ---');
const startBaselineNormal = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    const totalTricksCompleted = stateNormal.players.reduce((sum, p) => sum + p.tricks.length, 0);
    if (stateNormal.gameType === GameType.Hochzeit && stateNormal.rePlayerIds.length === 1) {
        if (totalTricksCompleted <= 3) {
            // ...
        }
    }
}
const endBaselineNormal = performance.now();
const durationBaselineNormal = endBaselineNormal - startBaselineNormal;
console.log(`Baseline (Always reduce): ${durationBaselineNormal.toFixed(2)} ms`);

// 2. Optimized: Deferred & Direct Sum (Normal Game)
const startOptimizedNormal = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    if (stateNormal.gameType === GameType.Hochzeit && stateNormal.rePlayerIds.length === 1) {
        let totalTricksCompleted = 0;
        for (let j = 0; j < stateNormal.players.length; j++) {
            totalTricksCompleted += stateNormal.players[j].tricks.length;
        }
        if (totalTricksCompleted <= 3) {
            // ...
        }
    }
}
const endOptimizedNormal = performance.now();
const durationOptimizedNormal = endOptimizedNormal - startOptimizedNormal;
console.log(`Optimized (Deferred + Loop): ${durationOptimizedNormal.toFixed(2)} ms`);
console.log(`Improvement: ${((durationBaselineNormal - durationOptimizedNormal) / durationBaselineNormal * 100).toFixed(2)}% faster`);


// 3. Baseline: Current Implementation (Hochzeit Game)
console.log('\n--- Hochzeit Game (Partner not found) ---');
const startBaselineHochzeit = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    const totalTricksCompleted = stateHochzeit.players.reduce((sum, p) => sum + p.tricks.length, 0);
    if (stateHochzeit.gameType === GameType.Hochzeit && stateHochzeit.rePlayerIds.length === 1) {
        if (totalTricksCompleted <= 3) {
            // ...
        }
    }
}
const endBaselineHochzeit = performance.now();
const durationBaselineHochzeit = endBaselineHochzeit - startBaselineHochzeit;
console.log(`Baseline (Always reduce): ${durationBaselineHochzeit.toFixed(2)} ms`);

// 4. Optimized: Deferred & Direct Sum (Hochzeit Game)
const startOptimizedHochzeit = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    if (stateHochzeit.gameType === GameType.Hochzeit && stateHochzeit.rePlayerIds.length === 1) {
        let totalTricksCompleted = 0;
        for (let j = 0; j < stateHochzeit.players.length; j++) {
            totalTricksCompleted += stateHochzeit.players[j].tricks.length;
        }
        if (totalTricksCompleted <= 3) {
            // ...
        }
    }
}
const endOptimizedHochzeit = performance.now();
const durationOptimizedHochzeit = endOptimizedHochzeit - startOptimizedHochzeit;
console.log(`Optimized (Deferred + Loop): ${durationOptimizedHochzeit.toFixed(2)} ms`);
console.log(`Improvement: ${((durationBaselineHochzeit - durationOptimizedHochzeit) / durationBaselineHochzeit * 100).toFixed(2)}% faster`);
