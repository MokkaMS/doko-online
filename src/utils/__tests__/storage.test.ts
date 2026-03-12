import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStoredPlayerId,
  getStoredRoomId,
  setStoredRoomId,
  getStoredPlayerName,
  setStoredPlayerName,
} from '../storage';

const STORAGE_KEY = 'doppelkopf_player_id';
const ROOM_ID_KEY = 'doppelkopf_room_id';
const PLAYER_NAME_KEY = 'doppelkopf_player_name';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
});

describe('storage utils', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('getStoredPlayerId', () => {
    it('should return an existing player ID from localStorage', () => {
      const existingId = 'existing-id-123';
      localStorage.setItem(STORAGE_KEY, existingId);

      const result = getStoredPlayerId();
      expect(result).toBe(existingId);
      expect(localStorage.getItem(STORAGE_KEY)).toBe(existingId);
    });

    it('should generate and store a new UUID if none exists and crypto.randomUUID is available', () => {
      const mockUUID = 'mock-uuid-456';

      // Mock crypto.randomUUID
      const originalCrypto = globalThis.crypto;
      Object.defineProperty(globalThis, 'crypto', {
        value: {
          ...originalCrypto,
          randomUUID: vi.fn().mockReturnValue(mockUUID),
        },
        configurable: true
      });

      const result = getStoredPlayerId();

      expect(result).toBe(mockUUID);
      expect(localStorage.getItem(STORAGE_KEY)).toBe(mockUUID);
      expect(globalThis.crypto.randomUUID).toHaveBeenCalled();

      // Restore
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        configurable: true
      });
    });

    it('should generate and store a fallback ID if crypto.randomUUID is not available', () => {
       // Mock crypto to be undefined or missing randomUUID
       const originalCrypto = globalThis.crypto;
       Object.defineProperty(globalThis, 'crypto', {
        value: undefined,
        configurable: true
       });

       const result = getStoredPlayerId();

       expect(result).toBeDefined();
       expect(typeof result).toBe('string');
       expect(result.length).toBeGreaterThan(10);
       expect(localStorage.getItem(STORAGE_KEY)).toBe(result);

       // Restore
       Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        configurable: true
       });
    });
  });

  describe('getStoredRoomId and setStoredRoomId', () => {
    it('should return null if no room ID is stored', () => {
      expect(getStoredRoomId()).toBeNull();
    });

    it('should store and retrieve a room ID', () => {
      const roomId = 'room-abc';
      setStoredRoomId(roomId);
      expect(getStoredRoomId()).toBe(roomId);
      expect(localStorage.getItem(ROOM_ID_KEY)).toBe(roomId);
    });

    it('should remove the room ID when setting to null', () => {
      localStorage.setItem(ROOM_ID_KEY, 'some-room');
      setStoredRoomId(null);
      expect(getStoredRoomId()).toBeNull();
      expect(localStorage.getItem(ROOM_ID_KEY)).toBeNull();
    });
  });

  describe('getStoredPlayerName and setStoredPlayerName', () => {
    it('should return null if no player name is stored', () => {
      expect(getStoredPlayerName()).toBeNull();
    });

    it('should store and retrieve a player name', () => {
      const playerName = 'Alice';
      setStoredPlayerName(playerName);
      expect(getStoredPlayerName()).toBe(playerName);
      expect(localStorage.getItem(PLAYER_NAME_KEY)).toBe(playerName);
    });

    it('should remove the player name when setting to empty string', () => {
      localStorage.setItem(PLAYER_NAME_KEY, 'Bob');
      // @ts-ignore - testing with empty string which triggers removal in code
      setStoredPlayerName('');
      expect(getStoredPlayerName()).toBeNull();
      expect(localStorage.getItem(PLAYER_NAME_KEY)).toBeNull();
    });
  });
});
