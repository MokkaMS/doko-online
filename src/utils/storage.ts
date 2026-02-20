export const getStoredPlayerId = (): string => {
  const STORAGE_KEY = 'doppelkopf_player_id';
  let storedId = localStorage.getItem(STORAGE_KEY);

  if (!storedId) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      storedId = crypto.randomUUID();
    } else {
      storedId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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
