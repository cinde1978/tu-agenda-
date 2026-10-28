import React, { useState } from 'react';
import {
  Calendar,
  Users,
  Wallet,
  Download,
  Smartphone,
  X,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { ViewTab, BranchId } from '../types';
import { useApp } from '../context/AppContext';
import { formatDateSpanishLong } from '../utils/formatters';
import { getTodayDateString } from '../utils/initialData';
import { AppLogo } from './AppLogo';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface HeaderProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onNewAppointment?: () => void;
  onOpenReminders?: () => void;
}

export function Header({
  currentTab,
  onSelectTab,
}: HeaderProps) {
  const { business, selectedBranch, setSelectedBranch, branches } = useApp();
  const { isInstallable, install } = usePWAInstall();
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const todayStr = getTodayDateString();

  const brandName = (business?.name && business.name !== '[Tu Nombre o Marca]') ? business.name : 'Tu Agenda Lista';

  const handleInstallClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (!outcome) {
        setShowInstallHelp(true);
      }
    } else {
      setShowInstallHelp(true);
    }
  };

  return (
    <>
      {/* Top Clean SaaS Header Bar */}
      <header
        className="no-print bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-20 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 select-none shadow-xs"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          justifyContent: 'space-between',
        }}
      >
        {/* Left: Logo a la izquierda con letra 'A' dorada y texto 'Tu Agenda Lista' */}
        <div
          onClick={() => onSelectTab('agenda')}
          className="cursor-pointer group min-w-0 shrink flex items-center"
          title="Ir a Agenda"
        >
          <AppLogo />
        </div>

        {/* Center / Right Controls: Multisucursal Selector, Date & Install */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Selector Desplegable Multisucursal (2 Locales) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="relative flex items-center bg-white border-2 border-slate-300 hover:border-[#1E3A8A] focus-within:border-[#1E3A8A] rounded-xl px-2.5 sm:px-3 py-1 sm:py-1.5 shadow-2xs transition-all">
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#1E3A8A] shrink-0 mr-1.5 stroke-[2.5]" />
              <label htmlFor="branch-selector" className="sr-only">Seleccionar Sucursal</label>
              <select
                id="branch-selector"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value as BranchId)}
                className="bg-white font-black text-xs sm:text-sm text-[#0F172A] focus:outline-none cursor-pointer pr-5 appearance-none"
                title="Cambiar sucursal (Filtra automáticamente la agenda y la caja diaria)"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="text-[#0F172A] font-black bg-white">
                    {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#0F172A] pointer-events-none absolute right-2 stroke-[2.5]" />
            </div>
          </div>

          {/* Fecha Actual (Desktop) */}
          <div
            className="hidden lg:flex items-center gap-2 text-xs font-black text-[#0F172A] bg-white border border-slate-300 px-3 py-1.5 rounded-xl capitalize shrink-0 shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-[#0F172A] shrink-0" />
            <span>{formatDateSpanishLong(todayStr)}</span>
          </div>

          {/* Botón 'Instalar App' */}
          <button
            type="button"
            onClick={handleInstallClick}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black bg-[#0F172A] hover:bg-black active:scale-98 text-white shadow-xs hover:shadow-md transition-all whitespace-nowrap cursor-pointer shrink-0"
            title="Instala nuestra App en tu celular para un acceso más rápido"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 stroke-[2.5]" />
            <span className="hidden xs:inline sm:inline">Instalar App</span>
            <span className="inline xs:hidden sm:hidden">Instalar</span>
          </button>
        </div>
      </header>

      {/* Quick PWA Installation Help Modal */}
      {showInstallHelp && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#0F172A]">
                    Instalar Tu Agenda Lista
                  </h3>
                  <p className="text-xs text-slate-600 font-semibold">
                    Acceso instantáneo desde tu pantalla de inicio
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallHelp(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-black hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-[#0F172A] bg-slate-50 p-4 rounded-xl border border-slate-300">
              <div className="flex items-start gap-2.5">
                <span className="font-black text-blue-600 shrink-0">📱 Android / Chrome:</span>
                <span className="font-semibold">Toca el menú de tres puntos (⋮) en tu navegador y selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a pantalla principal"</strong>.</span>
              </div>
              <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200">
                <span className="font-black text-indigo-600 shrink-0">🍎 iPhone / Safari:</span>
                <span className="font-semibold">Toca el botón <strong>Compartir</strong> (icono con flecha hacia arriba) y selecciona <strong>"Agregar al inicio"</strong>.</span>
              </div>
              <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200">
                <span className="font-black text-[#0F172A] shrink-0">💻 Computadora:</span>
                <span className="font-semibold">Haz clic en el icono de instalación (pantalla o flecha) situado a la derecha de la barra de direcciones.</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowInstallHelp(false)}
                className="px-5 py-2.5 bg-[#0F172A] hover:bg-black text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (48px+ touch targets) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-slate-300 lg:hidden flex items-center justify-around h-16 px-2 shadow-lg no-print select-none">
        <button
          type="button"
          onClick={() => onSelectTab('agenda')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 transition-colors cursor-pointer ${
            currentTab === 'agenda' ? 'text-[#0F172A] font-black scale-105' : 'text-[#0F172A]/70 font-bold hover:text-black'
          }`}
        >
          <Calendar className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[11px] font-black mt-1">Agenda</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('clientes')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 transition-colors cursor-pointer ${
            currentTab === 'clientes' ? 'text-[#0F172A] font-black scale-105' : 'text-[#0F172A]/70 font-bold hover:text-black'
          }`}
        >
          <Users className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[11px] font-black mt-1">Clientes</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('caja')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 transition-colors cursor-pointer ${
            currentTab === 'caja' ? 'text-[#0F172A] font-black scale-105' : 'text-[#0F172A]/70 font-bold hover:text-black'
          }`}
        >
          <Wallet className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[11px] font-black mt-1">Caja</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('configuracion')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 transition-colors cursor-pointer ${
            currentTab === 'configuracion' ? 'text-[#0F172A] font-black scale-105' : 'text-[#0F172A]/70 font-bold hover:text-black'
          }`}
        >
          <div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-[11px] font-black">
            ⚙
          </div>
          <span className="text-[11px] font-black mt-1">Ajustes</span>
        </button>
      </nav>
    </>
  );
}
