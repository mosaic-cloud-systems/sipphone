import React from 'react';

/**
 * The Mosaic Voice lockup: the cube, "Mosaic", and "voice" in the brand italic.
 * Stacked puts "voice" under and offset to the right; inline sets both words
 * on one baseline.
 */
const Brand: React.FC<{ variant: 'stacked' | 'inline' }> = ({ variant }) => (
  <div className={`brand brand--${variant}`}>
    <img className="brand__logo" src="/mosaic-logo.png" alt="Mosaic logo" />
    <div className="brand__words">
      <span className="brand__name">Mosaic</span>
      <span className="brand__voice">voice</span>
    </div>
  </div>
);

export default Brand;
