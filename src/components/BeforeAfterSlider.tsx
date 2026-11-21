import React, { useCallback, useRef, useState } from 'react';
import { MoveHorizontal, RotateCcw } from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeLabel?: string;
  afterLabel?: string;
  beforeContent: React.ReactNode;
  afterContent: React.ReactNode;
  className?: string;
  initialPosition?: number;
  showReset?: boolean;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeLabel = 'ORIGINAL',
  afterLabel = 'REDESIGNED',
  beforeContent,
  afterContent,
  className = '',
  initialPosition = 50,
  showReset = true,
}) => {
  const [position, setPosition] = useState(initialPosition);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.max(4, Math.min(96, pct)));
  }, []);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="slider"
      aria-label="Before and after room comparison slider"
      aria-valuemin={4}
      aria-valuemax={96}
      aria-valuenow={Math.round(position)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') setPosition((p) => Math.max(4, p - 4));
        if (e.key === 'ArrowRight') setPosition((p) => Math.min(96, p + 4));
      }}
      className={`relative overflow-hidden select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#78816C] ${className}`}
      onPointerDown={(e) => {
        draggingRef.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        updateFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (draggingRef.current) {
          updateFromClientX(e.clientX);
        }
      }}
      onPointerUp={(e) => {
        draggingRef.current = false;
        if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        }
      }}
    >
      {/* After layer (full width underneath) */}
      <div className="absolute inset-0 w-full h-full">{afterContent}</div>

      {/* Before layer (clipped from left) */}
      <div
        className="absolute inset-0 w-full h-full overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        {beforeContent}
      </div>

      {/* Labels */}
      <div className="pointer-events-none absolute top-4 left-4 z-20 px-2.5 py-1 bg-[#30332F]/90 text-[#F4F0E8] text-[11px] font-semibold tracking-[0.12em] uppercase rounded">
        {beforeLabel}
      </div>
      <div className="pointer-events-none absolute top-4 right-4 z-20 px-2.5 py-1 bg-[#78816C]/95 text-[#FFFFFF] text-[11px] font-semibold tracking-[0.12em] uppercase rounded">
        {afterLabel}
      </div>

      {/* Reset Comparison Button */}
      {showReset && Math.abs(position - initialPosition) > 1 && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setPosition(initialPosition);
          }}
          className="absolute bottom-4 left-4 z-30 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFFFF]/95 hover:bg-[#F4F0E8] text-[#30332F] border border-[#D8C9B5] text-xs font-medium rounded-lg shadow-sm transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Comparison</span>
        </button>
      )}

      {/* Divider handle */}
      <div
        className="pointer-events-none absolute top-0 bottom-0 z-30 w-0.5 bg-[#FFFFFF] shadow-md"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#FFFFFF] border border-[#30332F]/20 shadow-lg flex items-center justify-center text-[#30332F]">
          <MoveHorizontal className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

