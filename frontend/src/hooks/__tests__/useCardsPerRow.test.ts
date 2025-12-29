import { renderHook, act } from '@testing-library/react';
import { useCardsPerRow } from '../useCardsPerRow';

// Mock window.innerWidth
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

// Mock window.addEventListener and removeEventListener
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

Object.defineProperty(window, 'addEventListener', {
  writable: true,
  configurable: true,
  value: mockAddEventListener,
});

Object.defineProperty(window, 'removeEventListener', {
  writable: true,
  configurable: true,
  value: mockRemoveEventListener,
});

describe('useCardsPerRow', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calculates 1 card for mobile (375px)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    const { result } = renderHook(() => useCardsPerRow());

    expect(result.current).toBe(1);
  });

  it('calculates 2 cards for tablet (768px)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    const { result } = renderHook(() => useCardsPerRow());

    expect(result.current).toBe(2);
  });

  it('calculates 4 cards for desktop (1440px)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1440,
    });

    const { result } = renderHook(() => useCardsPerRow());

    expect(result.current).toBe(4);
  });

  it('caps at 8 cards for large screens (2560px)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 2560,
    });

    const { result } = renderHook(() => useCardsPerRow());

    expect(result.current).toBe(8);
  });

  it('sets up resize event listener on mount', () => {
    renderHook(() => useCardsPerRow());

    expect(mockAddEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('cleans up resize event listener on unmount', () => {
    const { unmount } = renderHook(() => useCardsPerRow());

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
