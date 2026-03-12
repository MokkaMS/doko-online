import { Card, GameState, Player, GameSettings, GameType, Bid, CardValue, Suit } from './types';
import { GameEngine } from './GameEngine';
import { isTrump, getCardPower, CARD_POINTS } from './cardUtils';

export class Bot {

  /**
   * Evaluates the bot's hand to decide on a bid.
   */
  static evaluateHandForBid(player: Player, settings: GameSettings): Bid {
    const hand = player.hand;

    // Check for Hochzeit (Two Kreuz Damen)
    const kreuzDamenCount = hand.filter(c => c.suit === Suit.Kreuz && c.value === CardValue.Dame).length;
    if (kreuzDamenCount === 2) {
      return 'Hochzeit';
    }

    const damenCount = hand.filter(c => c.value === CardValue.Dame).length;
    if (damenCount >= 6) {
      return 'DamenSolo';
    }

    const bubenCount = hand.filter(c => c.value === CardValue.Bube).length;
    if (bubenCount >= 6) {
      return 'BubenSolo';
    }

    const damenBubenCount = damenCount + bubenCount;
    if (damenBubenCount >= 10 && damenCount >= 4) {
      return 'DamenBubensolo';
    }

    // FarbenSolo check: if we have strong trumps of a specific color, but that requires setting trumpSuit which isn't part of Bid.
    // For now we keep it simple.

    return 'Gesund';
  }

  /**
   * Evaluates the game state to decide if the bot should announce Re or Kontra.
   */
  static decideAnnouncement(player: Player, state: GameState, settings: GameSettings): 'Re' | 'Kontra' | null {
    // Only announce if we haven't already
    if (state.reKontraAnnouncements[player.id]) return null;

    // We can only announce in the first few tricks (usually before playing our 2nd card)
    if (player.hand.length < 9) return null;

    const trumps = player.hand.filter(c => isTrump(c, state.gameType, state.trumpSuit, settings));

    const highTrumps = trumps.filter(c => {
      if (c.value === CardValue.Zehn && c.suit === Suit.Herz && settings.dullenAlsHoechste) return true;
      if (c.value === CardValue.Dame && (c.suit === Suit.Kreuz || c.suit === Suit.Pik || c.suit === Suit.Herz)) return true;
      return false;
    });

    const isRe = state.rePlayerIds.includes(player.id);
    const isKontra = state.kontraPlayerIds.includes(player.id);

    // Heuristic: 6+ trumps including 3+ high trumps is very strong
    if (trumps.length >= 6 && highTrumps.length >= 3) {
      if (isRe) return 'Re';
      if (isKontra) return 'Kontra';
    }

    // Holding both Kreuz Damen (Hochzeit player)
    const kreuzDamenCount = player.hand.filter(c => c.suit === Suit.Kreuz && c.value === CardValue.Dame).length;
    if (kreuzDamenCount === 2 && trumps.length >= 5) {
      return 'Re'; // They are "Re" by definition in normal/hochzeit games if they have the queens.
    }

    return null;
  }

