import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Users } from 'lucide-react';
import { AgendaMode } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatDateSpanishLong, formatDateSpanish } from '../../utils/formatters';
import { getTodayDateString } from '../../utils/initialData';

export interface AgendaHeaderProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  agendaMode: AgendaMode;
  onModeChange: (mode: AgendaMode) => void;
  selectedStaffId: string;
  onStaffChange: (staffId: string) => void;
  onNewAppointment?: () => void;
  onNavigate?: (direction: 'prev' | 'next' | 'today') => void;
}

export const AgendaHeader: React.FC<AgendaHeaderProps> = ({
  currentDate,
  onDateChange,
  agendaMode,
  onModeChange,
  selectedStaffId,
  onStaffChange,
  onNewAppointment,
  onNavigate,
}) => {
  const { staff } = useApp();

  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    if (onNavigate) {
      onNavigate(direction);
      return;
    }

    if (direction === 'today') {
      onDateChange(getTodayDateString());
      return;
    }

    const [y, m, d] = currentDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);

    if (agendaMode === 'dia' || agendaMode === 'staff') {
      dateObj.setDate(dateObj.getDate() + (direction === 'next' ? 1 : -1));
    } else if (agendaMode === 'semana') {
      dateObj.setDate(dateObj.getDate() + (direction === 'next' ? 7 : -7));
    } else if (agendaMode === 'mes') {
      dateObj.setMonth(dateObj.getMonth() + (direction === 'next' ? 1 : -1));
    }

    const nextY = dateObj.getFullYear();
    const nextM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const nextD = String(dateObj.getDate()).padStart(2, '0');
    onDateChange(`${nextY}-${nextM}-${nextD}`);
  };

  const isToday = currentDate === getTodayDateString();

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#f1f5f9] p-4 rounded-2xl border-2 border-slate-300 shadow-xs">
      {/* Date Navigation & Controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center bg-slate-200 rounded-xl p-1 border border-slate-300">
          <button
            type="button"
            onClick={() => handleNavigate('prev')}
            className="p-1.5 hover:bg-blue-600 hover:text-white rounded-lg text-slate-800 transition-colors cursor-pointer"
            title="Anterior"
          >
            <ChevronLeft className="w-4 h-4 stroke-[3]" />
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('today')}
            className={`px-3 py-1 text-xs font-black rounded-lg transition-colors cursor-pointer ${
              isToday
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-800 hover:bg-blue-600 hover:text-white'
            }`}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('next')}
            className="p-1.5 hover:bg-blue-600 hover:text-white rounded-lg text-slate-800 transition-colors cursor-pointer"
            title="Siguiente"
          >
            <ChevronRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* Current Date Display & Picker */}
        <div className="flex items-center gap-2">
          <label className="relative flex items-center cursor-pointer group">
            <input
              type="date"
              value={currentDate}
              onChange={(e) => e.target.value && onDateChange(e.target.value)}
              className="sr-only"
            />
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-300 bg-slate-200 group-hover:bg-blue-600 group-hover:border-blue-600 text-slate-900 group-hover:text-white text-xs font-extrabold transition-all shadow-2xs">
              <CalendarIcon className="w-3.5 h-3.5 text-blue-700 group-hover:text-white" />
              <span className="capitalize">{formatDateSpanishLong(currentDate) || formatDateSpanish(currentDate)}</span>
            </div>
          </label>
        </div>

        {/* Professional Filter */}
        {agendaMode !== 'staff' && staff && staff.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <select
                value={selectedStaffId}
                onChange={(e) => onStaffChange(e.target.value)}
                className="pl-7 pr-4 py-1.5 text-xs font-bold rounded-xl border-2 border-slate-300 bg-slate-200 hover:border-blue-600 focus:border-blue-700 text-slate-900 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="todos">Todos los profesionales</option>
                {staff
                  .filter((s) => s.active)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role}) · {s.branchId === 'ambas' ? 'Ambas' : s.branchId === 'sucursal_2' ? 'Suc. 2' : 'Suc. 1'}
                    </option>
                  ))}
              </select>
              <Users className="w-3.5 h-3.5 text-blue-700 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
            </div>
          </div>
        )}
      </div>

      {/* Mode Switcher & New Appointment CTA */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Mode Buttons */}
        <div className="flex items-center bg-slate-200 p-1 rounded-xl border border-slate-300">
          <button
            type="button"
            onClick={() => onModeChange('dia')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              agendaMode === 'dia'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-800 hover:bg-blue-600 hover:text-white'
            }`}
          >
            Día
          </button>
          <button
            type="button"
            onClick={() => onModeChange('semana')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              agendaMode === 'semana'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-800 hover:bg-blue-600 hover:text-white'
            }`}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => onModeChange('mes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              agendaMode === 'mes'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-800 hover:bg-blue-600 hover:text-white'
            }`}
          >
            Mes
          </button>
          <button
            type="button"
            onClick={() => onModeChange('staff')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              agendaMode === 'staff'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-800 hover:bg-blue-600 hover:text-white'
            }`}
          >
            Staff
          </button>
        </div>

        {/* New Appointment Button */}
        {onNewAppointment && (
          <button
            type="button"
            onClick={onNewAppointment}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-black rounded-xl transition-all shadow-sm hover:shadow-md shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Nuevo Turno</span>
          </button>
        )}
      </div>
    </div>
  );
};
