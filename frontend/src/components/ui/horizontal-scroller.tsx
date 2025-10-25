import React, { useRef, useCallback } from 'react';

interface HorizontalScrollerProps {
  title?: string;
  children: React.ReactNode;
  cardType?: 'vertical' | 'horizontal';
  onEndReached?: () => void;
  isLoadingMore?: boolean;
}

export function HorizontalScroller({
  title,
  children,
  cardType = 'vertical',
  onEndReached,
  isLoadingMore = false,
}: HorizontalScrollerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const cardWidthClasses = {
    vertical: 'w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-0.666rem)] lg:w-[calc(25%-0.75rem)]',
    horizontal: 'w-full md:w-[calc(50%-0.5rem)]',
  };

  const wrapperClass = cardWidthClasses[cardType] || cardWidthClasses.vertical;

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
      // Load more when user is 250px from the end
      if (scrollLeft + clientWidth >= scrollWidth - 250) {
        if (onEndReached) {
          onEndReached();
        }
      }
    },
    [onEndReached]
  );

  return (
    <div>
      {title && (
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xl font-semibold text-content">{title}</h3>
          <div className="hidden md:flex gap-2">
            <button
              onClick={() => scroll('left')}
              className="p-1 rounded-full bg-light hover:bg-gray-700/50 text-content"
              aria-label="Scroll left"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-1 rounded-full bg-light hover:bg-gray-700/50 text-content"
              aria-label="Scroll right"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      )}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto pb-4 no-scrollbar"
      >
        {React.Children.map(children, (child, index) => (
          <div key={index} className={`flex-shrink-0 ${wrapperClass}`}>
            {child}
          </div>
        ))}
        {isLoadingMore && (
          <div className={`flex-shrink-0 ${wrapperClass} flex items-center justify-center`}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </div>
    </div>
  );
}
