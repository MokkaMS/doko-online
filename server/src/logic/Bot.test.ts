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
});
