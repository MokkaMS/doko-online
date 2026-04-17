import { expect, test, describe } from 'bun:test';
import { Bot } from './Bot';
import { Player, GameState, GameType, Suit, CardValue, GameSettings } from './types';

describe('Bot AI', () => {
    test('Bot prefers non-Heart over Heart when suit counts tie', () => {
        const settings: GameSettings = {
            mitNeunen: false, // 40 cards, 10 per player
            dullenAlsHoechste: true,
            fuchsGefangen: true,
            doppelkopfPunkte: true,
            karlchen: true,
            schweinchen: false,
        };

        const hand = [
            // Trumps
            { suit: Suit.Herz, value: CardValue.Zehn },
            { suit: Suit.Kreuz, value: CardValue.Dame },
            { suit: Suit.Herz, value: CardValue.Dame },
            { suit: Suit.Karo, value: CardValue.Dame },
            { suit: Suit.Karo, value: CardValue.Ass },
            { suit: Suit.Karo, value: CardValue.Zehn },
            // Fehl
            // Kreuz: Ass (total 1)
            { suit: Suit.Kreuz, value: CardValue.Ass },
            // Herz: Ass (total 1)
            { suit: Suit.Herz, value: CardValue.Ass },
            // Pik: Ass + König (total 2)
            { suit: Suit.Pik, value: CardValue.Ass },
            { suit: Suit.Pik, value: CardValue.König },
        ];

        const player: Player = {
            id: 'bot1',
            name: 'Bot 1',
            isBot: true,
            hand,
            team: 'Unknown',
            isRevealed: false,
            points: 0,
            tournamentPoints: 0,
            tricks: [],
        };

        const state: GameState = {
            players: [player, { id: 'p2' } as Player, { id: 'p3' } as Player, { id: 'p4' } as Player],
            currentPlayerIndex: 0,
            dealerIndex: 3,
            currentTrick: [], // Empty trick means bot is leading
            trickStarterIndex: 0,
            trickWinnerIndex: null,
            gameType: GameType.Normal,
            trumpSuit: null,
            rePlayerIds: [],
            kontraPlayerIds: [],
            announcements: {},
            reKontraAnnouncements: {},
            specialPoints: { re: [], kontra: [] },
            notifications: [],
            currentTrickNotifications: [],
            phase: 'Playing',
        };

        const bestCard = Bot.decideMove(player, state, settings);

        expect(bestCard.suit).toBe(Suit.Kreuz);
        expect(bestCard.value).toBe(CardValue.Ass);
    });

    test('Bot AI tie-breaker counts only Fehl cards for the suit', () => {
        // Let's modify Bot to ensure it counts only Fehl cards.
        const settings: GameSettings = {
            mitNeunen: false, // 40 cards, 10 per player
            dullenAlsHoechste: true,
            fuchsGefangen: true,
            doppelkopfPunkte: true,
            karlchen: true,
            schweinchen: false,
        };

        const hand = [
            // Trumps
            { suit: Suit.Herz, value: CardValue.Zehn },
            { suit: Suit.Kreuz, value: CardValue.Dame },
            { suit: Suit.Kreuz, value: CardValue.Dame },
            { suit: Suit.Pik, value: CardValue.Dame },
            { suit: Suit.Karo, value: CardValue.Ass },
            { suit: Suit.Karo, value: CardValue.Zehn },
            // Fehl
            // Kreuz: Ass (total 1 Fehl, but total 3 including trumps)
            { suit: Suit.Kreuz, value: CardValue.Ass },
            // Pik: Ass + König (total 2 Fehl, but total 3 including trumps)
            { suit: Suit.Pik, value: CardValue.Ass },
            { suit: Suit.Pik, value: CardValue.König },
            // Herz: Ass + König (total 2 Fehl, total 3 including trumps)
            { suit: Suit.Herz, value: CardValue.Ass },
            { suit: Suit.Herz, value: CardValue.König },
        ];

        const player: Player = {
            id: 'bot1',
            name: 'Bot 1',
            isBot: true,
            hand,
            team: 'Unknown',
            isRevealed: false,
            points: 0,
            tournamentPoints: 0,
            tricks: [],
        };

        const state: GameState = {
            players: [player, { id: 'p2' } as Player, { id: 'p3' } as Player, { id: 'p4' } as Player],
            currentPlayerIndex: 0,
            dealerIndex: 3,
            currentTrick: [], // Empty trick means bot is leading
            trickStarterIndex: 0,
            trickWinnerIndex: null,
            gameType: GameType.Normal,
            trumpSuit: null,
            rePlayerIds: [],
            kontraPlayerIds: [],
            announcements: {},
            reKontraAnnouncements: {},
            specialPoints: { re: [], kontra: [] },
            notifications: [],
            currentTrickNotifications: [],
            phase: 'Playing',
        };

        const bestCard = Bot.decideMove(player, state, settings);

        // We have Kreuz 1 Fehl (but total 3 cards including trumps)
        // Pik 2 Fehl (but total 3 cards including trumps)
        // Herz 2 Fehl (but total 3 cards including trumps)
        // If it counts ONLY Fehl cards, Kreuz has 1, Pik has 2. Kreuz should win.
        // If it erroneously counts all cards, they all tie at 3.
        expect(bestCard.suit).toBe(Suit.Kreuz);
        expect(bestCard.value).toBe(CardValue.Ass);
    });

    test('Bot AI picks Heart Ass absolute last, even if Heart has fewer total Fehl cards', () => {
        const settings: GameSettings = {
            mitNeunen: false, // 40 cards, 10 per player
            dullenAlsHoechste: true,
            fuchsGefangen: true,
            doppelkopfPunkte: true,
            karlchen: true,
            schweinchen: false,
        };

        const hand = [
            // Trumps
            { suit: Suit.Herz, value: CardValue.Zehn },
            { suit: Suit.Kreuz, value: CardValue.Dame },
            { suit: Suit.Herz, value: CardValue.Dame },
            // Fehl
            // Herz: Ass (total 1 Fehl)
            { suit: Suit.Herz, value: CardValue.Ass },
            // Pik: Ass + König (total 2 Fehl)
            { suit: Suit.Pik, value: CardValue.Ass },
            { suit: Suit.Pik, value: CardValue.König },
            // Kreuz: Ass + König + Neun (total 3 Fehl)
            { suit: Suit.Kreuz, value: CardValue.Ass },
            { suit: Suit.Kreuz, value: CardValue.König },
            { suit: Suit.Kreuz, value: CardValue.Neun },
        ];

        const player: Player = {
            id: 'bot1',
            name: 'Bot 1',
            isBot: true,
            hand,
            team: 'Unknown',
            isRevealed: false,
            points: 0,
            tournamentPoints: 0,
            tricks: [],
        };

        const state: GameState = {
            players: [player, { id: 'p2' } as Player, { id: 'p3' } as Player, { id: 'p4' } as Player],
            currentPlayerIndex: 0,
            dealerIndex: 3,
            currentTrick: [], // Empty trick means bot is leading
            trickStarterIndex: 0,
            trickWinnerIndex: null,
            gameType: GameType.Normal,
            trumpSuit: null,
            rePlayerIds: [],
            kontraPlayerIds: [],
            announcements: {},
            reKontraAnnouncements: {},
            specialPoints: { re: [], kontra: [] },
            notifications: [],
            currentTrickNotifications: [],
            phase: 'Playing',
        };

        const bestCard = Bot.decideMove(player, state, settings);

        // We have Herz 1 Fehl, Pik 2 Fehl, Kreuz 3 Fehl.
        // Although Herz has only 1 Fehl, Heart must be picked absolute last.
        // The bot should pick Pik Ass because it's the non-Heart with the lowest count (2 vs 3).
        expect(bestCard.suit).toBe(Suit.Pik);
        expect(bestCard.value).toBe(CardValue.Ass);
    });

    describe('decideAnnouncement', () => {
        const settings: GameSettings = {
            mitNeunen: false,
            dullenAlsHoechste: true,
            fuchsGefangen: true,
            doppelkopfPunkte: true,
            karlchen: true,
            schweinchen: false,
        };

        const createBaseState = (player: Player): GameState => ({
            players: [
                player,
                { id: 'p2', name: 'P2', hand: [], isBot: true, team: 'Unknown', points: 0, tournamentPoints: 0, tricks: [] } as Player,
                { id: 'p3', name: 'P3', hand: [], isBot: true, team: 'Unknown', points: 0, tournamentPoints: 0, tricks: [] } as Player,
                { id: 'p4', name: 'P4', hand: [], isBot: true, team: 'Unknown', points: 0, tournamentPoints: 0, tricks: [] } as Player,
            ],
            currentPlayerIndex: 0,
            dealerIndex: 3,
            currentTrick: [],
            trickStarterIndex: 0,
            trickWinnerIndex: null,
            gameType: GameType.Normal,
            trumpSuit: null,
            rePlayerIds: [],
            kontraPlayerIds: [],
            announcements: {},
            reKontraAnnouncements: {},
            specialPoints: { re: [], kontra: [] },
            notifications: [],
            currentTrickNotifications: [],
            phase: 'Playing',
        });

        const createPlayer = (id: string, hand: Card[]): Player => ({
            id,
            name: id.toUpperCase(),
            hand,
            isBot: true,
            team: 'Unknown',
            points: 0,
            tournamentPoints: 0,
            tricks: [],
        });

        test('returns null if already announced', () => {
            const player = createPlayer('p1', new Array(10).fill({ id: 'c1' } as Card));
            const state = createBaseState(player);
            state.reKontraAnnouncements['p1'] = 'Re';

            expect(Bot.decideAnnouncement(player, state, settings)).toBeNull();
        });

        test('returns null if hand length < 9', () => {
            const player = createPlayer('p1', new Array(8).fill({ id: 'c1' } as Card));
            const state = createBaseState(player);

            expect(Bot.decideAnnouncement(player, state, settings)).toBeNull();
        });

        test('returns Re for strong Re hand', () => {
            const hand: Card[] = [
                { id: '1', suit: Suit.Herz, value: CardValue.Zehn }, // High trump
                { id: '2', suit: Suit.Kreuz, value: CardValue.Dame }, // High trump
                { id: '3', suit: Suit.Pik, value: CardValue.Dame },   // High trump
                { id: '4', suit: Suit.Herz, value: CardValue.Bube },  // Trump
                { id: '5', suit: Suit.Karo, value: CardValue.Ass },   // Trump
                { id: '6', suit: Suit.Karo, value: CardValue.Zehn },  // Trump
                { id: '7', suit: Suit.Kreuz, value: CardValue.Ass },  // Fehl
                { id: '8', suit: Suit.Pik, value: CardValue.Ass },    // Fehl
                { id: '9', suit: Suit.Herz, value: CardValue.Ass },   // Fehl
                { id: '10', suit: Suit.Kreuz, value: CardValue.König } // Fehl
            ];
            const player = createPlayer('p1', hand);
            const state = createBaseState(player);
            state.rePlayerIds = ['p1'];

            expect(Bot.decideAnnouncement(player, state, settings)).toBe('Re');
        });

        test('returns Kontra for strong Kontra hand', () => {
            const hand: Card[] = [
                { id: '1', suit: Suit.Herz, value: CardValue.Zehn }, // High trump
                { id: '2', suit: Suit.Kreuz, value: CardValue.Dame }, // High trump
                { id: '3', suit: Suit.Pik, value: CardValue.Dame },   // High trump
                { id: '4', suit: Suit.Herz, value: CardValue.Bube },  // Trump
                { id: '5', suit: Suit.Karo, value: CardValue.Ass },   // Trump
                { id: '6', suit: Suit.Karo, value: CardValue.Zehn },  // Trump
                { id: '7', suit: Suit.Kreuz, value: CardValue.Ass },  // Fehl
                { id: '8', suit: Suit.Pik, value: CardValue.Ass },    // Fehl
                { id: '9', suit: Suit.Herz, value: CardValue.Ass },   // Fehl
                { id: '10', suit: Suit.Kreuz, value: CardValue.König } // Fehl
            ];
            const player = createPlayer('p1', hand);
            const state = createBaseState(player);
            state.kontraPlayerIds = ['p1'];

            expect(Bot.decideAnnouncement(player, state, settings)).toBe('Kontra');
        });

        test('returns Re for Hochzeit player with 2 Kreuz Damen and 5+ trumps', () => {
            const hand: Card[] = [
                { id: '1', suit: Suit.Kreuz, value: CardValue.Dame }, // High trump
                { id: '2', suit: Suit.Kreuz, value: CardValue.Dame }, // High trump
                { id: '3', suit: Suit.Herz, value: CardValue.Bube },  // Trump
                { id: '4', suit: Suit.Karo, value: CardValue.Ass },   // Trump
                { id: '5', suit: Suit.Karo, value: CardValue.Zehn },  // Trump
                { id: '6', suit: Suit.Kreuz, value: CardValue.Ass },  // Fehl
                { id: '7', suit: Suit.Pik, value: CardValue.Ass },    // Fehl
                { id: '8', suit: Suit.Herz, value: CardValue.Ass },   // Fehl
                { id: '9', suit: Suit.Kreuz, value: CardValue.König },// Fehl
                { id: '10', suit: Suit.Pik, value: CardValue.König }   // Fehl
            ];
            const player = createPlayer('p1', hand);
            const state = createBaseState(player);
            // In Hochzeit, the one with both Kreuz Damen is Re.

            expect(Bot.decideAnnouncement(player, state, settings)).toBe('Re');
        });

        test('returns null for weak hand', () => {
            const hand: Card[] = [
                { id: '1', suit: Suit.Karo, value: CardValue.Ass },   // Trump
                { id: '2', suit: Suit.Karo, value: CardValue.Zehn },  // Trump
                { id: '3', suit: Suit.Karo, value: CardValue.König }, // Trump
                { id: '4', suit: Suit.Karo, value: CardValue.Bube },  // Trump
                { id: '5', suit: Suit.Karo, value: CardValue.Neun },  // Trump
                { id: '6', suit: Suit.Kreuz, value: CardValue.Ass },  // Fehl
                { id: '7', suit: Suit.Pik, value: CardValue.Ass },    // Fehl
                { id: '8', suit: Suit.Herz, value: CardValue.Ass },   // Fehl
                { id: '9', suit: Suit.Kreuz, value: CardValue.König },// Fehl
                { id: '10', suit: Suit.Pik, value: CardValue.König }   // Fehl
            ];
            const player = createPlayer('p1', hand);
            const state = createBaseState(player);
            state.rePlayerIds = ['p1'];

            expect(Bot.decideAnnouncement(player, state, settings)).toBeNull();
        });
    });
});
