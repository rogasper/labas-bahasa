import { useState, useRef, useEffect, type ReactNode } from "react";

interface Props {
  left: ReactNode;
  right: ReactNode;
  defaultRatio?: number;
  minRatio?: number;
  maxRatio?: number;
  minLeftPx?: number;
  minRightPx?: number;
}

export function ResizableSplitPanel({
  left,
  right,
  defaultRatio = 0.5,
  minRatio = 0.2,
  maxRatio = 0.8,
  minLeftPx = 320,
  minRightPx = 560,
}: Props) {
  const [ratio, setRatio] = useState(defaultRatio);
  const [isDesktop, setIsDesktop] = useState(false);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const isVertical = !isDesktop;

  function getClientPos(e: MouseEvent | TouchEvent): number {
    if ("touches" in e) return isVertical ? e.touches[0].clientY : e.touches[0].clientX;
    return isVertical ? e.clientY : e.clientX;
  }

  function onPointerDown(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    isDragging.current = true;

    const handleMove = (ev: MouseEvent | TouchEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pos = getClientPos(ev);
      const total = isVertical ? rect.height : rect.width;
      if (total <= 0) return;
      let newRatio = ((pos - (isVertical ? rect.top : rect.left)) / total);

      // Clamp with both ratio and pixel constraints
      const pxMinRatio = minLeftPx > 0 ? minLeftPx / total : 0;
      const pxMaxRatio = minRightPx > 0 ? 1 - minRightPx / total : 1;
      const effectiveMin = Math.max(minRatio, pxMinRatio);
      const effectiveMax = Math.min(maxRatio, pxMaxRatio);
      newRatio = Math.max(effectiveMin, Math.min(effectiveMax, newRatio));
      setRatio(newRatio);
    };

    const handleUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleUp);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    document.addEventListener("touchmove", handleMove, { passive: false });
    document.addEventListener("touchend", handleUp);
  }

  useEffect(() => {
    return () => { isDragging.current = false; };
  }, []);

  const leftStyle = isVertical
    ? { height: `${ratio * 100}%` }
    : { width: `${ratio * 100}%` };

  const rightStyle = isVertical
    ? { height: `${(1 - ratio) * 100}%` }
    : { width: `${(1 - ratio) * 100}%` };

  return (
    <div
      ref={containerRef}
      className="flex overflow-hidden"
      style={{ width: "100%", height: "100%" }}
    >
      <div
        className={`flex w-full h-full ${isVertical ? "flex-col" : "flex-row"}`}
      >
        <div className="overflow-y-auto" style={leftStyle}>
          {left}
        </div>

        <div
          className={`shrink-0 flex items-center justify-center transition-colors z-10 select-none ${
            isVertical
              ? "w-full h-[10px] cursor-row-resize bg-[var(--oat-border)] hover:bg-[var(--matcha-500)] active:bg-[var(--matcha-600)]"
              : "h-full w-[8px] cursor-col-resize bg-[var(--oat-border)] hover:bg-[var(--matcha-500)] active:bg-[var(--matcha-600)]"
          }`}
          onMouseDown={onPointerDown}
          onTouchStart={onPointerDown}
          role="separator"
          aria-orientation={isVertical ? "horizontal" : "vertical"}
          aria-valuenow={Math.round(ratio * 100)}
          tabIndex={0}
        >
          <div
            className={`rounded-full bg-current opacity-40 ${
              isVertical
                ? "w-6 h-[3px]"
                : "w-[3px] h-6"
            }`}
          />
        </div>

        <div className="overflow-y-auto" style={rightStyle}>
          {right}
        </div>
      </div>
    </div>
  );
}
