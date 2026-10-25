import React from 'react';

export interface CalendarCheckLogoProps {
  className?: string;
  size?: number;
  title?: string;
}

/**
 * Modern SaaS SVG Logo combining a Calendar and a Checkmark (tilde de verificación)
 * in rich blue and violet tones with smooth rounded corners and subtle gloss.
 */
export function CalendarCheckLogo({
  className = '',
  size = 40,
  title = 'Tu Agenda Lista Logo',
}: CalendarCheckLogoProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      title={title}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xs"
        aria-label={title}
      >
        <defs>
          {/* Main squircle background gradient: Dark Onyx to Charcoal */}
          <linearGradient id="calCheckBgGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E232E" />
            <stop offset="50%" stopColor="#111620" />
            <stop offset="100%" stopColor="#0B0E14" />
          </linearGradient>

          {/* Top gloss sheen reflection */}
          <linearGradient id="calCheckGloss" x1="32" y1="2" x2="32" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.0" />
          </linearGradient>

          {/* Calendar top header bar gradient: Rich Gold */}
          <linearGradient id="calHeaderBarGrad" x1="12" y1="16" x2="52" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E5C378" />
            <stop offset="50%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#AA822A" />
          </linearGradient>

          {/* Circular checkmark badge gradient: Gold Foil */}
          <linearGradient id="calCheckBadgeGrad" x1="28" y1="28" x2="54" y2="54" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E5C378" />
            <stop offset="45%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#99701E" />
          </linearGradient>

          {/* Soft drop shadow for elevated calendar card */}
          <filter id="calCardShadow" x="6" y="10" width="52" height="50" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#0F172A" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Squircle base with rounded corners (Blue & Violet SaaS palette) */}
        <rect
          x="2"
          y="2"
          width="60"
          height="60"
          rx="17"
          fill="url(#calCheckBgGrad)"
        />

        {/* Inner subtle border ring for SaaS crispness */}
        <rect
          x="2.75"
          y="2.75"
          width="58.5"
          height="58.5"
          rx="16.25"
          stroke="#FFFFFF"
          strokeOpacity="0.22"
          strokeWidth="1.5"
        />

        {/* Top glossy sheen */}
        <path
          d="M2 19C2 9.61 9.61 2 19 2H45C54.39 2 62 9.61 62 19V24C44 32 20 32 2 24V19Z"
          fill="url(#calCheckGloss)"
        />

        {/* Calendar Card Element with soft shadow */}
        <g filter="url(#calCardShadow)">
          {/* Calendar Body Sheet: Pure white with rounded corners */}
          <rect
            x="12"
            y="16"
            width="40"
            height="37"
            rx="8"
            fill="#FFFFFF"
          />

          {/* Calendar Header Band in Blue-Violet */}
          <path
            d="M12 24C12 19.58 15.58 16 20 16H44C48.42 16 52 19.58 52 24V26H12V24Z"
            fill="url(#calHeaderBarGrad)"
          />

          {/* Top Spiral Binder Rings (with rounded ends and subtle depth) */}
          <rect x="20" y="11" width="4.5" height="9.5" rx="2.25" fill="#FFFFFF" />
          <rect x="20" y="11" width="4.5" height="9.5" rx="2.25" stroke="#4F46E5" strokeOpacity="0.25" strokeWidth="0.75" />

          <rect x="39.5" y="11" width="4.5" height="9.5" rx="2.25" fill="#FFFFFF" />
          <rect x="39.5" y="11" width="4.5" height="9.5" rx="2.25" stroke="#7C3AED" strokeOpacity="0.25" strokeWidth="0.75" />

          {/* Calendar Schedule Grid Slots (neat rounded indicators) */}
          <rect x="18" y="30.5" width="6.5" height="4.5" rx="1.5" fill="#DBEAFE" />
          <rect x="28.5" y="30.5" width="6.5" height="4.5" rx="1.5" fill="#E0E7FF" />
          <rect x="39" y="30.5" width="6.5" height="4.5" rx="1.5" fill="#EDE9FE" />

          <rect x="18" y="38" width="6.5" height="4.5" rx="1.5" fill="#E0E7FF" />
          <rect x="28.5" y="38" width="6.5" height="4.5" rx="1.5" fill="#EDE9FE" />

          {/* Distinctive Checkmark Badge (Tilde de verificación): Represents "Agenda Lista" */}
          {/* Outer circle with white border */}
          <circle
            cx="42.5"
            cy="41.5"
            r="11.5"
            fill="url(#calCheckBadgeGrad)"
            stroke="#FFFFFF"
            strokeWidth="2.25"
          />

          {/* Bold White Checkmark with rounded caps */}
          <path
            d="M36.5 41.5L40.5 45.5L49 37"
            stroke="#FFFFFF"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Small gold sparkle star in top right */}
        <path
          d="M49 9.5L49.6 11.2L51.3 11.8L49.9 13L50.3 14.7L48.8 13.8L47.3 14.7L47.7 13L46.3 11.8L48 11.2L49 9.5Z"
          fill="#FDE047"
          opacity="0.95"
        />
      </svg>
    </div>
  );
}
