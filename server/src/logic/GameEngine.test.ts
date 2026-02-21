import { expect, test, describe } from "bun:test";
import { GameEngine } from './GameEngine';
import { GameType, Player } from './types';

describe('GameEngine.determineStartingPlayerIndex', () => {
    const createPlayer = (id: string, name: string): Player => ({
        id, name, isBot: false, hand: [], team: 'Unknown', isRevealed: false, points: 0, tournamentPoints: 0, tricks: [], connected: true
    });

    const players: Player[] = [
        createPlayer('p0', 'Player 0'),
        createPlayer('p1', 'Player 1'),
        createPlayer('p2', 'Player 2'),
        createPlayer('p3', 'Player 3'),
    ];

    const dealerIndex = 0; // Dealer is p0, so Forehand is p1 (index 1)

    test('should return forehand (dealer + 1) for Normal game', () => {
        const index = GameEngine.determineStartingPlayerIndex(GameType.Normal, dealerIndex, null, players);
        expect(index).toBe(1);
    });

    test('should return forehand (dealer + 1) for Hochzeit game', () => {
        // User specified Hochzeit excluded from solo rule
        const index = GameEngine.determineStartingPlayerIndex(GameType.Hochzeit, dealerIndex, 'p2', players);
        expect(index).toBe(1);
    });

    test('should return solo player index for DamenSolo', () => {
        const soloPlayerId = 'p2';
        const index = GameEngine.determineStartingPlayerIndex(GameType.DamenSolo, dealerIndex, soloPlayerId, players);
        expect(index).toBe(2);
    });

    test('should return solo player index for BubenSolo', () => {
        const soloPlayerId = 'p3';
        const index = GameEngine.determineStartingPlayerIndex(GameType.BubenSolo, dealerIndex, soloPlayerId, players);
        expect(index).toBe(3);
    });

    test('should return solo player index for FarbenSolo', () => {
        const soloPlayerId = 'p0'; // Soloist is also dealer
        const index = GameEngine.determineStartingPlayerIndex(GameType.FarbenSolo, dealerIndex, soloPlayerId, players);
        expect(index).toBe(0);
    });

    test('should return solo player index for Fleischlos', () => {
        const soloPlayerId = 'p1'; // Soloist is Forehand
        const index = GameEngine.determineStartingPlayerIndex(GameType.Fleischlos, dealerIndex, soloPlayerId, players);
        expect(index).toBe(1);
    });

    test('should fallback to forehand if solo player not found (edge case)', () => {
        const soloPlayerId = 'p99';
        const index = GameEngine.determineStartingPlayerIndex(GameType.DamenSolo, dealerIndex, soloPlayerId, players);
        expect(index).toBe(1);
    });

    test('should fallback to forehand if solo player ID is null in Solo game (edge case)', () => {
        const index = GameEngine.determineStartingPlayerIndex(GameType.DamenSolo, dealerIndex, null, players);
        expect(index).toBe(1);
    });
});