  static decideMove(player: Player, state: GameState, settings: GameSettings): Card {
    const legalMoves = player.hand.filter(card =>
      GameEngine.isValidMove(card, player, state.currentTrick, state.gameType, state.trumpSuit, settings)
    );

    if (legalMoves.length === 0) {
      throw new Error(`Bot ${player.name} has no legal moves.`);
    }

    const isSolo = [
      GameType.DamenSolo,
      GameType.BubenSolo,
      GameType.FarbenSolo,
      GameType.Fleischlos
    ].includes(state.gameType);

    const isRe = state.rePlayerIds.includes(player.id);

    // Determine Fuchs
    const fuchs = legalMoves.find(c => c.suit === Suit.Karo && c.value === CardValue.Ass && isTrump(c, state.gameType, state.trumpSuit, settings));

    // 1. LEADING A TRICK
    if (state.currentTrick.length === 0) {
      const myTrumps = legalMoves.filter(c => isTrump(c, state.gameType, state.trumpSuit, settings));
      const myFehl = legalMoves.filter(c => !isTrump(c, state.gameType, state.trumpSuit, settings));

      if ((isRe || isSolo) && myTrumps.length > 0) {
        const highTrumps = myTrumps.filter(c => getCardPower(c, state.gameType, state.trumpSuit, settings) > 1050);
        if (highTrumps.length > 0) {
           return highTrumps.sort((a, b) => getCardPower(b, state.gameType, state.trumpSuit, settings) - getCardPower(a, state.gameType, state.trumpSuit, settings))[0];
        }
      }

      const fehlAces = myFehl.filter(c => c.value === CardValue.Ass);
      if (fehlAces.length > 0) {
        return fehlAces[0];
      }

      return legalMoves.sort((a, b) => getCardPower(a, state.gameType, state.trumpSuit, settings) - getCardPower(b, state.gameType, state.trumpSuit, settings))[0];
    }

    // 2. FOLLOWING A TRICK
    const trickWinnerIndex = GameEngine.evaluateTrick(
      state.currentTrick,
      state.trickStarterIndex,
      state.gameType,
      state.trumpSuit,
      settings
    );
    const trickWinner = state.players[trickWinnerIndex];
    const winnerRelativeIndex = (trickWinnerIndex - state.trickStarterIndex + 4) % 4;
    const winningCard = state.currentTrick[winnerRelativeIndex];
    const winningCardPower = getCardPower(winningCard, state.gameType, state.trumpSuit, settings);
    const winningCardIsTrump = isTrump(winningCard, state.gameType, state.trumpSuit, settings);

    let isPartnerWinning = false;
    if (isSolo) {
      isPartnerWinning = (player.team === trickWinner.team);
    } else {
      if (trickWinner.isRevealed && player.team === trickWinner.team && player.team !== 'Unknown') {
        isPartnerWinning = true;
      }
      if (!isPartnerWinning && state.rePlayerIds.includes(player.id) && state.rePlayerIds.includes(trickWinner.id)) {
        isPartnerWinning = true;
      }
      if (!isPartnerWinning && state.kontraPlayerIds.includes(player.id) && state.kontraPlayerIds.includes(trickWinner.id)) {
        isPartnerWinning = true;
      }
    }

    let opponentPlayedFuchs = false;
    state.currentTrick.forEach((c, idx) => {
      const pIdx = (state.trickStarterIndex + idx) % 4;
      const p = state.players[pIdx];

      let isOpponent = true;
      if (isSolo) {
         isOpponent = p.team !== player.team;
      } else {
         if (p.isRevealed && p.team === player.team && player.team !== 'Unknown') isOpponent = false;
         if (state.rePlayerIds.includes(player.id) && state.rePlayerIds.includes(p.id)) isOpponent = false;
         if (state.kontraPlayerIds.includes(player.id) && state.kontraPlayerIds.includes(p.id)) isOpponent = false;
      }

      if (isOpponent && c.suit === Suit.Karo && c.value === CardValue.Ass && isTrump(c, state.gameType, state.trumpSuit, settings)) {
          opponentPlayedFuchs = true;
      }
    });

    if (isPartnerWinning) {
      // PARTNER IS WINNING -> SMEAR
      let smearCandidates = legalMoves;

      if (fuchs && winningCardPower > 1050) {
        return fuchs;
      }

      smearCandidates.sort((a, b) => {
        const pointsA = CARD_POINTS[a.value];
        const pointsB = CARD_POINTS[b.value];
        if (pointsA !== pointsB) return pointsB - pointsA;

        const powerA = getCardPower(a, state.gameType, state.trumpSuit, settings);
        const powerB = getCardPower(b, state.gameType, state.trumpSuit, settings);
        return powerA - powerB;
      });
      return smearCandidates[0];
    } else {
      // OPPONENT IS WINNING
      const winningCandidates = legalMoves.filter(card => {
        const myPower = getCardPower(card, state.gameType, state.trumpSuit, settings);
        const myIsTrump = isTrump(card, state.gameType, state.trumpSuit, settings);

        if (winningCardIsTrump) {
          return myIsTrump && myPower > winningCardPower;
        } else {
          if (myIsTrump) return true;
          return card.suit === winningCard.suit && myPower > winningCardPower;
        }
      });

      if (opponentPlayedFuchs && winningCandidates.length > 0) {
         // CATCH THE FUCHS
         winningCandidates.sort((a, b) => {
          const powerA = getCardPower(a, state.gameType, state.trumpSuit, settings);
          const powerB = getCardPower(b, state.gameType, state.trumpSuit, settings);
          return powerB - powerA;
        });
        return winningCandidates[0];
      }

      if (winningCandidates.length > 0) {
        // WIN CHEAPLY
        winningCandidates.sort((a, b) => {
          const powerA = getCardPower(a, state.gameType, state.trumpSuit, settings);
          const powerB = getCardPower(b, state.gameType, state.trumpSuit, settings);
          return powerA - powerB;
        });

        let bestWin = winningCandidates[0];
        // SAVE THE FUCHS
        if (fuchs && bestWin.suit === Suit.Karo && bestWin.value === CardValue.Ass && winningCandidates.length > 1) {
            bestWin = winningCandidates[1];
        }
        return bestWin;
      } else {
        // DUCK
        let duckCandidates = [...legalMoves];
        // SAVE THE FUCHS
        if (fuchs && duckCandidates.length > 1) {
           duckCandidates = duckCandidates.filter(c => !(c.suit === Suit.Karo && c.value === CardValue.Ass));
        }

        duckCandidates.sort((a, b) => {
          const pointsA = CARD_POINTS[a.value];
          const pointsB = CARD_POINTS[b.value];
          if (pointsA !== pointsB) return pointsA - pointsB;

          const powerA = getCardPower(a, state.gameType, state.trumpSuit, settings);
          const powerB = getCardPower(b, state.gameType, state.trumpSuit, settings);
          return powerA - powerB;
        });
        return duckCandidates[0];
      }
    }
  }
}
