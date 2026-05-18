import { expect, test, describe } from "bun:test";
import { GameEngine } from './GameEngine';
import { CardValue, Suit, Card, Player, GameSettings, Team } from './types';

describe('GameEngine.checkTrickSpecialPoints', () => {
  const createPlayer = (id: string, team: Team, isRevealed = false): Player => ({
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

  const players: Player[] = [
    createPlayer('p0', 'Re'),
    createPlayer('p1', 'Kontra'),
    createPlayer('p2', 'Re'),
    createPlayer('p3', 'Kontra'),
  ];

  const defaultSettings: GameSettings = {
    mitNeunen: true,
    dullenAlsHoechste: true,
    schweinchen: false,
    fuchsGefangen: true,
    karlchen: true,
    karlchenGefangen: true,
    doppelkopfPunkte: true,
    soloPrioritaet: false,
  };

  describe('Doppelkopf', () => {
    test('should award Doppelkopf if points >= 40 and setting is enabled', () => {
      const trick: Card[] = [
        { suit: Suit.Kreuz, value: CardValue.Ass, id: '1' }, // 11
        { suit: Suit.Pik, value: CardValue.Ass, id: '2' },   // 11
        { suit: Suit.Herz, value: CardValue.Ass, id: '3' },  // 11
        { suit: Suit.Karo, value: CardValue.Ass, id: '4' },  // 11
      ]; // 44 points

      const result = GameEngine.checkTrickSpecialPoints(trick, 0, 0, players, defaultSettings, false);
      expect(result.re).toContain('Doppelkopf');
      expect(result.notifications).toContain('Doppelkopf');
    });

    test('should award Doppelkopf to Kontra if they win', () => {
        const trick: Card[] = [
          { suit: Suit.Kreuz, value: CardValue.Ass, id: '1' }, // 11
          { suit: Suit.Pik, value: CardValue.Ass, id: '2' },   // 11
          { suit: Suit.Herz, value: CardValue.Ass, id: '3' },  // 11
          { suit: Suit.Karo, value: CardValue.Ass, id: '4' },  // 11
        ]; // 44 points

        const result = GameEngine.checkTrickSpecialPoints(trick, 1, 0, players, defaultSettings, false);
        expect(result.kontra).toContain('Doppelkopf');
        expect(result.notifications).toContain('Doppelkopf');
      });

    test('should not award Doppelkopf if points < 40', () => {
      const trick: Card[] = [
        { suit: Suit.Kreuz, value: CardValue.Ass, id: '1' }, // 11
        { suit: Suit.Pik, value: CardValue.Zehn, id: '2' },  // 10
        { suit: Suit.Herz, value: CardValue.Koenig, id: '3' }, // 4
        { suit: Suit.Karo, value: CardValue.Dame, id: '4' },   // 3
      ]; // 28 points

      const result = GameEngine.checkTrickSpecialPoints(trick, 0, 0, players, defaultSettings, false);
      expect(result.re).not.toContain('Doppelkopf');
      expect(result.notifications).not.toContain('Doppelkopf');
    });

    test('should not award Doppelkopf if setting is disabled', () => {
      const trick: Card[] = [
        { suit: Suit.Kreuz, value: CardValue.Ass, id: '1' },
        { suit: Suit.Pik, value: CardValue.Ass, id: '2' },
        { suit: Suit.Herz, value: CardValue.Ass, id: '3' },
        { suit: Suit.Karo, value: CardValue.Ass, id: '4' },
      ];
      const settings = { ...defaultSettings, doppelkopfPunkte: false };

      const result = GameEngine.checkTrickSpecialPoints(trick, 0, 0, players, settings, false);
      expect(result.re).not.toContain('Doppelkopf');
    });
  });

  describe('Fuchs gefangen', () => {
    test('should award Fuchs gefangen if Re player plays Karo Ass and Kontra wins', () => {
      const trick: Card[] = [
        { suit: Suit.Karo, value: CardValue.Ass, id: '1' }, // Re (p0) plays Fuchs
        { suit: Suit.Kreuz, value: CardValue.Dame, id: '2' },
        { suit: Suit.Pik, value: CardValue.Dame, id: '3' },
        { suit: Suit.Herz, value: CardValue.Dame, id: '4' },
      ];
      // p1 wins (Kontra)
      const result = GameEngine.checkTrickSpecialPoints(trick, 1, 0, players, defaultSettings, false);
      expect(result.kontra).toContain('Fuchs gefangen');
    });

    test('should award Fuchs gefangen if Kontra player plays Karo Ass and Re wins', () => {
      const trick: Card[] = [
        { suit: Suit.Kreuz, value: CardValue.Dame, id: '1' },
        { suit: Suit.Karo, value: CardValue.Ass, id: '2' }, // Kontra (p1) plays Fuchs
        { suit: Suit.Pik, value: CardValue.Dame, id: '3' },
        { suit: Suit.Herz, value: CardValue.Dame, id: '4' },
      ];
      // p0 wins (Re)
      const result = GameEngine.checkTrickSpecialPoints(trick, 0, 0, players, defaultSettings, false);
      expect(result.re).toContain('Fuchs gefangen');
    });

    test('should not award Fuchs gefangen if same team wins', () => {
      const trick: Card[] = [
        { suit: Suit.Karo, value: CardValue.Ass, id: '1' }, // Re (p0) plays Fuchs
        { suit: Suit.Kreuz, value: CardValue.Dame, id: '2' },
        { suit: Suit.Pik, value: CardValue.Dame, id: '3' },
        { suit: Suit.Herz, value: CardValue.Dame, id: '4' },
      ];
      // p2 wins (Re)
      const result = GameEngine.checkTrickSpecialPoints(trick, 2, 0, players, defaultSettings, false);
      expect(result.re).not.toContain('Fuchs gefangen');
      expect(result.kontra).not.toContain('Fuchs gefangen');
    });

    test('should only add notification if both players are revealed', () => {
      const revealedPlayers = [
        createPlayer('p0', 'Re', true),
        createPlayer('p1', 'Kontra', true),
        createPlayer('p2', 'Re', false),
        createPlayer('p3', 'Kontra', false),
      ];
      const trick: Card[] = [
        { suit: Suit.Karo, value: CardValue.Ass, id: '1' }, // p0 plays Fuchs
        { suit: Suit.Kreuz, value: CardValue.Dame, id: '2' }, // p1 wins
        { suit: Suit.Pik, value: CardValue.Dame, id: '3' },
        { suit: Suit.Herz, value: CardValue.Dame, id: '4' },
      ];

      // Both revealed -> notification
      const result1 = GameEngine.checkTrickSpecialPoints(trick, 1, 0, revealedPlayers, defaultSettings, false);
      expect(result1.notifications).toContain('Fuchs gefangen');

      // One not revealed -> no notification
      const result2 = GameEngine.checkTrickSpecialPoints(trick, 1, 0, players, defaultSettings, false);
      expect(result2.notifications).not.toContain('Fuchs gefangen');
    });

    test('should handle multiple Fuchs in one trick', () => {
        const trick: Card[] = [
          { suit: Suit.Karo, value: CardValue.Ass, id: '1' }, // p0 (Re)
          { suit: Suit.Karo, value: CardValue.Ass, id: '2' }, // p1 (Kontra)
          { suit: Suit.Pik, value: CardValue.Dame, id: '3' },
          { suit: Suit.Herz, value: CardValue.Dame, id: '4' },
        ];
        // p0 wins (Re) -> captures p1's Fuchs
        const result = GameEngine.checkTrickSpecialPoints(trick, 0, 0, players, defaultSettings, false);
        expect(result.re).toContain('Fuchs gefangen');
        expect(result.kontra).not.toContain('Fuchs gefangen');
        expect(result.re.filter(x => x === 'Fuchs gefangen').length).toBe(1);
    });

    test('should not award Fuchs gefangen if setting is disabled', () => {
        const trick: Card[] = [
          { suit: Suit.Karo, value: CardValue.Ass, id: '1' },
          { suit: Suit.Kreuz, value: CardValue.Dame, id: '2' },
        ];
        const settings = { ...defaultSettings, fuchsGefangen: false };
        const result = GameEngine.checkTrickSpecialPoints(trick, 1, 0, players, settings, false);
        expect(result.kontra).not.toContain('Fuchs gefangen');
    });
  });

  describe('Karlchen', () => {
    test('should award Karlchen if Kreuz Bube wins the last trick', () => {
      const trick: Card[] = [
        { suit: Suit.Kreuz, value: CardValue.Bube, id: '1' }, // p0 plays Karlchen
        { suit: Suit.Pik, value: CardValue.Neun, id: '2' },
        { suit: Suit.Herz, value: CardValue.Neun, id: '3' },
        { suit: Suit.Karo, value: CardValue.Neun, id: '4' },
      ];
      // p0 wins
      const result = GameEngine.checkTrickSpecialPoints(trick, 0, 0, players, defaultSettings, true);
      expect(result.re).toContain('Karlchen');
      expect(result.notifications).toContain('Karlchen am End');
    });

    test('should award Karlchen gefangen if Kreuz Bube is lost in the last trick', () => {
      const trick: Card[] = [
        { suit: Suit.Kreuz, value: CardValue.Bube, id: '1' }, // p0 plays Karlchen
        { suit: Suit.Kreuz, value: CardValue.Dame, id: '2' }, // p1 wins (Kontra)
        { suit: Suit.Pik, value: CardValue.Neun, id: '3' },
        { suit: Suit.Herz, value: CardValue.Neun, id: '4' },
      ];
      const result = GameEngine.checkTrickSpecialPoints(trick, 1, 0, players, defaultSettings, true);
      expect(result.kontra).toContain('Karlchen gefangen');
      expect(result.notifications).toContain('Karlchen gefangen');
    });

    test('should not award Karlchen if it is not the last trick', () => {
      const trick: Card[] = [
        { suit: Suit.Kreuz, value: CardValue.Bube, id: '1' },
      ];
      const result = GameEngine.checkTrickSpecialPoints(trick, 0, 0, players, defaultSettings, false);
      expect(result.re).not.toContain('Karlchen');
    });

    test('should not award Karlchen if setting is disabled', () => {
        const trick: Card[] = [
          { suit: Suit.Kreuz, value: CardValue.Bube, id: '1' },
        ];
        const settings = { ...defaultSettings, karlchen: false };
        const result = GameEngine.checkTrickSpecialPoints(trick, 0, 0, players, settings, true);
        expect(result.re).not.toContain('Karlchen');
    });

    test('should not award Karlchen gefangen if setting is disabled', () => {
        const trick: Card[] = [
          { suit: Suit.Kreuz, value: CardValue.Bube, id: '1' }, // p0
          { suit: Suit.Kreuz, value: CardValue.Dame, id: '2' }, // p1 wins
        ];
        const settings = { ...defaultSettings, karlchenGefangen: false };
        const result = GameEngine.checkTrickSpecialPoints(trick, 1, 0, players, settings, true);
        expect(result.kontra).not.toContain('Karlchen gefangen');
    });

    test('should not award Karlchen gefangen if same team wins', () => {
        const trick: Card[] = [
          { suit: Suit.Kreuz, value: CardValue.Bube, id: '1' }, // p0 (Re)
          { suit: Suit.Pik, value: CardValue.Dame, id: '2' }, // p2 wins (Re)
          { suit: Suit.Herz, value: CardValue.Neun, id: '3' },
          { suit: Suit.Karo, value: CardValue.Neun, id: '4' },
        ];
        const result = GameEngine.checkTrickSpecialPoints(trick, 2, 0, players, defaultSettings, true);
        expect(result.re).not.toContain('Karlchen gefangen');
        expect(result.kontra).not.toContain('Karlchen gefangen');
    });
  });
});
