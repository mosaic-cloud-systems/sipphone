import React from 'react';
import { BRAND } from '../brand';

/**
 * The brand lockup: the logo, the wordmark, and the accent word in the brand
 * italic. Stacked puts the accent word under and offset to the right; inline
 * sets both words on one baseline.
 */
const Brand: React.FC<{ variant: 'stacked' | 'inline' }> = ({ variant }) => (
  <div className={`brand brand--${variant}`}>
    <img className="brand__logo" src={BRAND.logo} alt={BRAND.logoAlt} />
    <div className="brand__words">
      <span className="brand__name">{BRAND.wordmark}</span>
      <span className="brand__voice">{BRAND.wordmarkAccent}</span>
    </div>
  </div>
);

export default Brand;
