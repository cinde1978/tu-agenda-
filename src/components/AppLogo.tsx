import React from 'react';

interface AppLogoProps {
  className?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Monograma: Círculo y letra 'A' en Dorado Oro Brillante (#D4AF37) */}
      <div
        className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-[#D4AF37] bg-white shadow-sm ring-1 ring-[#D4AF37]/40 shrink-0 transition-transform group-hover:scale-105"
        style={{ borderColor: '#D4AF37' }}
      >
        <span
          className="text-2xl font-serif font-black leading-none drop-shadow-[0_1px_1px_rgba(212,175,55,0.4)]"
          style={{ color: '#D4AF37' }}
        >
          A
        </span>
      </div>
      {/* Nombre de la App en alto contraste (negro puro) */}
      <span className="text-xl font-bold tracking-tight text-black font-serif">
        Tu Agenda Lista
      </span>
    </div>
  );
};

export default AppLogo;
