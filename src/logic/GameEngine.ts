import { Card, GameState, GameType, Player, Suit, Team, GameSettings, CardValue } from './types';
import { createDeck, shuffle, isTrump, getCardPower, CARD_POINTS } from './cardUtils';

export class GameEngine {
  static createInitialState(playerNames: string[], settings: GameSettings): GameState {
    const deck = shuffle(createDeck(settings.mitNeunen));
    const cardsPerPlayer = deck.length / 4;
    
    const players: Player[] = playerNames.map((name, index) => ({
      id: `p${index}`,
      name,
      isBot: index > 0,
      hand: deck.slice(index * cardsPerPlayer, (index + 1) * cardsPerPlayer),
      team: 'Unknown',
      isRevealed: false,
      points: 0,
      tricks: [],
    }));

    return {
      players,
      currentPlayerIndex: 1, // Dealer ist p0, p1 fängt an
      dealerIndex: 0,
      currentTrick: [],
      trickStarterIndex: 1,
      trickWinnerIndex: null,
      gameType: GameType.Normal,
      trumpSuit: null,
      rePlayerIds: [],
      kontraPlayerIds: [],
      announcements: {},
      reKontraAnnouncements: {},
      specialPoints: { re: [], kontra: [] },
      notifications: [],
      phase: 'MainMenu',
    };
  }

  static rotateDealer(state: GameState, settings: GameSettings): GameState {
    const nextDealer = (state.dealerIndex + 1) % 4;
    const playerNames = state.players.map(p => p.name);
    const newState = this.createInitialState(playerNames, settings);
    newState.dealerIndex = nextDealer;
    newState.currentPlayerIndex = (nextDealer + 1) % 4;
    newState.trickStarterIndex = (nextDealer + 1) % 4;
    newState.phase = 'Bidding';
    return this.determineTeams(newState);
  }

  static determineFinalGameType(bids: Record<string, string>): GameType {
    const soloTypes = ['DamenSolo', 'BubenSolo', 'FarbenSolo', 'Fleischlos'];
    for (const [_, bid] of Object.entries(bids)) {
        if (soloTypes.includes(bid)) return bid as GameType;
    }
    if (Object.values(bids).includes('Hochzeit')) return GameType.Hochzeit;
    return GameType.Normal;
  }

  static determineTeams(state: GameState): GameState {
    const newState = { ...state };
    const rePlayerIds: string[] = [];
    const kontraPlayerIds: string[] = [];

    newState.players = newState.players.map((player) => {
      const kreuzDamenCount = player.hand.filter(c => c.suit === Suit.Kreuz && c.value === CardValue.Dame).length;
      let team: Team = 'Unknown';
      
      if (kreuzDamenCount >= 1) {
        rePlayerIds.push(player.id);
        team = 'Re';
      } else {
        kontraPlayerIds.push(player.id);
        team = 'Kontra';
      }
      return { ...player, team };
    });

    newState.rePlayerIds = rePlayerIds;
    newState.kontraPlayerIds = kontraPlayerIds;
    return newState;
  }

  static revealFinalTeams(state: GameState): Player[] {
    return state.players.map(p => ({
      ...p,
      team: state.rePlayerIds.includes(p.id) ? 'Re' : 'Kontra'
    }));
  }

  static isValidMove(card: Card, player: Player, trick: Card[], gameType: GameType, trumpSuit: Suit | null, settings: GameSettings): boolean {
    if (trick.length === 0) return true;

    const firstCard = trick[0];
    const firstIsTrump = isTrump(firstCard, gameType, trumpSuit, settings);
    const cardIsTrump = isTrump(card, gameType, trumpSuit, settings);

    if (firstIsTrump) {
      const hasTrump = player.hand.some(c => isTrump(c, gameType, trumpSuit, settings));
      if (hasTrump) return cardIsTrump;
    } else {
      const hasSuit = player.hand.some(c => !isTrump(c, gameType, trumpSuit, settings) && c.suit === firstCard.suit);
      if (hasSuit) return !cardIsTrump && card.suit === firstCard.suit;
    }
    return true;
  }

  static evaluateTrick(trick: Card[], firstPlayerIndex: number, gameType: GameType, trumpSuit: Suit | null, settings: GameSettings): number {
    let winnerIndex = 0;
    let bestCard = trick[0];
    let bestPower = getCardPower(bestCard, gameType, trumpSuit, settings);

    for (let i = 1; i < trick.length; i++) {
      const currentCard = trick[i];
      const currentPower = getCardPower(currentCard, gameType, trumpSuit, settings);
      
      let isBetter = false;
      const currentIsTrump = isTrump(currentCard, gameType, trumpSuit, settings);
      const bestIsTrump = isTrump(bestCard, gameType, trumpSuit, settings);

      if (currentIsTrump) {
        if (!bestIsTrump || currentPower > bestPower) isBetter = true;
      } else if (!bestIsTrump) {
        if (currentCard.suit === trick[0].suit && currentPower > bestPower) isBetter = true;
      }

      if (isBetter) {
        bestCard = currentCard;
        bestPower = currentPower;
        winnerIndex = i;
      }
    }
    return (firstPlayerIndex + winnerIndex) % 4;
  }

  static calculateTrickPoints(trick: Card[]): number {
    return trick.reduce((sum, card) => sum + CARD_POINTS[card.value], 0);
  }
}
