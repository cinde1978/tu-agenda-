import React, { useState } from 'react';
import {
  Calendar,
  Users,
  UserCheck,
  Wallet,
  BarChart3,
  Settings,
  Plus,
  LogIn,
  LogOut,
  Bell,
  Printer,
  FileSpreadsheet,
  Menu,
  X,
  Sparkles
} from 'lucide-react';
import { ViewTab } from '../types';
import { useApp } from '../context/AppContext';

import { AppLogo } from './AppLogo';

interface NavbarProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onNewAppointment: () => void;
  onOpenReminders: () => void;
}

export function Navbar({ currentTab, onSelectTab, onNewAppointment, onOpenReminders }: NavbarProps) {
  const { user, loginWithGoogle, logoutUser, business, unreadRemindersCount } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const brandName = (business?.name && business.name !== '[Tu Nombre o Marca]') ? business.name : 'Tu Agenda Lista';
  const developerName = (business?.developerName && business.developerName !== '[Tu Nombre]') ? business.developerName : 'Iris Quiroz';

  const desktopNavItems: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
    { id: 'agenda', label: 'Agenda', icon: <Calendar className="w-4 h-4" /> },
    { id: 'clientes', label: 'Clientes', icon: <Users className="w-4 h-4" /> },
    { id: 'servicios', label: 'Servicios', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'profesionales', label: 'Profesionales', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'caja', label: 'Caja Diaria', icon: <Wallet className="w-4 h-4" /> },
    { id: 'reportes', label: 'Estadísticas', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'exportar', label: 'Imprimir / Excel', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'configuracion', label: 'Ajustes', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Zone */}
            <div
              className="flex items-center gap-3 cursor-pointer select-none group"
              onClick={() => onSelectTab('agenda')}
            >
              <AppLogo />
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-slate-100 text-[#0F172A] border border-slate-300 uppercase tracking-wider shadow-2xs">
                PRO
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden xl:flex items-center gap-1.5">
              {desktopNavItems.map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTab(item.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                      isActive
                        ? 'bg-[#0F172A] text-white shadow-xs'
                        : 'text-[#0F172A] hover:text-black hover:bg-slate-100'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-[#0F172A]'}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right Action Zone */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Reminder Bell */}
              <button
                type="button"
                onClick={onOpenReminders}
                className="relative p-2.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
                title="Centro de Recordatorios"
              >
                <Bell className="w-5 h-5" />
                {unreadRemindersCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadRemindersCount}
                  </span>
                )}
              </button>

              {/* Quick Print/Export icon on tablet */}
              <button
                type="button"
                onClick={() => onSelectTab('exportar')}
                className="hidden sm:flex xl:hidden p-2.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
                title="Imprimir o exportar agenda"
              >
                <Printer className="w-5 h-5" />
              </button>

              {/* New Turn Button (Desktop) */}
              <button
                type="button"
                onClick={onNewAppointment}
                className="hidden sm:flex px-4 py-2 bg-gradient-to-r from-[#D4AF37] via-[#C5A059] to-[#AA822A] hover:brightness-105 active:scale-98 text-slate-950 rounded-xl text-xs font-extrabold items-center gap-1.5 shadow-xs hover:shadow-md ring-1 ring-[#D4AF37]/50 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Nuevo Turno</span>
              </button>

              {/* User Account / Sync */}
              {user ? (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div
                    className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-blue-100"
                    title={user.email || ''}
                  >
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full" />
                    ) : (
                      user.displayName?.charAt(0) || 'U'
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={logoutUser}
                    className="hidden sm:block p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                    title="Cerrar sesión"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={loginWithGoogle}
                  className="hidden sm:flex px-3 py-1.5 rounded-xl border border-blue-200 hover:bg-blue-50 text-blue-700 font-semibold text-xs items-center gap-1.5 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Conectar Google</span>
                </button>
              )}

              {/* Mobile menu toggle for extra options */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="xl:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Extra Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-slate-200 bg-white p-4 space-y-2 animate-in slide-in-from-top-2 duration-150">
            <div className="grid grid-cols-2 gap-2 mb-3">
              {desktopNavItems.map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 text-left transition-all ${
                      isActive ? 'bg-blue-600 text-white shadow-xs font-bold' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              {user ? (
                <div className="flex items-center justify-between w-full">
                  <div className="text-xs text-slate-600 truncate max-w-[200px]">
                    Conectado: <strong>{user.displayName || user.email}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      logoutUser();
                      setMobileMenuOpen(false);
                    }}
                    className="text-xs text-rose-600 font-semibold"
                  >
                    Cerrar sesión
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    loginWithGoogle();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Conectar cuenta de Google</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Mobile Fixed Bottom Navigation Bar (Thumb ergonomic zone) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-slate-300 sm:hidden flex items-center justify-around h-16 px-2 shadow-lg no-print">
        <button
          type="button"
          onClick={() => onSelectTab('agenda')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 transition-colors ${
            currentTab === 'agenda' ? 'text-[#0F172A] font-black' : 'text-[#0F172A]/70 font-bold hover:text-black'
          }`}
        >
          <Calendar className="w-5 h-5 mb-0.5 stroke-[2.5]" />
          <span className="text-[11px] font-black leading-tight">Agenda</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('clientes')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 transition-colors ${
            currentTab === 'clientes' ? 'text-[#0F172A] font-black' : 'text-[#0F172A]/70 font-bold hover:text-black'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5 stroke-[2.5]" />
          <span className="text-[11px] font-black leading-tight">Clientes</span>
        </button>

        {/* Center Floating Action Button on Bottom Bar */}
        <button
          type="button"
          onClick={onNewAppointment}
          className="w-13 h-13 -mt-6 rounded-full bg-[#0F172A] hover:bg-black text-white flex items-center justify-center shadow-xl shadow-slate-900/40 border-2 border-white active:scale-95 transition-transform cursor-pointer"
          title="Nuevo Turno"
          aria-label="Nuevo Turno"
        >
          <Plus className="w-6 h-6 stroke-[3.5]" />
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('caja')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 transition-colors ${
            currentTab === 'caja' ? 'text-[#0F172A] font-black' : 'text-[#0F172A]/70 font-bold hover:text-black'
          }`}
        >
          <Wallet className="w-5 h-5 mb-0.5 stroke-[2.5]" />
          <span className="text-[11px] font-black leading-tight">Caja</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('exportar')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 transition-colors ${
            currentTab === 'exportar' ? 'text-[#0F172A] font-black' : 'text-[#0F172A]/70 font-bold hover:text-black'
          }`}
        >
          <Printer className="w-5 h-5 mb-0.5 stroke-[2.5]" />
          <span className="text-[11px] font-black leading-tight">Imprimir</span>
        </button>
      </nav>
    </>
  );
}
