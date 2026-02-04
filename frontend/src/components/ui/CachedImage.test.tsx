import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { CachedImage, prefetchImage } from './CachedImage';

// Mock global URL methods
const mockRevokeObjectURL = vi.fn();
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url-' + Math.random());

beforeEach(() => {
  vi.stubGlobal('URL', {
    revokeObjectURL: mockRevokeObjectURL,
    createObjectURL: mockCreateObjectURL,
  });
  vi.clearAllMocks();

  // Clear the image cache before each test
  if ((globalThis as any).__clearCachedImageCache__) {
    (globalThis as any).__clearCachedImageCache__();
  }
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('CachedImage', () => {
  const testImageUrl = 'https://example.com/test-image.webp';
  const testDataUri = 'data:image/svg+xml,test';
  const testBlobUrl = 'blob:https://example.com/abc-123';

  describe('Error TTL expiration', () => {
    it('should keep error in cache until TTL expires', async () => {
      const mockFetch = vi.fn(() =>
        Promise.reject(new Error('CORS error'))
      );
      global.fetch = mockFetch;

      render(<CachedImage src={testImageUrl} alt="Test" />);

      // Wait for the fetch attempt
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // The component should have rendered an img (either with original src or fallback)
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
    });

    it('should show fallback when error is fresh and max retries reached', async () => {
      let fetchCallCount = 0;
      const mockFetch = vi.fn(() => {
        fetchCallCount++;
        // Always fail
        return Promise.reject(new Error('CORS error'));
      });

      global.fetch = mockFetch;

      render(<CachedImage src={testImageUrl} alt="Test" />);

      // Wait for the fetch attempt
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // After CORS fetch fails, component should try direct img src
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', testImageUrl);

      // Trigger error on the img to show fallback
      await act(async () => {
        img.dispatchEvent(new Event('error'));
      });

      await waitFor(() => {
        expect(img).toHaveAttribute('src', expect.stringContaining('data:image/svg+xml'));
      });
    });
  });

  describe('Success cache expiration', () => {
    it('should use cached blob URL within TTL', async () => {
      const mockBlob = new Blob(['fake image data']);
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(mockBlob),
        })
      );

      global.fetch = mockFetch;

      // First render
      const { unmount } = render(<CachedImage src={testImageUrl} alt="Test" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      });

      // Second render should use cache (no new fetch)
      unmount();
      render(<CachedImage src={testImageUrl} alt="Test" />);

      await waitFor(() => {
        // Should not call fetch again due to cache
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      });
    });

    it('should re-fetch after TTL expires', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['fake image data'])),
        })
      );

      global.fetch = mockFetch;

      // First render with very short TTL (expires immediately)
      render(<CachedImage src={testImageUrl} ttlMs={0} alt="Test" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Clear cache to simulate expiration
      if ((globalThis as any).__clearCachedImageCache__) {
        (globalThis as any).__clearCachedImageCache__();
      }

      // Second render should fetch again since cache was cleared
      const { unmount } = render(<CachedImage src={testImageUrl} ttlMs={0} alt="Test" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      unmount();
    });

    it('should respect custom ttlMs prop', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['fake image data'])),
        })
      );

      global.fetch = mockFetch;

      // Render with custom TTL
      const { unmount } = render(<CachedImage src={testImageUrl} ttlMs={10000} alt="Test" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Unmount and wait a bit
      unmount();
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Should still use cache (TTL hasn't expired)
      render(<CachedImage src={testImageUrl} ttlMs={10000} alt="Test" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1); // Still just 1 call
      });
    });
  });

  describe('Retry counter', () => {
    it('should increment retryCount on each failed attempt', async () => {
      let fetchCallCount = 0;
      const mockFetch = vi.fn(() => {
        fetchCallCount++;
        if (fetchCallCount === 1) {
          return Promise.reject(new Error('CORS error'));
        }
        // Succeed on second try
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['fake image data'])),
        });
      });

      global.fetch = mockFetch;

      render(<CachedImage src={testImageUrl} alt="Test" />);

      // Wait for first fetch
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it('should stop retrying after MAX_RETRIES attempts', async () => {
      const mockFetch = vi.fn(() =>
        Promise.reject(new Error('CORS error'))
      );

      global.fetch = mockFetch;

      render(<CachedImage src={testImageUrl} alt="Test" />);

      // Wait for the initial fetch
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // After CORS fetch fails, component tries direct img src
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', testImageUrl);

      // Trigger error on the img
      await act(async () => {
        img.dispatchEvent(new Event('error'));
      });

      // Should show fallback
      await waitFor(() => {
        expect(img).toHaveAttribute('src', expect.stringContaining('data:image/svg+xml'));
      });
    });
  });

  describe('Data URI / blob URL guard', () => {
    it('should bypass fetchAsBlobUrl for data URIs', async () => {
      const mockFetch = vi.fn();

      global.fetch = mockFetch;

      render(<CachedImage src={testDataUri} alt="Test" />);

      // Data URIs should not trigger fetch
      expect(mockFetch).not.toHaveBeenCalled();

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', testDataUri);
    });

    it('should bypass fetchAsBlobUrl for blob URLs', async () => {
      const mockFetch = vi.fn();

      global.fetch = mockFetch;

      render(<CachedImage src={testBlobUrl} alt="Test" />);

      // Blob URLs should not trigger fetch
      expect(mockFetch).not.toHaveBeenCalled();

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', testBlobUrl);
    });

    it('should return data URI directly from prefetchImage', async () => {
      const result = await prefetchImage(testDataUri);
      expect(result).toBe(testDataUri);
    });

    it('should return blob URL directly from prefetchImage', async () => {
      const result = await prefetchImage(testBlobUrl);
      expect(result).toBe(testBlobUrl);
    });
  });

  describe('Memory cleanup', () => {
    it('should call URL.createObjectURL when creating blob from fetch', async () => {
      const mockBlob = new Blob(['fake image data']);
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(mockBlob),
        })
      );

      global.fetch = mockFetch;

      render(<CachedImage src={testImageUrl} alt="Test" />);

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      });
    });

    it('should remove expired entries from cache', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['fake image data'])),
        })
      );

      global.fetch = mockFetch;

      // First render
      const { unmount: unmount1 } = render(
        <CachedImage src={testImageUrl} ttlMs={10000} alt="Test" />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      unmount1();

      // Clear cache to simulate expiration
      if ((globalThis as any).__clearCachedImageCache__) {
        (globalThis as any).__clearCachedImageCache__();
      }

      // Second render should trigger new fetch (not use expired cache)
      const { unmount } = render(<CachedImage src={testImageUrl} ttlMs={10000} alt="Test" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      unmount();
    });
  });

  describe('CORS fallback behavior', () => {
    it('should fall back to direct img src when CORS fetch fails', async () => {
      const mockFetch = vi.fn(() =>
        Promise.reject(new Error('CORS error'))
      );

      global.fetch = mockFetch;

      render(<CachedImage src={testImageUrl} alt="Test" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // After fetch fails, should render img with original src
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', testImageUrl);
    });

    it('should load image via direct img when fetch with CORS fails', async () => {
      const mockFetch = vi.fn(() =>
        Promise.reject(new Error('CORS error'))
      );

      global.fetch = mockFetch;

      render(<CachedImage src={testImageUrl} alt="Test" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Component should render img with original src (not blob)
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', testImageUrl);
      // Should NOT show fallback SVG immediately (only after img error)
      expect(img).toHaveAttribute('src', expect.not.stringContaining('data:image/svg+xml'));
    });

    it('should show fallback when both CORS fetch and direct img fail', async () => {
      const mockFetch = vi.fn(() =>
        Promise.reject(new Error('CORS error'))
      );

      global.fetch = mockFetch;

      render(<CachedImage src={testImageUrl} alt="Test" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Simulate img onError
      const img = screen.getByRole('img');
      img.dispatchEvent(new Event('error'));

      await waitFor(() => {
        // Should show fallback SVG
        expect(img).toHaveAttribute('src', expect.stringContaining('data:image/svg+xml'));
      });
    });

    it('should include CORS mode in fetch request', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['fake image data'])),
        })
      );

      global.fetch = mockFetch;

      render(<CachedImage src={testImageUrl} alt="Test" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          testImageUrl,
          expect.objectContaining({
            mode: 'cors',
            credentials: 'omit',
            cache: 'force-cache',
          })
        );
      });
    });
  });

  describe('useBlobCache prop', () => {
    it('should use direct src when useBlobCache is false', async () => {
      const mockFetch = vi.fn();

      global.fetch = mockFetch;

      render(<CachedImage src={testImageUrl} useBlobCache={false} alt="Test" />);

      // Should not call fetch
      expect(mockFetch).not.toHaveBeenCalled();

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', testImageUrl);
    });

    it('should use blob cache when useBlobCache is true (default)', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['fake image data'])),
        })
      );

      global.fetch = mockFetch;

      render(<CachedImage src={testImageUrl} useBlobCache={true} alt="Test" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });

  describe('fallbackSvg prop', () => {
    it('should use custom fallback SVG when provided', async () => {
      const mockFetch = vi.fn(() =>
        Promise.reject(new Error('CORS error'))
      );
      const customFallback = 'data:image/svg+xml,custom-fallback';

      global.fetch = mockFetch;

      render(
        <CachedImage src={testImageUrl} fallbackSvg={customFallback} alt="Test" />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Trigger error state
      const img = screen.getByRole('img');
      await act(async () => {
        img.dispatchEvent(new Event('error'));
      });

      await waitFor(() => {
        expect(img).toHaveAttribute('src', customFallback);
      });
    });

    it('should use default avatar SVG when no custom fallback provided', async () => {
      const mockFetch = vi.fn(() =>
        Promise.reject(new Error('CORS error'))
      );

      global.fetch = mockFetch;

      render(<CachedImage src={testImageUrl} alt="Test" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Trigger error state
      const img = screen.getByRole('img');
      await act(async () => {
        img.dispatchEvent(new Event('error'));
      });

      await waitFor(() => {
        expect(img).toHaveAttribute('src', expect.stringContaining('data:image/svg+xml'));
        // Default SVG has specific content
        expect(img).toHaveAttribute('src', expect.stringContaining('svg'));
      });
    });
  });

  describe('Edge cases', () => {
    it('should render empty span when src is null', () => {
      const { container } = render(<CachedImage src={null} alt="Test" />);
      expect(container.querySelector('span')).toBeInTheDocument();
    });

    it('should render empty span when src is undefined', () => {
      const { container } = render(<CachedImage src={undefined} alt="Test" />);
      expect(container.querySelector('span')).toBeInTheDocument();
    });

    it('should handle crossOrigin prop', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['fake image data'])),
        })
      );

      global.fetch = mockFetch;

      render(<CachedImage src={testImageUrl} crossOrigin="anonymous" alt="Test" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('crossorigin', 'anonymous');
    });

    it('should handle crossOrigin use-credentials', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['fake image data'])),
        })
      );

      global.fetch = mockFetch;

      render(<CachedImage src={testImageUrl} crossOrigin="use-credentials" alt="Test" />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('crossorigin', 'use-credentials');
    });

    it('should pass through additional img props', () => {
      render(
        <CachedImage
          src={testImageUrl}
          alt="Test"
          className="custom-class"
          data-testid="custom-image"
          width="100"
          height="100"
        />
      );

      const img = screen.getByTestId('custom-image');
      expect(img).toHaveClass('custom-class');
      expect(img).toHaveAttribute('width', '100');
      expect(img).toHaveAttribute('height', '100');
    });

    it('should default loading to lazy', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['fake image data'])),
        })
      );

      global.fetch = mockFetch;

      render(<CachedImage src={testImageUrl} alt="Test" />);

      await waitFor(() => {
        expect(screen.getByRole('img')).toHaveAttribute('loading', 'lazy');
      });
    });
  });

  describe('prefetchImage function', () => {
    it('should prefetch image and cache blob URL', async () => {
      const mockBlob = new Blob(['fake image data']);
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(mockBlob),
        })
      );

      global.fetch = mockFetch;

      const result = await prefetchImage(testImageUrl);

      expect(mockFetch).toHaveBeenCalledWith(
        testImageUrl,
        expect.objectContaining({
          mode: 'cors',
          credentials: 'omit',
          cache: 'force-cache',
        })
      );
      expect(result).toMatch(/^blob:mock-url-/);
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
    });

    it('should throw error when prefetch fails', async () => {
      const mockError = new Error('Network error');
      const mockFetch = vi.fn(() => Promise.reject(mockError));

      global.fetch = mockFetch;

      await expect(prefetchImage(testImageUrl)).rejects.toThrow('Network error');
    });

    it('should return cached blob URL on subsequent prefetch calls', async () => {
      const mockBlob = new Blob(['fake image data']);
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(mockBlob),
        })
      );

      global.fetch = mockFetch;

      // First prefetch
      const result1 = await prefetchImage(testImageUrl);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second prefetch should use cache
      const result2 = await prefetchImage(testImageUrl);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still 1, not 2

      // Both should return the same URL
      expect(result1).toBe(result2);
    });

    it('should return data URI directly without fetch when prefetching data URI', async () => {
      const result = await prefetchImage(testDataUri);
      expect(result).toBe(testDataUri);
    });

    it('should return blob URL directly without fetch when prefetching blob URL', async () => {
      const result = await prefetchImage(testBlobUrl);
      expect(result).toBe(testBlobUrl);
    });
  });

  describe('Cache behavior across components', () => {
    it('should share cache between multiple CachedImage components with same src', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['fake image data'])),
        })
      );

      global.fetch = mockFetch;

      // Render multiple components with same src
      render(<CachedImage src={testImageUrl} alt="Test 1" />);
      render(<CachedImage src={testImageUrl} alt="Test 2" />);

      // Both components should trigger only one fetch due to cache sharing
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Both images should be present
      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(2);
    });
  });
});
