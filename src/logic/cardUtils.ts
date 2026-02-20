import { Card, CardValue, Suit, GameSettings, GameType } from './types';

export const CARD_POINTS: Record<CardValue, number> = {
  [CardValue.Ass]: 11,
  [CardValue.Zehn]: 10,
  [CardValue.Koenig]: 4,
  [CardValue.Dame]: 3,
  [CardValue.Bube]: 2,
  [CardValue.Neun]: 0,
};

export const createDeck = (mitNeunen: boolean): Card[] => {
  const deck: Card[] = [];
  const suits = [Suit.Kreuz, Suit.Pik, Suit.Herz, Suit.Karo];
  const values = [
    CardValue.Ass,
    CardValue.Zehn,
    CardValue.Koenig,
    CardValue.Dame,
    CardValue.Bube,
  ];
  if (mitNeunen) values.push(CardValue.Neun);

  // Jede Karte gibt es doppelt
  for (let i = 0; i < 2; i++) {
    for (const suit of suits) {
      for (const value of values) {
        deck.push({
          suit,
          value,
          id: `${suit}-${value}-${i}`,
        });
      }
    }
  }
  return deck;
};

export const shuffle = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

export const isTrump = (card: Card, gameType: GameType, trumpSuit: Suit | null, settings: GameSettings): boolean => {
  // Dulle ist immer Trumpf (außer bei bestimmten Solo-Varianten, hier vereinfacht)
  if (card.value === CardValue.Zehn && card.suit === Suit.Herz && settings.dullenAlsHoechste) {
    return true;
  }

  if (gameType === GameType.Normal || gameType === GameType.Hochzeit) {
    return (
      card.suit === Suit.Karo ||
      card.value === CardValue.Dame ||
      card.value === CardValue.Bube
    );
  }

  if (gameType === GameType.DamenSolo) return card.value === CardValue.Dame;
  if (gameType === GameType.BubenSolo) return card.value === CardValue.Bube;
  if (gameType === GameType.Fleischlos) return false;
  if (gameType === GameType.FarbenSolo) {
    return card.suit === trumpSuit || card.value === CardValue.Dame || card.value === CardValue.Bube;
  }

  return false;
};

export const getCardPower = (card: Card, gameType: GameType, trumpSuit: Suit | null, settings: GameSettings): number => {
  const trump = isTrump(card, gameType, trumpSuit, settings);
  
  if (trump) {
    let power = 1000;
    
    // Dulle
    if (card.value === CardValue.Zehn && card.suit === Suit.Herz && settings.dullenAlsHoechste) {
      return power + 100;
    }

    // Damen
    if (card.value === CardValue.Dame) {
      power += 80;
      if (card.suit === Suit.Kreuz) return power + 4;
      if (card.suit === Suit.Pik) return power + 3;
      if (card.suit === Suit.Herz) return power + 2;
      if (card.suit === Suit.Karo) return power + 1;
    }

    // Buben
    if (card.value === CardValue.Bube) {
      power += 60;
      if (card.suit === Suit.Kreuz) return power + 4;
      if (card.suit === Suit.Pik) return power + 3;
      if (card.suit === Suit.Herz) return power + 2;
      if (card.suit === Suit.Karo) return power + 1;
    }

    // Restlicher Trumpf (Farbe)
    power += 40;
    const effectiveTrumpSuit = (gameType === GameType.FarbenSolo) ? trumpSuit : Suit.Karo;
    if (card.suit === effectiveTrumpSuit) {
        if (card.value === CardValue.Ass) return power + 6;
        if (card.value === CardValue.Zehn) return power + 5;
        if (card.value === CardValue.Koenig) return power + 4;
        if (card.value === CardValue.Neun) return power + 1;
    }
    
    return power;
  } else {
    // Fehlfarben
    let power = 0;
    if (card.value === CardValue.Ass) power = 10;
    if (card.value === CardValue.Zehn) power = 9;
    if (card.value === CardValue.Koenig) power = 8;
    if (card.value === CardValue.Neun) power = 1;
    
    return power;
  }
};

const SUIT_ORDER: Record<Suit, number> = {
  [Suit.Kreuz]: 0,
  [Suit.Pik]: 1,
  [Suit.Herz]: 2,
  [Suit.Karo]: 3,
};

const VALUE_ORDER: Record<CardValue, number> = {
  [CardValue.Ass]: 0,
  [CardValue.Zehn]: 1,
  [CardValue.Koenig]: 2,
  [CardValue.Dame]: 3,
  [CardValue.Bube]: 4,
  [CardValue.Neun]: 5,
};

export const sortCards = (cards: Card[], gameType: GameType, trumpSuit: Suit | null, settings: GameSettings): Card[] => {
  return [...cards].sort((a, b) => {
    const isTrumpA = isTrump(a, gameType, trumpSuit, settings);
    const isTrumpB = isTrump(b, gameType, trumpSuit, settings);

    if (isTrumpA && !isTrumpB) return -1;
    if (!isTrumpA && isTrumpB) return 1;

    if (isTrumpA && isTrumpB) {
      return getCardPower(b, gameType, trumpSuit, settings) - getCardPower(a, gameType, trumpSuit, settings);
    }

    // Beide Fehlfarbe: Sortierung nach Farbe, dann nach Wert
    if (a.suit !== b.suit) {
      return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    }
    return VALUE_ORDER[a.value] - VALUE_ORDER[b.value];
  });
};
