import { expect, test, describe } from "bun:test";
import { GameEngine } from './GameEngine';
import { GameType, Suit } from './types';

describe('GameEngine.determineFinalGameType', () => {
    const playerIdsInOrder = ['p1', 'p2', 'p3', 'p0']; // p1 is forehand

    test('should return Normal if all players bid Normal', () => {
        const bids = {
            'p0': 'Normal',
            'p1': 'Normal',
            'p2': 'Normal',
            'p3': 'Normal'
        };
        const result = GameEngine.determineFinalGameType(bids, playerIdsInOrder);
        expect(result.gameType).toBe(GameType.Normal);
        expect(result.soloPlayerId).toBeNull();
    });

    test('should prioritize Solo over Normal', () => {
        const bids = {
            'p0': 'Normal',
            'p1': 'Normal',
            'p2': 'DamenSolo',
            'p3': 'Normal'
        };
        const result = GameEngine.determineFinalGameType(bids, playerIdsInOrder);
        expect(result.gameType).toBe(GameType.DamenSolo);
        expect(result.soloPlayerId).toBe('p2');
    });

    test('should prioritize FarbenSolo over DamenSolo', () => {
        const bids = {
            'p0': 'Normal',
            'p1': 'DamenSolo',
            'p2': 'FarbenSolo_Herz',
            'p3': 'Normal'
        };
        const result = GameEngine.determineFinalGameType(bids, playerIdsInOrder);
        expect(result.gameType).toBe(GameType.FarbenSolo);
        expect(result.trumpSuit).toBe(Suit.Herz);
        expect(result.soloPlayerId).toBe('p2');
    });

    test('should prioritize earlier player if same Solo type is bid', () => {
        const bids = {
            'p0': 'DamenSolo', // Dealer
            'p1': 'Normal',
            'p2': 'DamenSolo',
            'p3': 'Normal'
        };
        // playerIdsInOrder = ['p1', 'p2', 'p3', 'p0']
        // p2 comes before p0 in order.
        const result = GameEngine.determineFinalGameType(bids, playerIdsInOrder);
        expect(result.gameType).toBe(GameType.DamenSolo);
        expect(result.soloPlayerId).toBe('p2');
    });

    test('should prioritize forehand over others for same Solo type', () => {
        const bids = {
            'p0': 'DamenSolo',
            'p1': 'DamenSolo',
            'p2': 'DamenSolo',
            'p3': 'DamenSolo'
        };
        const result = GameEngine.determineFinalGameType(bids, playerIdsInOrder);
        expect(result.gameType).toBe(GameType.DamenSolo);
        expect(result.soloPlayerId).toBe('p1'); // p1 is first in playerIdsInOrder
    });

    test('should handle Hochzeit', () => {
        const bids = {
            'p0': 'Normal',
            'p1': 'Normal',
            'p2': 'Hochzeit',
            'p3': 'Normal'
        };
        const result = GameEngine.determineFinalGameType(bids, playerIdsInOrder);
        expect(result.gameType).toBe(GameType.Hochzeit);
        expect(result.soloPlayerId).toBe('p2');
    });

    test('should prioritize Solo over Hochzeit', () => {
        const bids = {
            'p0': 'Normal',
            'p1': 'Hochzeit',
            'p2': 'BubenSolo',
            'p3': 'Normal'
        };
        const result = GameEngine.determineFinalGameType(bids, playerIdsInOrder);
        expect(result.gameType).toBe(GameType.BubenSolo);
        expect(result.soloPlayerId).toBe('p2');
    });
});
