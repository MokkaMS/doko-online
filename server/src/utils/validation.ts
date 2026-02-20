export const validatePlayerName = (name: string): string | null => {
  if (!name || typeof name !== 'string') return 'Player name is required';
  const trimmed = name.trim();
  if (trimmed.length < 1) return 'Player name is too short';
  if (trimmed.length > 20) return 'Player name is too long (max 20 characters)';
  if (!/^[a-zA-Z0-9 ]+$/.test(trimmed)) return 'Player name contains invalid characters (only alphanumeric and spaces allowed)';
  return null;
};
