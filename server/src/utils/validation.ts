export const validatePlayerName = (name: string): string | null => {
  if (!name || typeof name !== 'string') return 'Player name is required';
  const trimmed = name.trim();
  if (trimmed.length < 1) return 'Player name is too short';
  if (trimmed.length > 20) return 'Player name is too long (max 20 characters)';
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
