import { useState, useEffect } from 'react';

/**
 * Calculates how many character cards fit per row based on viewport width
 *
 * Card width: ~280px (240px card + 40px gap)
 * Breakpoints:
 * - Mobile (<640px): 1-2 cards
 * - Tablet (640-1024px): 3-4 cards
 * - Desktop (1024-1440px): 4-5 cards
 * - Large (>1440px): 6+ cards
 */
export function useCardsPerRow(): number {
  // Calculate initial value immediately to avoid race conditions
  const getInitialCardsPerRow = (): number => {
    if (typeof window === 'undefined') return 4;
    const containerWidth = window.innerWidth - 64; // Subtract padding (32px each side)
    const cardWidth = 280; // Card + gap
    const calculated = Math.floor(containerWidth / cardWidth);
    return Math.max(1, Math.min(8, calculated));
  };

  const [cardsPerRow, setCardsPerRow] = useState<number>(getInitialCardsPerRow());

  useEffect(() => {
    const calculateCardsPerRow = () => {
      const containerWidth = window.innerWidth - 64; // Subtract padding (32px each side)
      const cardWidth = 280; // Card + gap

      const calculated = Math.floor(containerWidth / cardWidth);

      // Min 1, max 8
      const clamped = Math.max(1, Math.min(8, calculated));

      setCardsPerRow(clamped);
    };

    // Recalculate on resize
    window.addEventListener('resize', calculateCardsPerRow);
    return () => window.removeEventListener('resize', calculateCardsPerRow);
  }, []);

  return cardsPerRow;
}
