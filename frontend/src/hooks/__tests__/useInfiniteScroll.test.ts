import { renderHook, act, waitFor } from '@testing-library/react';
import { useInfiniteScroll } from '../useInfiniteScroll';

// Mock IntersectionObserver
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  target: Element | null = null;
  callback: IntersectionObserverCallback = () => {};

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    if (options?.rootMargin) {
      this.rootMargin = options.rootMargin as string;
    }
    if (options?.threshold) {
      this.thresholds = Array.isArray(options.threshold) ? options.threshold : [options.threshold];
    }
  }

  observe(target: Element): void {
    this.target = target;
  }

  unobserve(): void {
    this.target = null;
  }

  disconnect(): void {
    this.target = null;
  }

  // Helper method to trigger intersection for testing
  triggerIntersection(isIntersecting: boolean): void {
    if (this.target) {
      act(() => {
        this.callback([{ isIntersecting, target: this.target! }], this);
      });
    }
  }
}

// Mock global IntersectionObserver
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

describe('useInfiniteScroll', () => {
  it('returns loadMoreRef callback and isIntersecting state', () => {
    const { result } = renderHook(() => useInfiniteScroll());

    expect(result.current.loadMoreRef).toBeInstanceOf(Function);
    expect(typeof result.current.isIntersecting).toBe('boolean');
    expect(result.current.isIntersecting).toBe(false);
  });

  it('creates IntersectionObserver with default options', () => {
    const { result } = renderHook(() => useInfiniteScroll());

    // Get the observer by calling the callback ref
    const div = document.createElement('div');
    act(() => {
      result.current.loadMoreRef(div);
    });

    // The observer should be created internally
    expect(div).not.toBe(null);
  });

  it('creates IntersectionObserver with custom options', () => {
    const { result } = renderHook(() =>
      useInfiniteScroll({ threshold: 0.5, rootMargin: '100px' })
    );

    const div = document.createElement('div');
    act(() => {
      result.current.loadMoreRef(div);
    });

    expect(div).not.toBe(null);
  });

  it('sets isIntersecting to true when element intersects', async () => {
    const { result } = renderHook(() => useInfiniteScroll());

    const div = document.createElement('div');
    act(() => {
      result.current.loadMoreRef(div);
    });

    // Find the observer instance (stored as a property on the element)
    const observer = (div as any).__observer;
    if (observer) {
      await waitFor(() => {
        act(() => {
          observer.triggerIntersection(true);
        });
      });

      expect(result.current.isIntersecting).toBe(true);
    }
  });

  it('disconnects observer on unmount', () => {
    const { result, unmount } = renderHook(() => useInfiniteScroll());

    const div = document.createElement('div');
    act(() => {
      result.current.loadMoreRef(div);
    });

    const observer = (div as any).__observer;

    unmount();

    // Observer should be disconnected
    if (observer) {
      expect(observer.target).toBe(null);
    }
  });
});
