import React, { memo } from 'react';
import { Card, Suit, CardValue } from '../logic/types';

const suitSymbols: Record<Suit, string> = {
  [Suit.Kreuz]: '♣',
  [Suit.Pik]: '♠',
  [Suit.Herz]: '♥',
  [Suit.Karo]: '♦'
};

const valueSymbols: Record<CardValue, string> = {
  [CardValue.Ass]: 'A',
  [CardValue.Zehn]: '10',
  [CardValue.Koenig]: 'K',
  [CardValue.Dame]: 'D',
  [CardValue.Bube]: 'B',
  [CardValue.Neun]: '9'
};

interface CardComponentProps {
  card: Card;
  onClick?: (card: Card) => void;
  className?: string;
  disabled?: boolean;
}

export const CardComponent = memo<CardComponentProps>(({ card, onClick, className, disabled }) => {
  const isRed = card.suit === Suit.Herz || card.suit === Suit.Karo;
  const handleClick = () => {
    if (onClick && !disabled) {
      onClick(card);
    }
  };
  return (
    <div className={`card ${isRed ? 'red' : 'black'} ${className || ''} ${disabled ? 'disabled' : ''}`} onClick={handleClick}>
      <div className="card-corner top">{valueSymbols[card.value]}</div>
      <div className="card-center">{suitSymbols[card.suit]}</div>
      <div className="card-corner bottom">{valueSymbols[card.value]}</div>
    </div>
  );
});
