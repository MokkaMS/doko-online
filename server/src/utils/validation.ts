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
