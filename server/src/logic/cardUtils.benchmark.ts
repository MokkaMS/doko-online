import { createDeck } from './cardUtils';

const ITERATIONS = 1_000_000;

console.log(`Running createDeck benchmark with ${ITERATIONS.toLocaleString()} iterations...`);

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
    createDeck(true);
}
const end = performance.now();

const duration = end - start;
console.log(`Time taken: ${duration.toFixed(2)} ms`);
console.log(`Average time per createDeck: ${(duration / ITERATIONS).toFixed(6)} ms`);
