import { expect, test, describe } from "vitest";
import { GameEngine } from './GameEngine';
import { CardValue, Suit, Card } from './types';

describe('GameEngine.calculateTrickPoints', () => {
  test('should return 0 for an empty trick', () => {
    expect(GameEngine.calculateTrickPoints([])).toBe(0);
  });

  test('should correctly sum points for a standard trick', () => {
    const trick: Card[] = [
      { suit: Suit.Kreuz, value: CardValue.Ass, id: '1' },   // 11
      { suit: Suit.Kreuz, value: CardValue.Zehn, id: '2' },  // 10
      { suit: Suit.Kreuz, value: CardValue.Koenig, id: '3' }, // 4
      { suit: Suit.Kreuz, value: CardValue.Dame, id: '4' },   // 3
    ];
    expect(GameEngine.calculateTrickPoints(trick)).toBe(28);
  });

  test('should correctly handle Bube and Neun', () => {
    const trick: Card[] = [
      { suit: Suit.Pik, value: CardValue.Bube, id: '5' }, // 2
      { suit: Suit.Pik, value: CardValue.Neun, id: '6' }, // 0
      { suit: Suit.Herz, value: CardValue.Ass, id: '7' }, // 11
      { suit: Suit.Karo, value: CardValue.Zehn, id: '8' }, // 10
    ];
    expect(GameEngine.calculateTrickPoints(trick)).toBe(23);
  });

  test('should correctly sum points for all card values', () => {
    const allValuesTrick: Card[] = [
      { suit: Suit.Kreuz, value: CardValue.Ass, id: '1' },    // 11
      { suit: Suit.Kreuz, value: CardValue.Zehn, id: '2' },   // 10
      { suit: Suit.Kreuz, value: CardValue.Koenig, id: '3' }, // 4
      { suit: Suit.Kreuz, value: CardValue.Dame, id: '4' },   // 3
      { suit: Suit.Kreuz, value: CardValue.Bube, id: '5' },   // 2
      { suit: Suit.Kreuz, value: CardValue.Neun, id: '6' },   // 0
    ];
    expect(GameEngine.calculateTrickPoints(allValuesTrick)).toBe(30);
  });

  test('should be independent of suits', () => {
    const trick1: Card[] = [
      { suit: Suit.Kreuz, value: CardValue.Ass, id: '1' },
    ];
    const trick2: Card[] = [
      { suit: Suit.Karo, value: CardValue.Ass, id: '2' },
    ];
    expect(GameEngine.calculateTrickPoints(trick1)).toBe(GameEngine.calculateTrickPoints(trick2));
    expect(GameEngine.calculateTrickPoints(trick1)).toBe(11);
  });
});
