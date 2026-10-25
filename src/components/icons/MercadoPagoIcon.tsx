import React from 'react';

export interface MercadoPagoIconProps {
  size?: number | string;
  className?: string;
  variant?: 'badge' | 'symbol' | 'monochrome' | 'full';
  title?: string;
}

/**
 * Official Mercado Pago Vector SVG Icon.
 * Features the authentic Mercado Pago handshake (apretón de manos) emblem in official cyan (#009EE3).
 */
export function MercadoPagoIcon({
  size = 20,
  className = '',
  variant = 'badge',
  title = 'Mercado Pago',
}: MercadoPagoIconProps) {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;

  // Handshake vector path (Authentic Mercado Pago / Mercado Libre clasping hands)
  const HandshakePath = ({ fill = 'currentColor' }: { fill?: string }) => (
    <g fill={fill}>
      {/* Left arm & thumb */}
      <path d="M7.4 14.8c-.4-.4-.5-1-.2-1.5l1.6-2.5c.3-.5.9-.8 1.5-.7l2.8.5c-.3-.7-.4-1.5-.1-2.2.3-.9 1.1-1.5 2-1.5.3 0 .7.1 1 .3l-1.3 1.9c-.2.3-.1.8.2 1 .3.2.8.1 1-.2l1.6-2.3c.4-.6 1.1-.9 1.8-.8.8.1 1.4.7 1.6 1.5.2.8 0 1.6-.6 2.2l-.7.7 2.3.4c.6.1 1.1.5 1.3 1.1.2.6.1 1.2-.3 1.7l-2.4 3.1c-.5.6-1.3.9-2 .8l-4.1-.7c-.6.8-1.7 1.3-2.7 1.1-.9-.2-1.7-.8-2-1.7l-2.4-2.6c-.3-.4-.5-.9-.4-1.4z" />
      {/* Handshake interlock details */}
      <path d="M12.7 16.3c.6.1 1.2-.2 1.6-.7l2.2-2.8c.2-.3.2-.6.1-.9-.1-.3-.4-.5-.7-.6l-4.3-.8c-.3-.1-.6.1-.8.3l-1.8 2.2c-.3.4-.2.9.2 1.2l3.5 2.1z" opacity="0.9" />
    </g>
  );

  // 1. Badge Variant: Squircle/Circle in #009EE3 with White Handshake Emblem
  if (variant === 'badge') {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-xl bg-[#009EE3] text-white shadow-xs shrink-0 select-none overflow-hidden ${className}`}
        style={{ width: pixelSize, height: pixelSize, minWidth: pixelSize }}
        title={title}
      >
        <svg
          viewBox="0 0 32 32"
          width="74%"
          height="74%"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label={title}
        >
          {/* Handshake icon */}
          <path
            d="M6 16.5C6 16.5 8.5 12 11.5 12C13 12 14.5 13 15.5 14L16.5 14C17.5 13 19 12 20.5 12C23.5 12 26 16.5 26 16.5"
            stroke="#FFFFFF"
            strokeWidth="0"
            fill="none"
          />
          {/* Hands interlocking glyph */}
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M8.2 13.6C7.5 14.3 7.5 15.4 8.2 16.1L12.1 20C12.8 20.7 13.9 20.7 14.6 20L15.6 19C15.8 18.8 16.2 18.8 16.4 19L17.4 20C18.1 20.7 19.2 20.7 19.9 20L23.8 16.1C24.5 15.4 24.5 14.3 23.8 13.6C23.1 12.9 22 12.9 21.3 13.6L18.4 16.5C18.2 16.7 17.8 16.7 17.6 16.5L16.6 15.5C15.9 14.8 14.8 14.8 14.1 15.5L13.1 16.5C12.9 16.7 12.5 16.7 12.3 16.5L10.7 14.9L12.5 13.1C13.2 12.4 13.2 11.3 12.5 10.6C11.8 9.9 10.7 9.9 10 10.6L8.2 12.4C8 12.6 8 13.1 8.2 13.6Z"
            fill="#FFFFFF"
          />
          <path
            d="M17.5 10.6C16.8 9.9 15.7 9.9 15 10.6L14.2 11.4C13.9 11.7 13.9 12.2 14.2 12.5C14.5 12.8 15 12.8 15.3 12.5L16.1 11.7C16.4 11.4 16.9 11.4 17.2 11.7L19.1 13.6C19.4 13.9 19.9 13.9 20.2 13.6C20.5 13.3 20.5 12.8 20.2 12.5L18.3 10.6H17.5Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>
    );
  }

  // 2. Monochrome Variant (adapts to currentColor)
  if (variant === 'monochrome') {
    return (
      <svg
        viewBox="0 0 32 32"
        width={pixelSize}
        height={pixelSize}
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 select-none ${className}`}
        aria-label={title}
      >
        <title>{title}</title>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M8.2 13.6C7.5 14.3 7.5 15.4 8.2 16.1L12.1 20C12.8 20.7 13.9 20.7 14.6 20L15.6 19C15.8 18.8 16.2 18.8 16.4 19L17.4 20C18.1 20.7 19.2 20.7 19.9 20L23.8 16.1C24.5 15.4 24.5 14.3 23.8 13.6C23.1 12.9 22 12.9 21.3 13.6L18.4 16.5C18.2 16.7 17.8 16.7 17.6 16.5L16.6 15.5C15.9 14.8 14.8 14.8 14.1 15.5L13.1 16.5C12.9 16.7 12.5 16.7 12.3 16.5L10.7 14.9L12.5 13.1C13.2 12.4 13.2 11.3 12.5 10.6C11.8 9.9 10.7 9.9 10 10.6L8.2 12.4C8 12.6 8 13.1 8.2 13.6Z"
        />
        <path d="M17.5 10.6C16.8 9.9 15.7 9.9 15 10.6L14.2 11.4C13.9 11.7 13.9 12.2 14.2 12.5C14.5 12.8 15 12.8 15.3 12.5L16.1 11.7C16.4 11.4 16.9 11.4 17.2 11.7L19.1 13.6C19.4 13.9 19.9 13.9 20.2 13.6C20.5 13.3 20.5 12.8 20.2 12.5L18.3 10.6H17.5Z" />
      </svg>
    );
  }

  // 3. Full Logo with Typography
  if (variant === 'full') {
    return (
      <div className={`inline-flex items-center gap-2 select-none ${className}`} title={title}>
        <div
          className="inline-flex items-center justify-center rounded-xl bg-[#009EE3] text-white shadow-2xs shrink-0"
          style={{ width: pixelSize, height: pixelSize }}
        >
          <svg viewBox="0 0 32 32" width="74%" height="74%" fill="#FFFFFF">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M8.2 13.6C7.5 14.3 7.5 15.4 8.2 16.1L12.1 20C12.8 20.7 13.9 20.7 14.6 20L15.6 19C15.8 18.8 16.2 18.8 16.4 19L17.4 20C18.1 20.7 19.2 20.7 19.9 20L23.8 16.1C24.5 15.4 24.5 14.3 23.8 13.6C23.1 12.9 22 12.9 21.3 13.6L18.4 16.5C18.2 16.7 17.8 16.7 17.6 16.5L16.6 15.5C15.9 14.8 14.8 14.8 14.1 15.5L13.1 16.5C12.9 16.7 12.5 16.7 12.3 16.5L10.7 14.9L12.5 13.1C13.2 12.4 13.2 11.3 12.5 10.6C11.8 9.9 10.7 9.9 10 10.6L8.2 12.4C8 12.6 8 13.1 8.2 13.6Z"
            />
          </svg>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[11px] font-bold text-slate-500 tracking-tight">mercado</span>
          <span className="text-sm font-extrabold text-[#009EE3] tracking-tight -mt-0.5">pago</span>
        </div>
      </div>
    );
  }

  // 4. Default Symbol (#009EE3 color)
  return (
    <svg
      viewBox="0 0 32 32"
      width={pixelSize}
      height={pixelSize}
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label={title}
    >
      <title>{title}</title>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.2 13.6C7.5 14.3 7.5 15.4 8.2 16.1L12.1 20C12.8 20.7 13.9 20.7 14.6 20L15.6 19C15.8 18.8 16.2 18.8 16.4 19L17.4 20C18.1 20.7 19.2 20.7 19.9 20L23.8 16.1C24.5 15.4 24.5 14.3 23.8 13.6C23.1 12.9 22 12.9 21.3 13.6L18.4 16.5C18.2 16.7 17.8 16.7 17.6 16.5L16.6 15.5C15.9 14.8 14.8 14.8 14.1 15.5L13.1 16.5C12.9 16.7 12.5 16.7 12.3 16.5L10.7 14.9L12.5 13.1C13.2 12.4 13.2 11.3 12.5 10.6C11.8 9.9 10.7 9.9 10 10.6L8.2 12.4C8 12.6 8 13.1 8.2 13.6Z"
        fill="#009EE3"
      />
      <path
        d="M17.5 10.6C16.8 9.9 15.7 9.9 15 10.6L14.2 11.4C13.9 11.7 13.9 12.2 14.2 12.5C14.5 12.8 15 12.8 15.3 12.5L16.1 11.7C16.4 11.4 16.9 11.4 17.2 11.7L19.1 13.6C19.4 13.9 19.9 13.9 20.2 13.6C20.5 13.3 20.5 12.8 20.2 12.5L18.3 10.6H17.5Z"
        fill="#009EE3"
      />
    </svg>
  );
}
