import React, { useLayoutEffect, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';

interface MasonryWaterfallProps {
  children: React.ReactNode;
}

export const MasonryWaterfall: React.FC<MasonryWaterfallProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(window.scrollY);
  const velocity = useRef(0);
  const requestRef = useRef<number | null>(null);
  const [numColumns, setNumColumns] = useState(4);

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setNumColumns(1);
      } else if (width < 980) {
        setNumColumns(2);
      } else if (width < 1280) {
        setNumColumns(3);
      } else {
        setNumColumns(4);
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  const columns = useMemo(() => {
    const childArray = React.Children.toArray(children);
    const nextColumns: React.ReactNode[][] = Array.from({ length: numColumns }, () => []);

    childArray.forEach((child, index) => {
      nextColumns[index % numColumns].push(child);
    });

    return nextColumns;
  }, [children, numColumns]);

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

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const diff = currentScrollY - lastScrollY.current;
      lastScrollY.current = currentScrollY;

      // Limit max velocity to avoid extreme distortions
      const maxVel = 90;
      velocity.current = Math.max(-maxVel, Math.min(maxVel, diff));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Smooth physics damping loop
    const updatePhysics = () => {
      // Decay velocity toward 0 with smooth damping factor
      velocity.current *= 0.84;

      // Prevent tiny floating calculations
      if (Math.abs(velocity.current) < 0.1) {
        velocity.current = 0;
      }

      if (containerRef.current) {
        const items = containerRef.current.querySelectorAll('.masonry-item');
        if (items.length > 0) {
          const skewAngle = velocity.current * -0.22;
          const scaleRatio = 1 - Math.abs(velocity.current) * 0.0024;

          gsap.to(items, {
            skewY: skewAngle,
            scaleY: scaleRatio,
            duration: 0.28,
            ease: 'power2.out',
            overwrite: 'auto'
          });
        }
      }

      requestRef.current = requestAnimationFrame(updatePhysics);
    };

    requestRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  return (
    <div className="canvas-wrapper">
      <div className="masonry-grid masonry-grid-flex" ref={containerRef}>
        {columns.map((column, index) => (
          <div className="masonry-column" key={index}>
            {column}
          </div>
        ))}
      </div>
    </div>
  );
};
