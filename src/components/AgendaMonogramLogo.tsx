import React from 'react';

export interface AgendaMonogramLogoProps {
  size?: number;
  className?: string;
  title?: string;
}

/**
 * Monograma SVG Vectorial Oficial de "Tu Agenda Lista"
 * Círculo dorado metálico con la letra 'A' entrelazada con un tilde
 * de verificación (checkmark) en oro brillante y acabados de lujo SaaS.
 */
export function AgendaMonogramLogo({
  size = 40,
  className = '',
  title = 'Tu Agenda Lista Monograma Oficial',
}: AgendaMonogramLogoProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      title={title}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
        aria-label={title}
      >
        <defs>
          {/* Outer Metallic Gold Ring Gradient */}
          <linearGradient id="goldRingGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFF2B2" />
            <stop offset="25%" stopColor="#E2BA55" />
            <stop offset="50%" stopColor="#D4AF37" />
            <stop offset="75%" stopColor="#9E7317" />
            <stop offset="100%" stopColor="#F5D77F" />
          </linearGradient>

          {/* Inner Metallic Bevel Ring */}
          <linearGradient id="goldBevelGrad" x1="100" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6C4D0A" />
            <stop offset="30%" stopColor="#D4AF37" />
            <stop offset="70%" stopColor="#FFF5CC" />
            <stop offset="100%" stopColor="#8A6311" />
          </linearGradient>

          {/* Luxury Obsidian Lacquer Disk */}
          <radialGradient id="darkDiskGrad" cx="50" cy="50" r="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1C2230" />
            <stop offset="65%" stopColor="#0F131C" />
            <stop offset="100%" stopColor="#06080C" />
          </radialGradient>

          {/* Letter 'A' Left Pillar Gradient */}
          <linearGradient id="goldLetterStemLeft" x1="28" y1="20" x2="48" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFF5CF" />
            <stop offset="40%" stopColor="#E0B752" />
            <stop offset="100%" stopColor="#9C7118" />
          </linearGradient>

          {/* Letter 'A' Right Pillar Gradient */}
          <linearGradient id="goldLetterStemRight" x1="52" y1="20" x2="74" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFF9DC" />
            <stop offset="35%" stopColor="#E8C364" />
            <stop offset="70%" stopColor="#C49A2B" />
            <stop offset="100%" stopColor="#7E580C" />
          </linearGradient>

          {/* Entwined Brilliant Checkmark Gradient */}
          <linearGradient id="goldCheckmarkGrad" x1="26" y1="52" x2="78" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFBEA" />
            <stop offset="25%" stopColor="#FFE066" />
            <stop offset="55%" stopColor="#F3CA55" />
            <stop offset="80%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#B3841C" />
          </linearGradient>

          {/* Specular Ambient Glow */}
          <linearGradient id="specularGlow" x1="50" y1="4" x2="50" y2="46" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFF7D1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
          </linearGradient>

          {/* Soft 3D drop shadow for depth */}
          <filter id="monogramDepthShadow" x="18" y="18" width="66" height="66" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="2.5" stdDeviation="2.2" floodColor="#000000" floodOpacity="0.55" />
          </filter>

          {/* Weave shadow for the checkmark crossing over the 'A' */}
          <filter id="checkWeaveShadow" x="40" y="30" width="30" height="30" filterUnits="userSpaceOnUse">
            <feDropShadow dx="1" dy="1.5" stdDeviation="1" floodColor="#1F1500" floodOpacity="0.65" />
          </filter>
        </defs>

        {/* 1. Base Circular Shield in Obsidian Lacquer */}
        <circle cx="50" cy="50" r="47.5" fill="url(#darkDiskGrad)" />

        {/* 2. Outer Metallic Gold Ring */}
        <circle
          cx="50"
          cy="50"
          r="47"
          stroke="url(#goldRingGrad)"
          strokeWidth="3.2"
          fill="none"
        />

        {/* 3. Inner Fine Polished Bevel Rim */}
        <circle
          cx="50"
          cy="50"
          r="43.5"
          stroke="url(#goldBevelGrad)"
          strokeWidth="1.2"
          strokeOpacity="0.85"
          fill="none"
        />

        {/* 4. Top Specular Ambient Sheen */}
        <path
          d="M12 40 C 20 20, 80 20, 88 40 C 82 20, 68 10, 50 10 C 32 10, 18 20, 12 40 Z"
          fill="url(#specularGlow)"
        />

        {/* 5. Monogram Elements (Letter 'A' & Entwined Checkmark) with 3D Depth */}
        <g filter="url(#monogramDepthShadow)">
          {/* --- Letter 'A' Left Stem & Serif Foot --- */}
          {/* Base Left Foot */}
          <path
            d="M24 76.5 H37 C37 76.5, 36.5 74, 34 74 C34 74, 33 74, 33 72.5 L46.5 29 H49.5 L36 72.5 C36 74, 35 74, 35 74 C32.5 74, 32 76.5, 32 76.5 H24 Z"
            fill="url(#goldLetterStemLeft)"
          />

          {/* Main Left Pillar of 'A' */}
          <path
            d="M33 72.5 L46.5 28.5 C47.2 26.5 48.5 25.5 50 25.5 C51.5 25.5 52.8 26.5 53.5 28.5 L42.5 64 H36.5 L33 72.5 Z"
            fill="url(#goldLetterStemLeft)"
          />

          {/* Letter 'A' Horizontal Crossbar */}
          <path
            d="M38 57.5 H61.5 V61 H37 Z"
            fill="url(#goldRingGrad)"
          />

          {/* Inner Triangle Counter Cutout of 'A' */}
          <path
            d="M50 34 L57 53.5 H43 L50 34 Z"
            fill="#0F131C"
            fillOpacity="0.85"
          />

          {/* --- Letter 'A' Right Stem & Serif Foot --- */}
          {/* Main Right Pillar of 'A' */}
          <path
            d="M49.5 27.5 L67 72.5 C67 74 66 74, 66 74 C63.5 74, 63 76.5, 63 76.5 H76 C76 76.5, 75.5 74, 73 74 C73 74, 72 74, 72 72.5 L54.5 27.5 H49.5 Z"
            fill="url(#goldLetterStemRight)"
          />

          {/* Letter 'A' Apex Top Crown (Sophisticated Gold Cap) */}
          <path
            d="M45.5 27.5 C46.8 24.5 53.2 24.5 54.5 27.5 H45.5 Z"
            fill="#FFFBEA"
          />

          {/* --- Entwined Brilliant Gold Checkmark (Tilde de Verificación) --- */}
          {/* Weave shadow behind checkmark where it crosses the right stem */}
          <ellipse cx="57" cy="53" rx="4.5" ry="3" fill="#000000" fillOpacity="0.45" />

          {/* The Checkmark Hook: weaves from inside left of 'A', through center, then arches up and out */}
          <path
            d="M28.5 52 C31 49.5 35 48 37.5 51 L44.5 59.5 C46 61.2 48.8 61.2 50.3 59.3 L72.5 31.5 C74 29.5 77 29.5 78.8 31.5 C80.5 33.2 80.2 36 78 38.5 L52 69 C49.5 72 45 72 42.5 69 L28 52 Z"
            fill="url(#goldCheckmarkGrad)"
            filter="url(#checkWeaveShadow)"
          />

          {/* Inner High-Gleam Specular Spine on Checkmark for 3D Jewel Brilliance */}
          <path
            d="M31 52 L44.5 66.5 C45.5 67.5 47 67.5 48 66.5 L76 34"
            stroke="#FFFFFF"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeOpacity="0.85"
            fill="none"
          />

          {/* Subtle Golden Star Gem / Shimmer accent at checkmark tip */}
          <circle cx="76.5" cy="33.5" r="1.5" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  );
}
