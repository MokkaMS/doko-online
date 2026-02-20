import { describe, it, expect } from 'vitest';
import {
  isTrump,
  getCardPower,
  sortCards,
  createDeck,
  shuffle,
} from '../cardUtils';
import { Card, CardValue, Suit, GameType, GameSettings } from '../types';

// Helper to create a card
const createCard = (suit: Suit, value: CardValue): Card => ({
  suit,
  value,
  id: `${suit}-${value}-0`,
});

const defaultSettings: GameSettings = {
  mitNeunen: true,
  dullenAlsHoechste: false,
  schweinchen: false,
  fuchsGefangen: false,
  karlchen: false,
  doppelkopfPunkte: false,
  soloPrioritaet: false,
};

describe('cardUtils', () => {
  describe('isTrump', () => {
    it('should identify trumps in a Normal game', () => {
      const settings = { ...defaultSettings };
      // Normal game: Queens, Jacks, Diamonds (Karo) are trumps

      // Queens
      expect(isTrump(createCard(Suit.Herz, CardValue.Dame), GameType.Normal, null, settings)).toBe(true);
      expect(isTrump(createCard(Suit.Pik, CardValue.Dame), GameType.Normal, null, settings)).toBe(true);

      // Jacks
      expect(isTrump(createCard(Suit.Kreuz, CardValue.Bube), GameType.Normal, null, settings)).toBe(true);
      expect(isTrump(createCard(Suit.Karo, CardValue.Bube), GameType.Normal, null, settings)).toBe(true);

      // Diamonds (Karo)
      expect(isTrump(createCard(Suit.Karo, CardValue.Ass), GameType.Normal, null, settings)).toBe(true);
      expect(isTrump(createCard(Suit.Karo, CardValue.Zehn), GameType.Normal, null, settings)).toBe(true);
      expect(isTrump(createCard(Suit.Karo, CardValue.Neun), GameType.Normal, null, settings)).toBe(true);

      // Non-trumps (Fehlfarben)
      expect(isTrump(createCard(Suit.Herz, CardValue.Ass), GameType.Normal, null, settings)).toBe(false);
      expect(isTrump(createCard(Suit.Pik, CardValue.Zehn), GameType.Normal, null, settings)).toBe(false);
      expect(isTrump(createCard(Suit.Kreuz, CardValue.Koenig), GameType.Normal, null, settings)).toBe(false);
    });

    it('should handle "Dullen als höchste" setting', () => {
      const settingsWithDulle = { ...defaultSettings, dullenAlsHoechste: true };
      const settingsWithoutDulle = { ...defaultSettings, dullenAlsHoechste: false };

      const herz10 = createCard(Suit.Herz, CardValue.Zehn);

      // In Normal game, Herz 10 is NOT trump by default (it's a Fehlfarbe)
      expect(isTrump(herz10, GameType.Normal, null, settingsWithoutDulle)).toBe(false);

      // With setting, it IS trump
      expect(isTrump(herz10, GameType.Normal, null, settingsWithDulle)).toBe(true);
    });

    it('should identify trumps in DamenSolo', () => {
      const settings = { ...defaultSettings };
      // Only Queens are trump
      expect(isTrump(createCard(Suit.Herz, CardValue.Dame), GameType.DamenSolo, null, settings)).toBe(true);
      expect(isTrump(createCard(Suit.Kreuz, CardValue.Dame), GameType.DamenSolo, null, settings)).toBe(true);

      // Jacks are NOT trump
      expect(isTrump(createCard(Suit.Kreuz, CardValue.Bube), GameType.DamenSolo, null, settings)).toBe(false);

      // Diamonds are NOT trump
      expect(isTrump(createCard(Suit.Karo, CardValue.Ass), GameType.DamenSolo, null, settings)).toBe(false);
    });

    it('should identify trumps in BubenSolo', () => {
      const settings = { ...defaultSettings };
      // Only Jacks are trump
      expect(isTrump(createCard(Suit.Herz, CardValue.Bube), GameType.BubenSolo, null, settings)).toBe(true);

      // Queens are NOT trump
      expect(isTrump(createCard(Suit.Herz, CardValue.Dame), GameType.BubenSolo, null, settings)).toBe(false);
    });

    it('should identify trumps in FarbenSolo', () => {
      const settings = { ...defaultSettings };
      const trumpSuit = Suit.Pik;

      // Queens and Jacks are always trump
      expect(isTrump(createCard(Suit.Herz, CardValue.Dame), GameType.FarbenSolo, trumpSuit, settings)).toBe(true);
      expect(isTrump(createCard(Suit.Karo, CardValue.Bube), GameType.FarbenSolo, trumpSuit, settings)).toBe(true);

      // The chosen suit (Pik) is trump
      expect(isTrump(createCard(Suit.Pik, CardValue.Ass), GameType.FarbenSolo, trumpSuit, settings)).toBe(true);
      expect(isTrump(createCard(Suit.Pik, CardValue.Neun), GameType.FarbenSolo, trumpSuit, settings)).toBe(true);

      // Diamonds (Karo) are NOT trump (unless they are Queens/Jacks)
      expect(isTrump(createCard(Suit.Karo, CardValue.Ass), GameType.FarbenSolo, trumpSuit, settings)).toBe(false);
    });

    it('should identify trumps in Fleischlos', () => {
      const settings = { ...defaultSettings };
      // Nothing is trump
      expect(isTrump(createCard(Suit.Herz, CardValue.Dame), GameType.Fleischlos, null, settings)).toBe(false);
      expect(isTrump(createCard(Suit.Kreuz, CardValue.Bube), GameType.Fleischlos, null, settings)).toBe(false);
      expect(isTrump(createCard(Suit.Karo, CardValue.Ass), GameType.Fleischlos, null, settings)).toBe(false);

      // Even with DullenAlsHoechste?
      // Based on code analysis:
      // Dulle is NOT trump in Fleischlos if setting is on (Solo rule).
      const settingsWithDulle = { ...defaultSettings, dullenAlsHoechste: true };
      const herz10 = createCard(Suit.Herz, CardValue.Zehn);
      expect(isTrump(herz10, GameType.Fleischlos, null, settingsWithDulle)).toBe(false);
    });
  });

  describe('getCardPower', () => {
    it('should return correct power for trumps', () => {
      const settings = { ...defaultSettings };

      // Queens > Jacks > Diamonds
      const queen = createCard(Suit.Kreuz, CardValue.Dame);
      const jack = createCard(Suit.Kreuz, CardValue.Bube);
      const diamondAce = createCard(Suit.Karo, CardValue.Ass);

      const powerQ = getCardPower(queen, GameType.Normal, null, settings);
      const powerJ = getCardPower(jack, GameType.Normal, null, settings);
      const powerD = getCardPower(diamondAce, GameType.Normal, null, settings);

      expect(powerQ).toBeGreaterThan(powerJ);
      expect(powerJ).toBeGreaterThan(powerD);
    });

    it('should return correct power for non-trumps', () => {
      const settings = { ...defaultSettings };
      // Ace > Ten > King > Nine
      const ace = createCard(Suit.Herz, CardValue.Ass);
      const ten = createCard(Suit.Herz, CardValue.Zehn);
      const king = createCard(Suit.Herz, CardValue.Koenig);
      const nine = createCard(Suit.Herz, CardValue.Neun);

      expect(getCardPower(ace, GameType.Normal, null, settings)).toBe(10);
      expect(getCardPower(ten, GameType.Normal, null, settings)).toBe(9);
      expect(getCardPower(king, GameType.Normal, null, settings)).toBe(8);
      expect(getCardPower(nine, GameType.Normal, null, settings)).toBe(1);
    });

     it('should handle Dulle power', () => {
        const settings = { ...defaultSettings, dullenAlsHoechste: true };
        const dulle = createCard(Suit.Herz, CardValue.Zehn);
        const queen = createCard(Suit.Kreuz, CardValue.Dame); // Highest normal trump

        const powerDulle = getCardPower(dulle, GameType.Normal, null, settings);
        const powerQueen = getCardPower(queen, GameType.Normal, null, settings);

        expect(powerDulle).toBeGreaterThan(powerQueen);
     });
  });

  describe('sortCards', () => {
    it('should sort cards correctly (Trumps > Non-Trumps)', () => {
      const settings = { ...defaultSettings };
      const hand = [
        createCard(Suit.Herz, CardValue.Ass), // Non-trump
        createCard(Suit.Kreuz, CardValue.Dame), // High Trump
        createCard(Suit.Karo, CardValue.Ass),   // Low Trump
        createCard(Suit.Pik, CardValue.Zehn),   // Non-trump
      ];

      const sorted = sortCards(hand, GameType.Normal, null, settings);

      // Expected: Kreuz Dame, Karo Ass, Herz Ass, Pik Zehn (or similar, depending on suit order for non-trumps)
      // First two must be trumps
      expect(isTrump(sorted[0], GameType.Normal, null, settings)).toBe(true);
      expect(isTrump(sorted[1], GameType.Normal, null, settings)).toBe(true);
      expect(isTrump(sorted[2], GameType.Normal, null, settings)).toBe(false);
      expect(isTrump(sorted[3], GameType.Normal, null, settings)).toBe(false);

      // Check specific order
      // Kreuz Dame (Power > 1000) > Karo Ass (Power > 1000)
      expect(sorted[0].value).toBe(CardValue.Dame);
      expect(sorted[1].suit).toBe(Suit.Karo);
    });
  });

  describe('createDeck', () => {
    it('should create a deck with 48 cards (with nines)', () => {
      const deck = createDeck(true);
      expect(deck.length).toBe(48);
    });

    it('should create a deck with 40 cards (without nines)', () => {
      const deck = createDeck(false);
      expect(deck.length).toBe(40);
    });
  });

  describe('shuffle', () => {
      it('should return a deck with the same cards', () => {
          const deck = createDeck(true);
          const shuffled = shuffle(deck);

          expect(shuffled.length).toBe(deck.length);
          // Check that every card ID in deck is in shuffled
          const deckIds = deck.map(c => c.id).sort();
          const shuffledIds = shuffled.map(c => c.id).sort();
          expect(deckIds).toEqual(shuffledIds);
      });
  });
});
