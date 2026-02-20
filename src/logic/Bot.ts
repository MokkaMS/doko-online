import { Card, GameState, Player, GameSettings } from './types';
import { GameEngine } from './GameEngine';
import { isTrump, getCardPower } from './cardUtils';

export class Bot {
  static decideMove(player: Player, state: GameState, settings: GameSettings): Card {
    if (!player.hand || player.hand.length === 0) {
      throw new Error(`Bot ${player.name} has no cards!`);
    }

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

    // Wenn letzter Spieler: Versuchen zu gewinnen mit kleinster möglicher Karte
    // Oder schmieren wenn Partner gewinnt
    // Hier vereinfacht: nimm zufälligen legalen Zug
    const randomIndex = Math.floor(Math.random() * legalMoves.length);
    return legalMoves[randomIndex];
  }
}
