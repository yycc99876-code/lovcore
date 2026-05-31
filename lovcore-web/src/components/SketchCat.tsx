'use client';

import React, { useState, useEffect, useRef } from 'react';
import './SketchCat.css';

interface SketchCatProps {
  isHoveringInput?: boolean;
  isDragging?: boolean;
  dragCoords?: { x: number; y: number } | null;
  pounceTrigger?: boolean;
}

export const SketchCat: React.FC<SketchCatProps> = ({
  isHoveringInput = false,
  isDragging = false,
  dragCoords = null,
  pounceTrigger = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSleeping, setIsSleeping] = useState(false);
  const [isExcited, setIsExcited] = useState(false);

  const lastCoordsRef = useRef({ x: 0, y: 0, time: 0 });
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const excitementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Main interaction hook
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!containerRef.current) return;

      // Reset sleep state
      setIsSleeping(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setIsSleeping(true);
      }, 4000); // Sleep after 4s of idle

      // Calculate velocity for excitement
      const now = Date.now();
      const dt = lastCoordsRef.current.time === 0 ? 0 : now - lastCoordsRef.current.time;
      const dx = clientX - lastCoordsRef.current.x;
      const dy = clientY - lastCoordsRef.current.y;
      const dist = Math.hypot(dx, dy);
      const speed = dt > 0 ? dist / dt : 0;

      lastCoordsRef.current = { x: clientX, y: clientY, time: now };

      if (speed > 1.8) {
        setIsExcited(true);
        if (excitementTimerRef.current) clearTimeout(excitementTimerRef.current);
        excitementTimerRef.current = setTimeout(() => {
          setIsExcited(false);
        }, 400); // Excitement lasts 400ms after fast movement stops
      }

      // Calculate translation and rotation relative to the cat's center
      const rect = containerRef.current.getBoundingClientRect();
      const catCenterX = rect.left + rect.width / 2;
      const catCenterY = rect.top + rect.height / 2;

      const deltaX = clientX - catCenterX;
      const deltaY = clientY - catCenterY;
      const distance = Math.hypot(deltaX, deltaY);
      const angle = Math.atan2(deltaY, deltaX);

      // Pupil offset - max 5px
      const maxPupilOffset = 6;
      const pupilX = Math.cos(angle) * Math.min(maxPupilOffset, distance / 35);
      const pupilY = Math.sin(angle) * Math.min(maxPupilOffset, distance / 35);

      // Head offset - max 10px translate, tilt up to 15deg
      const maxHeadTranslate = 10;
      const headX = Math.cos(angle) * Math.min(maxHeadTranslate, distance / 40);
      const headY = Math.sin(angle) * Math.min(maxHeadTranslate, distance / 40);

      // Tilts slightly to the side of the cursor
      const screenRatio = deltaX / (window.innerWidth / 2);
      const headTilt = Math.max(-12, Math.min(12, screenRatio * 18));

      // Apply style variables to container
      const el = containerRef.current;
      el.style.setProperty('--pupil-x', `${pupilX}px`);
      el.style.setProperty('--pupil-y', `${pupilY}px`);
      el.style.setProperty('--head-x', `${headX}px`);
      el.style.setProperty('--head-y', `${headY}px`);
      el.style.setProperty('--head-tilt', `${headTilt}deg`);

      // Parallax for ears (move slightly counter to head tilt to look 3D)
      el.style.setProperty('--ear-l-x', `${-headX * 0.2}px`);
      el.style.setProperty('--ear-r-x', `${-headX * 0.2}px`);
    };

    // Listen to standard cursor moves
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging && dragCoords) {
        // If dragging, let drag handler override
        return;
      }
      handleMove(e.clientX, e.clientY);
    };

    window.addEventListener('mousemove', onMouseMove);

    // Initial idle timer setup
    idleTimerRef.current = setTimeout(() => {
      setIsSleeping(true);
    }, 4000);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (excitementTimerRef.current) clearTimeout(excitementTimerRef.current);
    };
  }, [isDragging, dragCoords]);

  // Handle Drag Overrides
  useEffect(() => {
    if (isDragging && dragCoords) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const catCenterX = rect.left + rect.width / 2;
      const catCenterY = rect.top + rect.height / 2;

      const deltaX = dragCoords.x - catCenterX;
      const deltaY = dragCoords.y - catCenterY;
      const angle = Math.atan2(deltaY, deltaX);

      // Lock eyes strongly on the dragged element (max offset, dilated pupils)
      const pupilX = Math.cos(angle) * 7;
      const pupilY = Math.sin(angle) * 7;

      const headX = Math.cos(angle) * 12;
      const headY = Math.sin(angle) * 12;
      const headTilt = Math.max(-15, Math.min(15, (deltaX / (window.innerWidth / 2)) * 22));

      const el = containerRef.current;
      if (el) {
        el.style.setProperty('--pupil-x', `${pupilX}px`);
        el.style.setProperty('--pupil-y', `${pupilY}px`);
        el.style.setProperty('--head-x', `${headX}px`);
        el.style.setProperty('--head-y', `${headY}px`);
        el.style.setProperty('--head-tilt', `${headTilt}deg`);
        el.style.setProperty('--ear-l-x', `${-headX * 0.25}px`);
        el.style.setProperty('--ear-r-x', `${-headX * 0.25}px`);
      }

      setIsSleeping(false);
      setIsExcited(true); // Eyes wide when dragging!
    }
  }, [isDragging, dragCoords]);

  return (
    <div 
      ref={containerRef} 
      className={`sketch-cat-container ${isSleeping ? 'sleeping' : ''} ${isExcited ? 'excited' : ''} ${isHoveringInput ? 'pointing' : ''} ${pounceTrigger ? 'pouncing' : ''}`}
    >
      <svg 
        viewBox="0 0 240 240" 
        className="sketch-cat-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Sketch Background Shadows (Simulates subtle hand-drawn pencil guides) */}
        <g className="pencil-guides" opacity="0.15">
          <ellipse cx="120" cy="155" rx="55" ry="42" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3, 3" />
          <circle cx="120" cy="98" r="38" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2, 2" />
        </g>

        {/* Breathing Base Layer (Body & Tail remain attached to ground, breathing modifies scale/rotation slightly) */}
        <g className="cat-body-group">
          {/* Main Body Silhouette */}
          <path 
            className="sketch-path body-path"
            d="M 75,185 C 68,172 72,135 85,128 C 95,123 105,130 115,130 C 125,130 135,123 145,128 C 158,135 162,172 155,185 C 151,192 140,198 120,198 C 100,198 89,192 75,185 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Fur Texture / Hatching Marks on Body */}
          <path d="M 85,150 L 90,147 M 83,160 L 89,156 M 147,150 L 142,147 M 149,160 L 143,156" className="sketch-hatch" stroke="currentColor" strokeWidth="1.5" />
          
          {/* Sitting Paws Outline */}
          <path 
            className="sketch-path paw-left"
            d="M 92,185 C 92,196 102,198 108,198 C 114,198 114,188 114,185"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path 
            className="sketch-path paw-right"
            d="M 148,185 C 148,196 138,198 132,198 C 126,198 126,188 126,185"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Tail */}
          <g className="cat-tail-group">
            <path 
              className="sketch-path tail-path"
              d="M 152,178 C 168,178 185,170 195,152 C 205,134 198,110 205,92 C 208,85 215,82 216,75 C 217,70 212,70 209,74 C 201,84 197,105 190,118 C 182,132 174,142 165,148 C 158,153 151,154 148,155"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Fur detail on tail tip */}
            <path d="M 213,76 L 217,79 M 210,72 L 214,74" className="sketch-hatch" stroke="currentColor" strokeWidth="1" />
          </g>
        </g>

        {/* Head Group: Translates & Rotates on Cursor follow */}
        <g className="cat-head-group">
          {/* Ears (drawn relative to head center 120, 100) */}
          {/* Left Ear */}
          <path 
            className="sketch-path ear-left"
            d="M 85,82 C 80,75 75,55 78,45 C 80,42 85,45 92,54 C 98,62 103,72 105,76"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Left Ear Inner Detail (pink/hatched style) */}
          <path d="M 86,72 C 84,68 82,56 83,52 C 85,52 89,58 92,64" className="sketch-path inner-ear" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />

          {/* Right Ear */}
          <path 
            className="sketch-path ear-right"
            d="M 155,82 C 160,75 165,55 162,45 C 160,42 155,45 148,54 C 142,62 137,72 135,76"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Right Ear Inner Detail */}
          <path d="M 154,72 C 156,68 158,56 157,52 C 155,52 151,58 148,64" className="sketch-path inner-ear" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />

          {/* Head Contour Outline */}
          <path 
            className="sketch-path head-contour"
            d="M 84,86 C 74,90 75,108 82,118 C 90,130 110,133 120,133 C 130,133 150,130 158,118 C 165,108 166,90 156,86 C 146,82 94,82 84,86 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Left Eye */}
          <g className="cat-eye-left">
            {/* Socket when awake */}
            <path 
              className="sketch-path eye-socket awake-only"
              d="M 92,98 C 91,92 101,90 106,95 C 109,98 107,104 102,104 C 97,104 93,101 92,98 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            />
            {/* Pupil (tracks cursor) */}
            <circle 
              className="cat-pupil awake-only"
              cx="100" 
              cy="98" 
              r="3.5"
              fill="currentColor"
            />
            {/* Eye highlights (small white hand-drawn dots) */}
            <circle className="cat-eye-highlight awake-only" cx="98.5" cy="96.5" r="1" fill="#fff" />
            
            {/* Sleepy Arc (only visible when sleeping) */}
            <path 
              className="sketch-path eye-closed sleep-only"
              d="M 92,98 Q 100,105 106,98"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>

          {/* Right Eye */}
          <g className="cat-eye-right">
            {/* Socket when awake */}
            <path 
              className="sketch-path eye-socket awake-only"
              d="M 134,95 C 139,90 149,92 148,98 C 147,101 143,104 138,104 C 133,104 131,98 134,95 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            />
            {/* Pupil (tracks cursor) */}
            <circle 
              className="cat-pupil awake-only"
              cx="140" 
              cy="98" 
              r="3.5"
              fill="currentColor"
            />
            {/* Eye highlights */}
            <circle className="cat-eye-highlight awake-only" cx="138.5" cy="96.5" r="1" fill="#fff" />
            
            {/* Sleepy Arc */}
            <path 
              className="sketch-path eye-closed sleep-only"
              d="M 134,98 Q 140,105 148,98"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>

          {/* Nose */}
          <path 
            className="sketch-path nose-path"
            d="M 118,108 L 122,108 L 120,111 Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Mouth (Cute "w" curve) */}
          <path 
            className="sketch-path mouth-path"
            d="M 115,114 C 117,117 120,117 120,114 C 120,117 123,117 125,114"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Whiskers (Left and Right) */}
          <g className="cat-whiskers" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.8">
            {/* Left Whiskers */}
            <line x1="78" y1="108" x2="52" y2="105" />
            <line x1="76" y1="113" x2="48" y2="114" />
            <line x1="77" y1="118" x2="54" y2="123" />
            {/* Right Whiskers */}
            <line x1="162" y1="108" x2="188" y2="105" />
            <line x1="164" y1="113" x2="192" y2="114" />
            <line x1="163" y1="118" x2="186" y2="123" />
          </g>
        </g>

        {/* Hand-drawn guides for sleepy indicator (e.g. Zzz) */}
        {isSleeping && (
          <g className="zzz-indicators">
            <path className="zzz-1" d="M 180,50 L 190,50 L 180,60 L 190,60" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path className="zzz-2" d="M 195,30 L 202,30 L 195,37 L 202,37" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        )}
      </svg>

      {/* Retractable Paw Overlay (Comes from bottom left of the cat's local space to point at the input) */}
      <div className="sketch-paw-pointer">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <path 
            d="M 100,90 C 80,75 55,68 35,68 C 22,68 12,74 6,70 C 2,68 2,58 8,56 C 18,52 35,60 52,60 C 65,60 85,75 100,82" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="3.5" 
            strokeLinecap="round"
          />
          {/* Small details / claw lines */}
          <path d="M 8,56 C 5,55 3,57 4,60" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M 6,70 C 3,69 1,67 2,64" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>

      {/* Pouncing Paw Overlay (Only triggers during drag-and-drop swipe) */}
      <div className="sketch-paw-pounce">
        <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
          {/* Dramatic claws extended paw */}
          <path 
            d="M 110,110 C 95,90 70,60 52,44 C 44,38 32,32 25,32 C 16,32 12,42 18,48 C 24,54 38,62 48,74 C 54,80 80,105 95,115"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Claws */}
          <path d="M 18,48 L 8,43" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 25,32 L 18,22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 38,32 L 36,18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          {/* Speed swoosh lines for motion blur */}
          <path className="swoosh-1" d="M 80,45 Q 65,30 45,25" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3, 3" />
          <path className="swoosh-2" d="M 100,65 Q 85,50 65,45" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3, 3" />
        </svg>
      </div>
    </div>
  );
};
