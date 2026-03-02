import { expect, test, describe } from "bun:test";
import { GameEngine } from './GameEngine';
import { CardValue, Suit, Card, GameType, GameSettings, Player } from './types';

describe('GameEngine.isValidMove', () => {
  const defaultSettings: GameSettings = {
    mitNeunen: false,
    dullenAlsHoechste: true,
    fuchsGefangen: true,
    karlchen: true,
    doppelkopfPunkte: true,
  };

  const createCard = (suit: Suit, value: CardValue): Card => ({
    suit,
    value,
    id: `${suit}-${value}`,
  });

  const createPlayer = (hand: Card[]): Player => ({
    id: 'p1',
    name: 'Player 1',
    isBot: false,
    hand,
    team: 'Unknown',
    isRevealed: false,
    points: 0,
    tournamentPoints: 0,
    tricks: [],
    connected: true,
  });

  test('should return true if trick is empty', () => {
    const hand = [createCard(Suit.Kreuz, CardValue.Ass)];
    const player = createPlayer(hand);
    const result = GameEngine.isValidMove(hand[0], player, [], GameType.Normal, null, defaultSettings);
    expect(result).toBe(true);
  });

  describe('Trump Led', () => {
    test('should allow playing trump if player has trump', () => {
      const trick = [createCard(Suit.Karo, CardValue.Ass)]; // Karo Ass is Trump
      const hand = [createCard(Suit.Karo, CardValue.Zehn), createCard(Suit.Kreuz, CardValue.Ass)];
      const player = createPlayer(hand);

      const result = GameEngine.isValidMove(hand[0], player, trick, GameType.Normal, null, defaultSettings);
      expect(result).toBe(true);
    });

    test('should NOT allow playing non-trump if player has trump', () => {
      const trick = [createCard(Suit.Karo, CardValue.Ass)]; // Trump led
      const hand = [createCard(Suit.Karo, CardValue.Zehn), createCard(Suit.Kreuz, CardValue.Ass)];
      const player = createPlayer(hand);

      const result = GameEngine.isValidMove(hand[1], player, trick, GameType.Normal, null, defaultSettings);
      expect(result).toBe(false);
    });

    test('should allow playing anything if player has NO trump', () => {
      const trick = [createCard(Suit.Karo, CardValue.Ass)]; // Trump led
      const hand = [createCard(Suit.Kreuz, CardValue.Ass), createCard(Suit.Pik, CardValue.Ass)];
      const player = createPlayer(hand);

      const result1 = GameEngine.isValidMove(hand[0], player, trick, GameType.Normal, null, defaultSettings);
      const result2 = GameEngine.isValidMove(hand[1], player, trick, GameType.Normal, null, defaultSettings);
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    test('should recognize Dulle (Herz 10) as trump in Normal game', () => {
      const trick = [createCard(Suit.Karo, CardValue.Ass)]; // Trump led
      const hand = [createCard(Suit.Herz, CardValue.Zehn), createCard(Suit.Kreuz, CardValue.Ass)];
      const player = createPlayer(hand);

      // Herz 10 is Trump
      const result = GameEngine.isValidMove(hand[0], player, trick, GameType.Normal, null, defaultSettings);
      expect(result).toBe(true);
    });
  });

  describe('Non-Trump Led', () => {
    test('should allow playing same suit if player has the suit', () => {
      const trick = [createCard(Suit.Kreuz, CardValue.Koenig)]; // Kreuz led (Non-Trump)
      const hand = [createCard(Suit.Kreuz, CardValue.Ass), createCard(Suit.Karo, CardValue.Ass)];
      const player = createPlayer(hand);

      const result = GameEngine.isValidMove(hand[0], player, trick, GameType.Normal, null, defaultSettings);
      expect(result).toBe(true);
    });

    test('should NOT allow playing trump if player has the led suit', () => {
      const trick = [createCard(Suit.Kreuz, CardValue.Koenig)]; // Kreuz led
      const hand = [createCard(Suit.Kreuz, CardValue.Ass), createCard(Suit.Karo, CardValue.Ass)];
      const player = createPlayer(hand);

      const result = GameEngine.isValidMove(hand[1], player, trick, GameType.Normal, null, defaultSettings);
      expect(result).toBe(false);
    });

    test('should NOT allow playing different non-trump suit if player has the led suit', () => {
      const trick = [createCard(Suit.Kreuz, CardValue.Koenig)]; // Kreuz led
      const hand = [createCard(Suit.Kreuz, CardValue.Ass), createCard(Suit.Pik, CardValue.Ass)];
      const player = createPlayer(hand);

      const result = GameEngine.isValidMove(hand[1], player, trick, GameType.Normal, null, defaultSettings);
      expect(result).toBe(false);
    });

    test('should allow playing anything if player has NO led suit', () => {
      const trick = [createCard(Suit.Kreuz, CardValue.Koenig)]; // Kreuz led
      const hand = [createCard(Suit.Pik, CardValue.Ass), createCard(Suit.Karo, CardValue.Ass)];
      const player = createPlayer(hand);

      const result1 = GameEngine.isValidMove(hand[0], player, trick, GameType.Normal, null, defaultSettings);
      const result2 = GameEngine.isValidMove(hand[1], player, trick, GameType.Normal, null, defaultSettings);
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });
  });

  describe('Game Types', () => {
    test('DamenSolo: Only Queens are trump', () => {
      const trick = [createCard(Suit.Kreuz, CardValue.Dame)]; // Trump led (Dame)
      const hand = [createCard(Suit.Pik, CardValue.Dame), createCard(Suit.Karo, CardValue.Ass)];
      const player = createPlayer(hand);

      expect(GameEngine.isValidMove(hand[0], player, trick, GameType.DamenSolo, null, defaultSettings)).toBe(true);
      expect(GameEngine.isValidMove(hand[1], player, trick, GameType.DamenSolo, null, defaultSettings)).toBe(false);

      const trick2 = [createCard(Suit.Karo, CardValue.Koenig)]; // Karo led (Non-Trump in DamenSolo)
      const hand2 = [createCard(Suit.Karo, CardValue.Ass), createCard(Suit.Kreuz, CardValue.Dame)];
      const player2 = createPlayer(hand2);

      expect(GameEngine.isValidMove(hand2[0], player2, trick2, GameType.DamenSolo, null, defaultSettings)).toBe(true);
      expect(GameEngine.isValidMove(hand2[1], player2, trick2, GameType.DamenSolo, null, defaultSettings)).toBe(false);
    });

    test('Fleischlos: No trumps at all', () => {
      const trick = [createCard(Suit.Karo, CardValue.Dame)]; // In Normal it's trump, here it's NOT
      const hand = [createCard(Suit.Karo, CardValue.Ass), createCard(Suit.Kreuz, CardValue.Dame)];
      const player = createPlayer(hand);

      expect(GameEngine.isValidMove(hand[0], player, trick, GameType.Fleischlos, null, defaultSettings)).toBe(true);
      expect(GameEngine.isValidMove(hand[1], player, trick, GameType.Fleischlos, null, defaultSettings)).toBe(false);
    });

    test('FarbenSolo: Trump suit is chosen', () => {
      const trick = [createCard(Suit.Herz, CardValue.Ass)]; // Herz led, Trump if Herz is trump suit
      const hand = [createCard(Suit.Herz, CardValue.Koenig), createCard(Suit.Karo, CardValue.Ass)];
      const player = createPlayer(hand);

      // If Herz is Trump
      expect(GameEngine.isValidMove(hand[0], player, trick, GameType.FarbenSolo, Suit.Herz, defaultSettings)).toBe(true);
      expect(GameEngine.isValidMove(hand[1], player, trick, GameType.FarbenSolo, Suit.Herz, defaultSettings)).toBe(false);

      // If Pik is Trump, Herz Ass is NOT Trump
      expect(GameEngine.isValidMove(hand[0], player, trick, GameType.FarbenSolo, Suit.Pik, defaultSettings)).toBe(true);
      expect(GameEngine.isValidMove(hand[1], player, trick, GameType.FarbenSolo, Suit.Pik, defaultSettings)).toBe(false);
    });
  });

  describe('Dullen Setting', () => {
    test('Herz 10 is NOT trump if dullenAlsHoechste is false', () => {
      const settings = { ...defaultSettings, dullenAlsHoechste: false };
      const trick = [createCard(Suit.Herz, CardValue.Ass)]; // Herz led
      const hand = [createCard(Suit.Herz, CardValue.Zehn), createCard(Suit.Karo, CardValue.Ass)];
      const player = createPlayer(hand);

      // Herz 10 should be treated as regular Herz
      expect(GameEngine.isValidMove(hand[0], player, trick, GameType.Normal, null, settings)).toBe(true);
      expect(GameEngine.isValidMove(hand[1], player, trick, GameType.Normal, null, settings)).toBe(false);
    });

    test('Herz 10 is ALWAYS trump in FarbenSolo regardless of settings', () => {
      const settings = { ...defaultSettings, dullenAlsHoechste: false };
      const trick = [createCard(Suit.Karo, CardValue.Bube)]; // Trump led
      const hand = [createCard(Suit.Herz, CardValue.Zehn), createCard(Suit.Pik, CardValue.Ass)];
      const player = createPlayer(hand);

      // Herz 10 is trump in FarbenSolo
      expect(GameEngine.isValidMove(hand[0], player, trick, GameType.FarbenSolo, Suit.Karo, settings)).toBe(true);
      expect(GameEngine.isValidMove(hand[1], player, trick, GameType.FarbenSolo, Suit.Karo, settings)).toBe(false);
    });
  });
});
