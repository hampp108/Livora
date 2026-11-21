import React, { useEffect, useRef, useState } from 'react';

interface LazyRoomViewportProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  rootMargin?: string;
  forceMount?: boolean;
}

/**
 * Mounts WebGL 3D canvases only while near or inside the scroll viewport
 * so multi-canvas landing/comparison pages never exceed browser WebGL context limits.
 */
export const LazyRoomViewport: React.FC<LazyRoomViewportProps> = ({
  children,
  fallback,
  className = 'w-full h-full',
  rootMargin = '280px 0px',
  forceMount = false,
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(forceMount);

  useEffect(() => {
    if (forceMount) {
      setIsVisible(true);
      return;
    }
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsVisible(entry.isIntersecting);
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [forceMount, rootMargin]);

  return (
    <div ref={hostRef} className={className}>
      {isVisible ? (
        children
      ) : (
        fallback ?? (
          <div className="w-full h-full flex items-center justify-center bg-[#EAE3D5] text-[#6E6B64] text-xs">
            Preparing 3D viewport…
          </div>
        )
      )}
    </div>
  );
};
