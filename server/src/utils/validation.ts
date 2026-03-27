export const MIN_PLAYER_NAME_LENGTH = 1;
export const MAX_PLAYER_NAME_LENGTH = 20;

export const validatePlayerName = (name: string): string | null => {
  if (!name || typeof name !== 'string') return 'Player name is required';
  const trimmed = name.trim();
  if (trimmed.length < MIN_PLAYER_NAME_LENGTH) return 'Player name is too short';
  if (trimmed.length > MAX_PLAYER_NAME_LENGTH) return `Player name is too long (max ${MAX_PLAYER_NAME_LENGTH} characters)`;
  if (!/^[a-zA-Z0-9 ]+$/.test(trimmed)) return 'Player name contains invalid characters (only alphanumeric and spaces allowed)';
  return null;
};

export const validateRoomId = (roomId: string): string | null => {
  if (!roomId || typeof roomId !== 'string') return 'Room ID is required';
  if (roomId.length < 1) return 'Room ID is too short';
  if (roomId.length > 6) return 'Room ID is too long';
  if (!/^[a-zA-Z0-9]+$/.test(roomId)) return 'Room ID contains invalid characters';
  return null;
};

export const validatePlayerId = (playerId: string): string | null => {
  if (!playerId || typeof playerId !== 'string') return 'Player ID is required';
  if (playerId.length < 1) return 'Player ID is too short';
  if (playerId.length > 36) return 'Player ID is too long';
  if (!/^[a-zA-Z0-9-]+$/.test(playerId)) return 'Player ID contains invalid characters';
  return null;
};

/**
 * Validates a CORS origin string.
 * It must be a valid URL starting with http:// or https:// and not be a wildcard.
 */
export const isValidOrigin = (origin: string): boolean => {
  if (!origin || typeof origin !== 'string') return false;
  if (origin === '*') return false;

  try {
    const url = new URL(origin);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.length > 0;
  } catch (e) {
    return false;
  }
};
