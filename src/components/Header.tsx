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
  Settings,
  Sparkles,
  Check,
} from 'lucide-react';
import { ViewTab, BranchId } from '../types';
import { useApp } from '../context/AppContext';
import { formatDateSpanishLong } from '../utils/formatters';
import { getTodayDateString } from '../utils/initialData';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface HeaderProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onNewAppointment?: () => void;
  onOpenReminders?: () => void;
}

const TAB_TITLES: Record<ViewTab, string> = {
  agenda: 'Agenda & Turnos',
  clientes: 'Directorio de Clientes',
  servicios: 'Catálogo de Servicios',
  profesionales: 'Equipo de Profesionales',
  caja: 'Caja Diaria & Finanzas',
  reportes: 'Estadísticas & Reportes',
  exportar: 'Imprimir / Excel',
  configuracion: 'Ajustes del Negocio',
};

export function Header({
  currentTab,
  onSelectTab,
}: HeaderProps) {
  const { selectedBranch, setSelectedBranch, branches } = useApp();
  const { isInstallable, install } = usePWAInstall();
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const todayStr = getTodayDateString();

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
      {/* Top SaaS Header Bar - Tono suave con alto contraste, nada blanco plano */}
      <header
        className="no-print bg-[#e2e8f0]/95 backdrop-blur-md border-b-2 border-slate-300 sticky top-0 z-20 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 select-none shadow-xs"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          justifyContent: 'space-between',
        }}
      >
        {/* Left: Título de Sección */}
        <div className="min-w-0 flex items-center gap-2">
          <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
            {TAB_TITLES[currentTab] || 'Tu Agenda'}
          </h1>
        </div>

        {/* Center / Right Controls: Multisucursal Selector, Date & Install */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Selector Desplegable Multisucursal (Sucursal 1 y Sucursal 2) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="relative flex items-center bg-slate-100 border-2 border-slate-300 hover:border-blue-600 hover:bg-blue-100 rounded-xl px-2.5 sm:px-3 py-1 sm:py-1.5 shadow-2xs transition-all">
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-700 shrink-0 mr-1.5" />
              <label htmlFor="branch-selector" className="sr-only">Seleccionar Sucursal</label>
              <select
                id="branch-selector"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value as BranchId)}
                className="bg-transparent font-black text-xs sm:text-sm text-slate-900 focus:outline-none cursor-pointer pr-4 appearance-none"
                title="Cambiar sucursal activa"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="text-slate-900 font-bold bg-slate-100">
                    {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 pointer-events-none absolute right-2 stroke-[2.5]" />
            </div>
          </div>

          {/* Fecha Actual (Desktop) */}
          <div
            className="hidden lg:flex items-center gap-2 text-xs font-black text-slate-800 bg-slate-100 border-2 border-slate-300 px-3 py-1.5 rounded-xl capitalize shrink-0 shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-blue-700 shrink-0" />
            <span>{formatDateSpanishLong(todayStr)}</span>
          </div>

          {/* Botón 'Instalar App' */}
          <button
            type="button"
            onClick={handleInstallClick}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-xs transition-all whitespace-nowrap cursor-pointer shrink-0"
            title="Instalar aplicación"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 stroke-[2.5]" />
            <span className="hidden xs:inline sm:inline">Instalar App</span>
            <span className="inline xs:hidden sm:hidden">Instalar</span>
          </button>
        </div>
      </header>

      {/* Quick PWA Installation Help Modal */}
      {showInstallHelp && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#f1f5f9] rounded-2xl max-w-md w-full p-6 shadow-2xl border-2 border-slate-300 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 border-2 border-blue-300 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
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
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-800 bg-slate-200/80 p-4 rounded-xl border border-slate-300 font-medium">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </span>
                <span>En Chrome o Safari, abre el menú de opciones (los tres puntos o botón de compartir).</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </span>
                <span>Selecciona <strong>"Agregar a la pantalla principal"</strong> o <strong>"Instalar aplicación"</strong>.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </span>
                <span>¡Listo! Ya tienes acceso directo como una app nativa en tu celular o tablet.</span>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowInstallHelp(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (Non-white, high contrast hover/active) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#e2e8f0]/98 backdrop-blur-md border-t-2 border-slate-300 lg:hidden flex items-center justify-around h-16 px-1 shadow-lg no-print select-none touch-manipulation">
        <button
          type="button"
          onClick={() => onSelectTab('agenda')}
          className={`flex flex-col items-center justify-center min-w-[60px] min-h-[48px] py-1 rounded-xl transition-all cursor-pointer ${
            currentTab === 'agenda'
              ? 'text-white font-black bg-blue-600 shadow-xs scale-105'
              : 'text-slate-800 font-bold hover:text-blue-950 hover:bg-blue-200'
          }`}
        >
          <Calendar className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[11px] font-black mt-0.5">Agenda</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('clientes')}
          className={`flex flex-col items-center justify-center min-w-[60px] min-h-[48px] py-1 rounded-xl transition-all cursor-pointer ${
            currentTab === 'clientes'
              ? 'text-white font-black bg-blue-600 shadow-xs scale-105'
              : 'text-slate-800 font-bold hover:text-blue-950 hover:bg-blue-200'
          }`}
        >
          <Users className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[11px] font-black mt-0.5">Clientes</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('profesionales')}
          className={`flex flex-col items-center justify-center min-w-[60px] min-h-[48px] py-1 rounded-xl transition-all cursor-pointer ${
            currentTab === 'profesionales'
              ? 'text-white font-black bg-blue-600 shadow-xs scale-105'
              : 'text-slate-800 font-bold hover:text-blue-950 hover:bg-blue-200'
          }`}
        >
          <Users className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[11px] font-black mt-0.5">Staff</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('caja')}
          className={`flex flex-col items-center justify-center min-w-[60px] min-h-[48px] py-1 rounded-xl transition-all cursor-pointer ${
            currentTab === 'caja'
              ? 'text-white font-black bg-blue-600 shadow-xs scale-105'
              : 'text-slate-800 font-bold hover:text-blue-950 hover:bg-blue-200'
          }`}
        >
          <Wallet className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[11px] font-black mt-0.5">Caja</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('configuracion')}
          className={`flex flex-col items-center justify-center min-w-[60px] min-h-[48px] py-1 rounded-xl transition-all cursor-pointer ${
            currentTab === 'configuracion'
              ? 'text-white font-black bg-blue-600 shadow-xs scale-105'
              : 'text-slate-800 font-bold hover:text-blue-950 hover:bg-blue-200'
          }`}
        >
          <Settings className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[11px] font-black mt-0.5">Ajustes</span>
        </button>
      </nav>
    </>
  );
}

export default Header;
