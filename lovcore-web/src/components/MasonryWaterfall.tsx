'use client';

import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

interface MasonryWaterfallProps {
  children: React.ReactNode;
}

export const MasonryWaterfall: React.FC<MasonryWaterfallProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    
    // Select all cards inside the grid
    const items = containerRef.current.querySelectorAll('.masonry-item');
    if (items.length === 0) return;

    // Set initial state to prevent flash of content
    gsap.set(items, { opacity: 0, y: 25, scale: 0.98 });

    // Animate them cascading in
    gsap.to(items, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.45,
      stagger: 0.035, // 35ms staggered entry
      ease: 'power3.out',
      clearProps: 'transform,opacity,scale', // Clear properties to avoid interfering with hover transitions
    });
  }, [children]);

  return (
    <div className="canvas-wrapper">
      <div className="masonry-grid" ref={containerRef}>
        {children}
      </div>
    </div>
  );
};
