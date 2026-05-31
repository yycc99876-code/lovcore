import React from 'react';

export const VirtualCursor: React.FC = () => {
  return (
    <div 
      className="virtual-cursor-element virtual-cursor-main"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 32,
        height: 32,
        zIndex: 9999,
        pointerEvents: 'none', // Critical so it doesn't block clicks
        opacity: 0, // Starts hidden
        transformOrigin: 'top left',
      }}
    >
      <svg 
        width="32" 
        height="32" 
        viewBox="0 0 32 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.4)) drop-shadow(0px 1px 2px rgba(0,0,0,0.2))'
        }}
      >
        <path 
          d="M8.5 2.5L23.5 15.5L16 16.5L19.5 24L16.5 25.5L13 18L8.5 22.5V2.5Z" 
          fill="black" 
          stroke="white" 
          strokeWidth="1.5" 
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
