import { Card, GameState, GameType, Player, Suit, Team, GameSettings, CardValue, ScoringResult } from './types';
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
      tournamentPoints: 0,
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

  static determineFinalGameType(bids: Record<string, string>, playerIdsInOrder: string[]): { gameType: GameType, trumpSuit: Suit | null, soloPlayerId: string | null } {
    const priorityOrder = [
      GameType.FarbenSolo,
      GameType.DamenSolo,
      GameType.BubenSolo,
      GameType.Fleischlos,
      GameType.Hochzeit,
      GameType.Normal
    ];

    const parsedBids = Object.entries(bids).map(([pid, rawBid]) => {
        let type = GameType.Normal;
        let trump: Suit | null = null;

        if (rawBid.startsWith('FarbenSolo')) {
            type = GameType.FarbenSolo;
            const parts = rawBid.split('_');
            if (parts.length > 1) trump = parts[1] as Suit;
        } else if (rawBid === 'Fleischlos') {
            type = GameType.Fleischlos;
        } else if (rawBid === 'DamenSolo') {
            type = GameType.DamenSolo;
        } else if (rawBid === 'BubenSolo') {
            type = GameType.BubenSolo;
        } else if (rawBid === 'Hochzeit') {
            type = GameType.Hochzeit;
        }

        return { pid, type, trump };
    });

    for (const targetType of priorityOrder) {
        if (targetType === GameType.Normal) continue;

        const bidders = parsedBids.filter(b => b.type === targetType);

        if (bidders.length > 0) {
            // Sort by position in playerIdsInOrder (priority to earlier players)
            const winner = bidders.sort((a, b) => {
                return playerIdsInOrder.indexOf(a.pid) - playerIdsInOrder.indexOf(b.pid);
            })[0];

            return { gameType: winner.type, trumpSuit: winner.trump, soloPlayerId: winner.pid };
        }
    }

    return { gameType: GameType.Normal, trumpSuit: null, soloPlayerId: null };
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

  static checkTrickSpecialPoints(
    trick: Card[],
    winnerIndex: number,
    starterIndex: number,
    players: Player[],
    settings: GameSettings,
    isLastTrick: boolean
  ): { re: string[], kontra: string[] } {
    const rePoints: string[] = [];
    const kontraPoints: string[] = [];

    const winner = players[winnerIndex];
    const winnerTeam = winner.team;

    // 1. Doppelkopf
    if (settings.doppelkopfPunkte) {
        const points = this.calculateTrickPoints(trick);
        if (points >= 40) {
            if (winnerTeam === 'Re') rePoints.push('Doppelkopf');
            else if (winnerTeam === 'Kontra') kontraPoints.push('Doppelkopf');
        }
    }

    // 2. Fuchs gefangen
    if (settings.fuchsGefangen) {
        trick.forEach((card, i) => {
            if (card.suit === Suit.Karo && card.value === CardValue.Ass) {
                const playerIdx = (starterIndex + i) % 4;
                const player = players[playerIdx];

                if (player.team === 'Re' && winnerTeam === 'Kontra') {
                    kontraPoints.push('Fuchs gefangen');
                } else if (player.team === 'Kontra' && winnerTeam === 'Re') {
                    rePoints.push('Fuchs gefangen');
                }
            }
        });
    }

    // 3. Karlchen
    if (settings.karlchen && isLastTrick) {
        const cardIndex = (winnerIndex - starterIndex + 4) % 4;
        const winningCard = trick[cardIndex];

        if (winningCard.suit === Suit.Kreuz && winningCard.value === CardValue.Bube) {
             if (winnerTeam === 'Re') rePoints.push('Karlchen');
             else if (winnerTeam === 'Kontra') kontraPoints.push('Karlchen');
        }
    }

    return { re: rePoints, kontra: kontraPoints };
  }

  static calculateGameResult(state: GameState): GameState {
    const newState = { ...state };

    // 1. Calculate total Augen
    let reAugen = 0;
    let kontraAugen = 0;

    newState.players.forEach(p => {
        if (p.team === 'Re') reAugen += p.points;
        else if (p.team === 'Kontra') kontraAugen += p.points;
    });

    // 2. Determine Winner
    // Re needs > 120 to win.
    let winner: 'Re' | 'Kontra' = 'Re';
    if (reAugen > 120) {
        winner = 'Re';
    } else {
        winner = 'Kontra';
    }

    // 3. Base Points & 4. Thresholds
    const reDetails: string[] = [];
    const kontraDetails: string[] = [];
    let reGamePoints = 0;
    let kontraGamePoints = 0;

    if (winner === 'Re') {
        reGamePoints += 1;
        reDetails.push('Gewonnenes Spiel');

        if (reAugen > 150) { reGamePoints += 1; reDetails.push('Über 150 Augen'); }
        if (reAugen > 180) { reGamePoints += 1; reDetails.push('Über 180 Augen'); }
        if (reAugen > 210) { reGamePoints += 1; reDetails.push('Über 210 Augen'); }
        if (kontraAugen === 0) { reGamePoints += 1; reDetails.push('Schwarz'); }

    } else {
        kontraGamePoints += 1;
        kontraDetails.push('Gewonnenes Spiel');

        kontraGamePoints += 1;
        kontraDetails.push('Gegen die Alten');

        if (kontraAugen > 150) { kontraGamePoints += 1; kontraDetails.push('Über 150 Augen'); }
        if (kontraAugen > 180) { kontraGamePoints += 1; kontraDetails.push('Über 180 Augen'); }
        if (kontraAugen > 210) { kontraGamePoints += 1; kontraDetails.push('Über 210 Augen'); }
        if (reAugen === 0) { kontraGamePoints += 1; kontraDetails.push('Schwarz'); }
    }

    // 5. Special Points
    state.specialPoints.re.forEach(sp => {
        reGamePoints += 1;
        reDetails.push(sp);
    });
    state.specialPoints.kontra.forEach(sp => {
        kontraGamePoints += 1;
        kontraDetails.push(sp);
    });

    // 6. Announcements
    const reAnnounced = Object.values(state.reKontraAnnouncements).includes('Re');
    const kontraAnnounced = Object.values(state.reKontraAnnouncements).includes('Kontra');

    if (reAnnounced) {
        if (winner === 'Re') {
            reGamePoints += 1;
            reDetails.push('Re angesagt');
        } else {
            kontraGamePoints += 1;
            kontraDetails.push('Re verloren');
        }
    }

    if (kontraAnnounced) {
        if (winner === 'Kontra') {
            kontraGamePoints += 1;
            kontraDetails.push('Kontra angesagt');
        } else {
            reGamePoints += 1;
            reDetails.push('Kontra verloren');
        }
    }

    // 7. Net Calculation
    let netScore = 0;
    if (winner === 'Re') {
        netScore = reGamePoints - kontraGamePoints;
    } else {
        netScore = kontraGamePoints - reGamePoints;
    }

    const isSolo = [GameType.DamenSolo, GameType.BubenSolo, GameType.FarbenSolo, GameType.Fleischlos].includes(state.gameType);

    // Update Tournament Points
    newState.players = newState.players.map(p => {
        let pointsChange = 0;

        if (isSolo) {
            // Solo: Soloist (Re) gets 3x, Opponents (Kontra) get 1x.
            // Signs depend on winner.

            if (p.team === winner) {
                 // Member of winning team
                 if (p.team === 'Re') {
                     // Soloist wins
                     pointsChange = netScore * 3;
                 } else {
                     // Kontra wins (against Soloist)
                     pointsChange = netScore;
                 }
            } else {
                 // Member of losing team
                 if (p.team === 'Re') {
                     // Soloist lost
                     // netScore is positive points for winner (Kontra).
                     // Soloist loses netScore * 3
                     pointsChange = -netScore * 3;
                 } else {
                     // Opponent lost (against Soloist)
                     // netScore is positive points for winner (Re).
                     // Opponent loses netScore
                     pointsChange = -netScore;
                 }
            }
        } else {
             // Normal Scoring
             if (p.team === winner) {
                 pointsChange = netScore;
             } else {
                 pointsChange = -netScore;
             }
        }

        return { ...p, tournamentPoints: p.tournamentPoints + pointsChange };
    });

    // 8. Store Result
    const result: ScoringResult = {
        winner,
        winningPoints: netScore,
        winnerTeam: newState.players.filter(p => p.team === winner).map(p => p.id),
        reAugen,
        kontraAugen,
        reSpecialPoints: state.specialPoints.re,
        kontraSpecialPoints: state.specialPoints.kontra,
        details: {
            re: reDetails,
            kontra: kontraDetails
        }
    };

    newState.lastGameResult = result;

    return newState;
  }
}
