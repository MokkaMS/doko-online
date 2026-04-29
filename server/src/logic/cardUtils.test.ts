import { describe, it, expect } from 'bun:test';
import { createDeck, shuffle } from './cardUtils';
import { Suit, CardValue } from './types';

describe('cardUtils.createDeck', () => {
    it('should create a deck with 40 cards when mitNeunen is false', () => {
        const deck = createDeck(false);
        expect(deck.length).toBe(40);
    });

    it('should create a deck with 48 cards when mitNeunen is true', () => {
        const deck = createDeck(true);
        expect(deck.length).toBe(48);
    });

    it('should have unique IDs for all cards', () => {
        const deck = createDeck(true);
        const ids = deck.map(c => c.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(deck.length);
    });

    it('should have correct ID format', () => {
        const deck = createDeck(true);
        // Format: suit-value-i
        deck.forEach(card => {
            const parts = card.id.split('-');
            expect(parts.length).toBe(3);
            expect(Object.values(Suit)).toContain(parts[0] as Suit);
            expect(Object.values(CardValue)).toContain(parts[1] as CardValue);
            expect(['0', '1']).toContain(parts[2]);
        });
    });

    it('should contain two of each card', () => {
        const deck = createDeck(false);
        const counts: Record<string, number> = {};
        deck.forEach(card => {
            const key = `${card.suit}-${card.value}`;
            counts[key] = (counts[key] || 0) + 1;
        });
        Object.values(counts).forEach(count => {
            expect(count).toBe(2);
        });
    });
});

describe('cardUtils.shuffle', () => {
    it('should maintain the same number of cards', () => {
        const deck = createDeck(true);
        const shuffled = shuffle(deck);
        expect(shuffled.length).toBe(deck.length);
    });

    it('should contain all original cards', () => {
        const deck = createDeck(true);
        const shuffled = shuffle(deck);
        const originalIds = new Set(deck.map(c => c.id));
        shuffled.forEach(card => {
            expect(originalIds.has(card.id)).toBe(true);
        });
    });

    it('should change the order of cards', () => {
        const deck = createDeck(true);
        const shuffled = shuffle(deck);

        // It's statistically extremely unlikely that a 48-card deck
        // remains in the exact same order after shuffling.
        let isDifferent = false;
        for (let i = 0; i < deck.length; i++) {
            if (deck[i].id !== shuffled[i].id) {
                isDifferent = true;
                break;
            }
        }
        expect(isDifferent).toBe(true);
    });

    it('should not mutate the original deck', () => {
        const deck = createDeck(true);
        const originalOrder = deck.map(c => c.id);
        shuffle(deck);
        const currentOrder = deck.map(c => c.id);
        expect(currentOrder).toEqual(originalOrder);
    });
});
