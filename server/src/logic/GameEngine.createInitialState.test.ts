import { expect, test, describe } from "bun:test";
import { GameEngine } from './GameEngine';
import { GameSettings, GameType } from './types';

describe('GameEngine.createInitialState', () => {
    const defaultSettings: GameSettings = {
        mitNeunen: false,
        dullenAlsHoechste: true,
        schweinchen: false,
        fuchsGefangen: true,
        karlchen: true,
        doppelkopfPunkte: true,
        soloPrioritaet: true
    };

    const playerNames = ['Alice', 'Bob', 'Charlie', 'Dave'];

    test('should create initial state with 4 players', () => {
        const state = GameEngine.createInitialState(playerNames, defaultSettings);
        expect(state.players.length).toBe(4);
        expect(state.players.map(p => p.name)).toEqual(playerNames);
    });

    test('should deal 10 cards per player when mitNeunen is false', () => {
        const settings = { ...defaultSettings, mitNeunen: false };
        const state = GameEngine.createInitialState(playerNames, settings);
        state.players.forEach(player => {
            expect(player.hand.length).toBe(10);
        });
    });

    test('should deal 12 cards per player when mitNeunen is true', () => {
        const settings = { ...defaultSettings, mitNeunen: true };
        const state = GameEngine.createInitialState(playerNames, settings);
        state.players.forEach(player => {
            expect(player.hand.length).toBe(12);
        });
    });

    test('should set player 0 as human and others as bots', () => {
        const state = GameEngine.createInitialState(playerNames, defaultSettings);
        expect(state.players[0].isBot).toBe(false);
        expect(state.players[1].isBot).toBe(true);
        expect(state.players[2].isBot).toBe(true);
        expect(state.players[3].isBot).toBe(true);
    });

    test('should assign correct player IDs', () => {
        const state = GameEngine.createInitialState(playerNames, defaultSettings);
        expect(state.players[0].id).toBe('p0');
        expect(state.players[1].id).toBe('p1');
        expect(state.players[2].id).toBe('p2');
        expect(state.players[3].id).toBe('p3');
    });

    test('should initialize game state fields correctly', () => {
        const state = GameEngine.createInitialState(playerNames, defaultSettings);
        expect(state.currentPlayerIndex).toBe(1);
        expect(state.dealerIndex).toBe(0);
        expect(state.gameType).toBe(GameType.Normal);
        expect(state.phase).toBe('MainMenu');
        expect(state.currentTrick).toEqual([]);
        expect(state.rePlayerIds).toEqual([]);
        expect(state.kontraPlayerIds).toEqual([]);
    });

    test('should deal unique cards to each player', () => {
        const state = GameEngine.createInitialState(playerNames, defaultSettings);
        const allCardIds = state.players.flatMap(p => p.hand.map(c => c.id));
        const uniqueCardIds = new Set(allCardIds);
        expect(uniqueCardIds.size).toBe(allCardIds.length);
    });
});
