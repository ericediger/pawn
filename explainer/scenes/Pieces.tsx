import React from 'react';

/** The app's own mark: the four chess pieces from its title, in the accent colour. */
export const Pieces: React.FC<{ size: number; color: string; glow?: string }> = ({ size, color, glow }) => (
  <span
    style={{
      fontFamily: '"Apple Symbols", "Arial Unicode MS", "Segoe UI Symbol", "DejaVu Sans", sans-serif',
      fontSize: size,
      lineHeight: 1,
      letterSpacing: size * 0.06,
      color,
      textShadow: glow ? `0 0 ${size * 0.5}px ${glow}` : undefined,
      whiteSpace: 'nowrap',
    }}
  >
    ♟♞♜♛
  </span>
);
