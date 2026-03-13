export const getStoredPlayerId = (): string => {
  const STORAGE_KEY = 'doppelkopf_player_id';
  let storedId = localStorage.getItem(STORAGE_KEY);

  if (!storedId) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      storedId = crypto.randomUUID();
    } else if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      storedId = Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } else {
      // Insecure fallback only for extremely old browsers or non-secure contexts
      storedId = Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
    }
    localStorage.setItem(STORAGE_KEY, storedId);
  }

  return storedId;
};

export const getStoredRoomId = (): string | null => {
  return localStorage.getItem('doppelkopf_room_id');
};

export const setStoredRoomId = (roomId: string | null) => {
  if (roomId) {
    localStorage.setItem('doppelkopf_room_id', roomId);
  } else {
    localStorage.removeItem('doppelkopf_room_id');
  }
};

export const getStoredPlayerName = (): string | null => {
  return localStorage.getItem('doppelkopf_player_name');
};

export const setStoredPlayerName = (name: string) => {
  if (name) {
    localStorage.setItem('doppelkopf_player_name', name);
  } else {
    localStorage.removeItem('doppelkopf_player_name');
  }
};
