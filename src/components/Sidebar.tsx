import React from 'react';
import {
  Calendar,
  Users,
  Sparkles,
  UserCheck,
  Wallet,
  BarChart3,
  Settings,
  Plus,
  Printer,
  LogIn,
  LogOut,
  ChevronRight,
  Clock,
  Download,
} from 'lucide-react';
import { ViewTab } from '../types';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';
import { AppLogo } from './AppLogo';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface SidebarProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onNewAppointment: () => void;
  onOpenReminders: () => void;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  onNewAppointment,
  onOpenReminders,
}: SidebarProps) {
  const {
    business,
    user,
    loginWithGoogle,
    logoutUser,
    upcomingTodayAppointments,
  } = useApp();

  const { isInstallable, isInstalled, install } = usePWAInstall();

  const navItems: { id: ViewTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'agenda', label: 'Agenda', icon: <Calendar className="w-4 h-4" /> },
    { id: 'clientes', label: 'Clientes', icon: <Users className="w-4 h-4" /> },
    { id: 'servicios', label: 'Servicios', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'profesionales', label: 'Profesionales', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'caja', label: 'Caja Diaria', icon: <Wallet className="w-4 h-4" /> },
    { id: 'reportes', label: 'Estadísticas', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'exportar', label: 'Imprimir / Excel', icon: <Printer className="w-4 h-4" /> },
    { id: 'configuracion', label: 'Ajustes del Negocio', icon: <Settings className="w-4 h-4" /> },
  ];

  // Calculate today's projected revenue
  const todayRevenue = upcomingTodayAppointments
    .filter((a) => a.status !== 'cancelado')
    .reduce((sum, a) => sum + (a.price || 0), 0);

  return (
    <aside className="no-print hidden lg:flex flex-col w-72 bg-[#eef2f6] border-r-2 border-slate-300 shadow-xs h-screen sticky top-0 shrink-0 select-none z-30">
      {/* Brand Header: Logo + Tu Agenda Lista + PRO tag */}
      <div className="p-5 border-b-2 border-slate-300 bg-[#e2e8f0]/80">
        <div
          className="cursor-pointer group flex items-center justify-between"
          onClick={() => onSelectTab('agenda')}
          title="Tu Agenda Lista"
        >
          <AppLogo />
          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-600 text-white uppercase tracking-wider shrink-0 shadow-xs">
            PRO
          </span>
        </div>

        {/* Quick CTA "+ Nuevo Turno" in Sidebar */}
        <button
          type="button"
          onClick={onNewAppointment}
          className="mt-4 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Nuevo Turno</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3.5 py-3 space-y-1.5">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between transition-all group cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white font-black shadow-xs ring-1 ring-blue-700'
                  : 'text-slate-800 font-bold hover:bg-blue-200 hover:text-blue-950'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`transition-colors ${isActive ? 'text-white' : 'text-slate-600 group-hover:text-blue-950'}`}>
                  {item.icon}
                </span>
                <span className="tracking-tight">{item.label}</span>
              </div>

              {item.badge ? (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-blue-800 text-white' : 'bg-slate-300 text-slate-800 group-hover:bg-blue-300 group-hover:text-blue-950'
                }`}>
                  {item.badge}
                </span>
              ) : isActive ? (
                <ChevronRight className="w-3.5 h-3.5 text-white stroke-[3]" />
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Today Mini Summary Card */}
      <div className="p-3.5 mx-3.5 mb-2.5 rounded-2xl bg-slate-200/90 border-2 border-slate-300 space-y-2 shadow-2xs">
        <div className="flex items-center justify-between text-xs font-black text-slate-900">
          <span className="flex items-center gap-1.5 text-slate-900 font-black">
            <Clock className="w-3.5 h-3.5 text-blue-700 stroke-[2.5]" />
            Hoy en el Salón
          </span>
          <button
            type="button"
            onClick={onOpenReminders}
            className="text-[10px] font-black text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            Ver {upcomingTodayAppointments.length}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-0.5">
          <div className="bg-slate-100 p-2 rounded-xl border border-slate-300 shadow-2xs">
            <span className="text-[10px] text-slate-600 block font-bold">Turnos</span>
            <span className="font-black text-slate-900 text-sm">
              {upcomingTodayAppointments.length}
            </span>
          </div>
          <div className="bg-slate-100 p-2 rounded-xl border border-slate-300 shadow-2xs">
            <span className="text-[10px] text-slate-600 block font-bold">Estimado</span>
            <span className="font-black text-slate-900 text-xs truncate block">
              {formatCurrency(todayRevenue, business?.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* User / Account & Whitelabel Footer */}
      <div className="p-3.5 border-t-2 border-slate-300 bg-slate-200/70 space-y-2">
        {/* PWA quick install in sidebar */}
        {isInstallable && !isInstalled && (
          <button
            type="button"
            onClick={install}
            className="w-full py-1.5 px-3 bg-blue-100 hover:bg-blue-200 border-2 border-blue-300 text-blue-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-700" />
            <span>Instalar App en el equipo</span>
          </button>
        )}

        {user ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-blue-300 shrink-0">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-7 h-7 rounded-full" />
                ) : (
                  user.displayName?.charAt(0) || 'U'
                )}
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-extrabold text-slate-900 truncate">
                  {user.displayName || 'Usuario'}
                </span>
                <span className="block text-[10px] text-slate-600 truncate font-medium">
                  {user.email}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={logoutUser}
              className="p-1.5 hover:bg-rose-100 rounded-lg text-slate-600 hover:text-rose-700 transition-colors cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="w-full space-y-1">
            <button
              type="button"
              onClick={loginWithGoogle}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-white" />
              <span>Conectar Google</span>
            </button>
          </div>
        )}

        {/* Whitelabel Developer Credit */}
        <div className="pt-2 border-t border-slate-300 text-center select-none">
          <p className="text-[11px] text-slate-600 font-semibold">
            Desarrollado por <span className="font-extrabold text-slate-900 tracking-tight">Iris Quiroz</span>
          </p>
        </div>
      </div>
    </aside>
  );
}
