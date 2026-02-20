export enum Suit {
  Kreuz = 'Kreuz',
  Pik = 'Pik',
  Herz = 'Herz',
  Karo = 'Karo',
}

export enum CardValue {
  Ass = 'Ass',
  Zehn = 'Zehn',
  Koenig = 'König',
  Dame = 'Dame',
  Bube = 'Bube',
  Neun = 'Neun',
}

export interface Card {
  suit: Suit;
  value: CardValue;
  id: string; // Eindeutige ID für React keys
}

export type Team = 'Re' | 'Kontra' | 'Unknown';

export enum GameType {
  Normal = 'Normal',
  Hochzeit = 'Hochzeit',
  StillesSolo = 'StillesSolo',
  Fleischlos = 'Fleischlos',
  BubenSolo = 'BubenSolo',
  DamenSolo = 'DamenSolo',
  FarbenSolo = 'FarbenSolo',
}

export interface Player {
  id: string;
  socketId?: string;
  name: string;
  isBot: boolean;
  hand: Card[];
  team: Team;
  isRevealed?: boolean;
  points: number; // Current game points (Augen)
  tournamentPoints: number; // Long-term score
  tricks: Card[][];
  connected?: boolean;
  disconnectTime?: number;
}

export interface GameSettings {
  mitNeunen: boolean;
  dullenAlsHoechste: boolean;
  schweinchen: boolean;
  fuchsGefangen: boolean;
  karlchen: boolean;
  doppelkopfPunkte: boolean;
  soloPrioritaet: boolean;
}

export type Bid = 'Gesund' | 'Hochzeit' | 'DamenSolo' | 'BubenSolo' | 'FarbenSolo' | 'Fleischlos';

export interface ScoringResult {
  winner: 'Re' | 'Kontra' | null;
  winningPoints: number; // The net points awarded to the winner (and subtracted from loser)
  winnerTeam: string[]; // Player IDs
  reAugen: number;
  kontraAugen: number;
  reSpecialPoints: string[];
  kontraSpecialPoints: string[];
  details: {
      re: string[]; // List of points descriptions, e.g., ["Gewonnen: 1", "Fuchs: 1"]
      kontra: string[];
  }
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  dealerIndex: number;
  currentTrick: Card[];
  trickStarterIndex: number;
  trickWinnerIndex: number | null;
  gameType: GameType;
  trumpSuit: Suit | null; // Nur bei Farbsolo relevant
  rePlayerIds: string[];
  kontraPlayerIds: string[];
  announcements: { [playerId: string]: string[] };
  reKontraAnnouncements: { [playerId: string]: 'Re' | 'Kontra' | null };
  specialPoints: { re: string[], kontra: string[] }; // Tracks events during game
  lastGameResult?: ScoringResult; // Stores the result of the last game
  notifications: { id: number, text: string }[];
  phase: 'MainMenu' | 'Lobby' | 'Settings' | 'Dealing' | 'Bidding' | 'Playing' | 'Scoring';
  lastActivePhase?: 'Bidding' | 'Playing' | 'Scoring';
}
