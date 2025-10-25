import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui';

interface CarouselButton {
  to: string;
  label: string;
  variant?: 'primary' | 'light' | 'secondary' | 'danger' | 'dark';
  icon?: string;
}

interface CarouselCard {
  title: string;
  description: string;
  buttons: CarouselButton[];
  image_url?: string;
  isPlus?: boolean;
}

interface DashboardCarouselProps {
  cards?: CarouselCard[];
  autoRotateInterval?: number;
}

function CarouselCard({ title, description, buttons, image_url, isPlus = false }: CarouselCard) {
  const { t } = useTranslation();

  return (
    <div className="relative w-full h-80 sm:h-96 md:h-full overflow-hidden group">
      {image_url && (
        <img
          src={image_url}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
      <div className="absolute inset-0 flex flex-col justify-center p-8 text-white top-1/2 -translate-y-1/4">
        {isPlus && (
          <span
            className="absolute top-4 right-4 text-xs font-bold bg-yellow-500 text-black px-2 py-1 rounded-full flex items-center gap-1"
            title={t('dashboard.plusRequired', 'Requires Plus Plan')}
          >
            <span className="material-symbols-outlined text-sm">diamond</span>
            PLUS
          </span>
        )}
        <h3 className="text-2xl sm:text-3xl font-bold">{title}</h3>
        <p className="text-sm sm:text-base mt-1 mb-4">{description}</p>
        <div className="flex flex-wrap gap-2">
          {buttons.map((btn, index) => (
            <Link to={btn.to} key={index}>
              <Button variant={btn.variant || 'primary'} size="extra-small" icon={btn.icon}>
                {btn.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardCarousel({
  cards = [],
  autoRotateInterval = 5000,
}: DashboardCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);

  useEffect(() => {
    // Simulate loading - in real app this would fetch from API
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? cards.length - 1 : prev - 1));
  }, [cards.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  }, [cards.length]);

  useEffect(() => {
    if (cards.length > 0) {
      resetTimeout();
      timeoutRef.current = setTimeout(goToNext, autoRotateInterval);
      return () => resetTimeout();
    }
  }, [currentIndex, cards.length, resetTimeout, goToNext, autoRotateInterval]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current - touchEndXRef.current > 50) {
      goToNext();
    }

    if (touchStartXRef.current - touchEndXRef.current < -50) {
      goToPrevious();
    }
  };

  const goToSlide = (slideIndex: number) => setCurrentIndex(slideIndex);

  if (loading) {
    return (
      <div className="relative h-80 sm:h-96 md:h-[420px] md:max-h-[420px] bg-light animate-pulse"></div>
    );
  }

  if (cards.length === 0) {
    return null;
  }

  return (
    <div
      className="relative h-80 sm:h-96 md:h-[420px] md:max-h-[420px]"
      onMouseEnter={resetTimeout}
      onMouseLeave={() => {
        timeoutRef.current = setTimeout(goToNext, autoRotateInterval);
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="overflow-hidden h-full">
        <div
          className="flex h-full transition-transform ease-in-out duration-500"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {cards.map((item, index) => (
            <div key={index} className="w-full flex-shrink-0 h-full">
              <CarouselCard {...item} />
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {cards.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              currentIndex === index ? 'w-6 bg-primary' : 'w-2 bg-white/50 hover:bg-white'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-normal to-transparent pointer-events-none"></div>
    </div>
  );
}
