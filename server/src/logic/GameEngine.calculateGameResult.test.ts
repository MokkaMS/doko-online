import { expect, test, describe } from "bun:test";
import { GameEngine } from './GameEngine';
import { GameState, Player, Team, GameType } from './types';

describe('GameEngine.calculateGameResult regression test', () => {
    const createPlayer = (id: string, team: Team, points: number): Player => ({
        id,
        name: `Player ${id}`,
        isBot: false,
        hand: [],
        team,
        isRevealed: true,
        points,
        tournamentPoints: 0,
        tricks: [],
    } as Player);

    test('should correctly identify winnerTeam IDs', () => {
        const state: GameState = {
            players: [
                createPlayer('p1', 'Re', 130),
                createPlayer('p2', 'Re', 0),
                createPlayer('p3', 'Kontra', 110),
                createPlayer('p4', 'Kontra', 0),
            ],
            gameType: GameType.Normal,
            rePlayerIds: ['p1', 'p2'],
            kontraPlayerIds: ['p3', 'p4'],
            specialPoints: { re: [], kontra: [] },
            reKontraAnnouncements: {},
        } as GameState;

        const resultState = GameEngine.calculateGameResult(state);
        const result = resultState.lastGameResult;

        expect(result?.winner).toBe('Re');
        expect(result?.winnerTeam).toContain('p1');
        expect(result?.winnerTeam).toContain('p2');
        expect(result?.winnerTeam).not.toContain('p3');
        expect(result?.winnerTeam).not.toContain('p4');
        expect(result?.winnerTeam?.length).toBe(2);
    });

    test('should correctly identify winnerTeam IDs when Kontra wins', () => {
        const state: GameState = {
            players: [
                createPlayer('p1', 'Re', 100),
                createPlayer('p2', 'Re', 0),
                createPlayer('p3', 'Kontra', 140),
                createPlayer('p4', 'Kontra', 0),
            ],
            gameType: GameType.Normal,
            rePlayerIds: ['p1', 'p2'],
            kontraPlayerIds: ['p3', 'p4'],
            specialPoints: { re: [], kontra: [] },
            reKontraAnnouncements: {},
        } as GameState;

        const resultState = GameEngine.calculateGameResult(state);
        const result = resultState.lastGameResult;

        expect(result?.winner).toBe('Kontra');
        expect(result?.winnerTeam).toContain('p3');
        expect(result?.winnerTeam).toContain('p4');
        expect(result?.winnerTeam).not.toContain('p1');
        expect(result?.winnerTeam).not.toContain('p2');
        expect(result?.winnerTeam?.length).toBe(2);
    });
});
