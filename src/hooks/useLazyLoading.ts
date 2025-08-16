import { useState, useEffect, useRef, useCallback } from 'react';

interface UseLazyLoadingProps<T> {
  data: T[];
  initialItemsToShow?: number;
  itemsPerLoad?: number;
  threshold?: number;
}

interface UseLazyLoadingReturn<T> {
  visibleData: T[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  resetToInitial: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function useLazyLoading<T>({
  data,
  initialItemsToShow = 12,
  itemsPerLoad = 12,
  threshold = 200,
}: UseLazyLoadingProps<T>): UseLazyLoadingReturn<T> {
  const [visibleCount, setVisibleCount] = useState(initialItemsToShow);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleData = data.slice(0, visibleCount);
  const hasMore = visibleCount < data.length;

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    
    // Simulate loading delay
    setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + itemsPerLoad, data.length));
      setIsLoading(false);
    }, 300);
  }, [isLoading, hasMore, itemsPerLoad, data.length]);

  const resetToInitial = useCallback(() => {
    setVisibleCount(initialItemsToShow);
    setIsLoading(false);
  }, [initialItemsToShow]);

  // Intersection Observer for automatic loading
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isLoading) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: `${threshold}px`,
        threshold: 0.1,
      }
    );

    const lastElement = container.lastElementChild;
    if (lastElement) {
      observer.observe(lastElement);
    }

    return () => {
      if (lastElement) {
        observer.unobserve(lastElement);
      }
    };
  }, [hasMore, isLoading, loadMore, threshold, visibleCount]);

  // Reset when data changes
  useEffect(() => {
    resetToInitial();
  }, [data, resetToInitial]);

  return {
    visibleData,
    isLoading,
    hasMore,
    loadMore,
    resetToInitial,
    containerRef,
  };
}