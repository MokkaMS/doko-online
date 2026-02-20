import { Card, GameState, Player, GameSettings, GameType } from './types';
import { GameEngine } from './GameEngine';
import { isTrump, getCardPower, CARD_POINTS } from './cardUtils';

export class Bot {
  static decideMove(player: Player, state: GameState, settings: GameSettings): Card {
    const legalMoves = player.hand.filter(card =>
      GameEngine.isValidMove(card, player, state.currentTrick, state.gameType, state.trumpSuit, settings)
    );

    if (legalMoves.length === 0) {
      throw new Error(`Bot ${player.name} has no legal moves.`);
    }

    // Heuristik:
    // Wenn erster Spieler im Stich: kleinste Trumpf oder kleinste Fehlfarbe
    if (state.currentTrick.length === 0) {
      return legalMoves.sort((a, b) => getCardPower(a, state.gameType, state.trumpSuit, settings) - getCardPower(b, state.gameType, state.trumpSuit, settings))[0];
    }

    // Determine current trick winner
    const trickWinnerIndex = GameEngine.evaluateTrick(
      state.currentTrick,
      state.trickStarterIndex,
      state.gameType,
      state.trumpSuit,
      settings
    );
    const trickWinner = state.players[trickWinnerIndex];

    // Find the card played by the winner
    const winnerRelativeIndex = (trickWinnerIndex - state.trickStarterIndex + 4) % 4;
    const winningCard = state.currentTrick[winnerRelativeIndex];
    const winningCardPower = getCardPower(winningCard, state.gameType, state.trumpSuit, settings);
    const winningCardIsTrump = isTrump(winningCard, state.gameType, state.trumpSuit, settings);

    // Is partner winning?
    let isPartnerWinning = false;

    // Solo check: In Solo games, teams are fixed (Soloist vs Others).
    // We assume teams are known/revealed in Solo.
    const isSolo = [
      GameType.DamenSolo,
      GameType.BubenSolo,
      GameType.FarbenSolo,
      GameType.Fleischlos
    ].includes(state.gameType);

    if (isSolo) {
      isPartnerWinning = (player.team === trickWinner.team);
    } else {
      // Normal / Hochzeit
      // Only partner if SAME TEAM and REVEALED
      if (trickWinner.isRevealed && player.team === trickWinner.team && player.team !== 'Unknown') {
        isPartnerWinning = true;
      }
    }

    if (isPartnerWinning) {
      // Smear: Play highest points. Tie-break: Keep stronger cards (Play lowest power among max points).
      legalMoves.sort((a, b) => {
        const pointsA = CARD_POINTS[a.value];
        const pointsB = CARD_POINTS[b.value];
        if (pointsA !== pointsB) return pointsB - pointsA; // Higher points first

        const powerA = getCardPower(a, state.gameType, state.trumpSuit, settings);
        const powerB = getCardPower(b, state.gameType, state.trumpSuit, settings);
        return powerA - powerB; // Lower power first
      });
      return legalMoves[0];
    } else {
      // Try to win or Duck
      const winningCandidates = legalMoves.filter(card => {
        const myPower = getCardPower(card, state.gameType, state.trumpSuit, settings);
        const myIsTrump = isTrump(card, state.gameType, state.trumpSuit, settings);

        if (winningCardIsTrump) {
          return myIsTrump && myPower > winningCardPower;
        } else {
          // Winning card is not trump (Fehlfarbe)
          if (myIsTrump) return true; // Trump beats non-trump
          // Both non-trump: Must be same suit to win (and higher power)
          return card.suit === winningCard.suit && myPower > winningCardPower;
        }
      });

      if (winningCandidates.length > 0) {
        // Win with smallest possible power (cheap win)
        winningCandidates.sort((a, b) => {
          const powerA = getCardPower(a, state.gameType, state.trumpSuit, settings);
          const powerB = getCardPower(b, state.gameType, state.trumpSuit, settings);
          return powerA - powerB;
        });
        return winningCandidates[0];
      } else {
        // Duck: Minimize Points, then Power.
        legalMoves.sort((a, b) => {
          const pointsA = CARD_POINTS[a.value];
          const pointsB = CARD_POINTS[b.value];
          if (pointsA !== pointsB) return pointsA - pointsB; // Lower points first

          const powerA = getCardPower(a, state.gameType, state.trumpSuit, settings);
          const powerB = getCardPower(b, state.gameType, state.trumpSuit, settings);
          return powerA - powerB; // Lower power first
        });
        return legalMoves[0];
      }
    }
  }
}
