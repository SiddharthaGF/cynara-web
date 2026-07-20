import { useEffect, useState, type RefObject } from 'react';

interface FitScaleOptions {
  width: number;
  height: number;
  padding?: number;
  /** Slightly exceed height budget for a larger readable frame. */
  boost?: number;
}

export function useFitScale(
  containerRef: RefObject<HTMLElement | null>,
  { width, height, padding = 12, boost = 1 }: FitScaleOptions,
): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const updateScale = (): void => {
      const bounds = container.getBoundingClientRect();
      const availableWidth = Math.max(bounds.width - padding, 0);
      const availableHeight = Math.max(bounds.height - padding, 0);

      if (availableWidth === 0 || availableHeight === 0) {
        return;
      }

      const widthScale = availableWidth / width;
      const heightScale = availableHeight / height;
      const nextScale = Math.min(widthScale, heightScale * boost);

      setScale(nextScale);
    };

    updateScale();

    const observer = new ResizeObserver(updateScale);
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [boost, containerRef, height, padding, width]);

  return scale;
}
