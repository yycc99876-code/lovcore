import React from 'react';

interface LogoIconProps {
  size?: number;
  className?: string;
  pathRef?: React.Ref<SVGPathElement>;
  style?: React.CSSProperties;
}

export const LogoIcon: React.FC<LogoIconProps> = ({ size = 48, className = '', pathRef, style }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-14 -14 148 148"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`logo-icon-svg ${className}`}
      aria-hidden="true"
      style={{ overflow: 'visible', ...style }}
    >
      <path
        ref={pathRef}
        d="M49.5 106.5C35.2 107.8 22.9 101.4 18.2 90.5C13.2 78.8 17.8 64.9 30.5 53.6C40.4 44.8 54.4 38.4 68.2 32.8C82 27.2 91.5 19 89.9 8.8C88.1 -2.6 73.2 -4.5 61.9 3.4C48.9 12.5 39.4 30.1 37.3 51.2C34.6 77.5 43.2 103.5 61.2 113.1C76.6 121.3 95.8 115.2 104.5 99.2C113 83.7 109.1 64.3 96 53.2C88.8 47.1 80.6 44.1 72.5 44.5"
        stroke="currentColor"
        strokeWidth="7.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="61.5"
        cy="67.5"
        r="8.5"
        fill="#FF4F3F"
      />
    </svg>
  );
};
