import { describe, it, expect } from 'bun:test';
import { validateRoomId, validatePlayerId } from './validation';
import crypto from 'crypto';

describe('Secure ID Generation', () => {
  it('should generate valid Room IDs', () => {
    // Simulate generateRoomId()
    const generateRoomId = () => crypto.randomBytes(3).toString('hex').toUpperCase();

    for (let i = 0; i < 100; i++) {
      const roomId = generateRoomId();
      expect(validateRoomId(roomId)).toBeNull();
      expect(roomId).toHaveLength(6);
    }
  });

  it('should generate valid Bot IDs', () => {
    // Simulate botId generation
    const generateBotId = () => `bot-${crypto.randomBytes(4).toString('hex')}`;

    for (let i = 0; i < 100; i++) {
      const botId = generateBotId();
      expect(validatePlayerId(botId)).toBeNull();
      expect(botId.startsWith('bot-')).toBe(true);
      expect(botId.length).toBeLessThanOrEqual(36);
    }
  });

  it('should produce unique IDs', () => {
    const generateRoomId = () => crypto.randomBytes(3).toString('hex').toUpperCase();
    const ids = new Set();
    for (let i = 0; i < 1000; i++) {
      const id = generateRoomId();
      expect(ids.has(id)).toBe(false);
      ids.add(id);
    }
  });
});
