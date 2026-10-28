import React, { useMemo } from 'react';
import { Plus, Sparkles, User, Clock } from 'lucide-react';
import { Appointment } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, getStatusBadge } from '../../utils/formatters';
import { getTodayDateString } from '../../utils/initialData';

interface AgendaWeekViewProps {
  currentDate: string;
  selectedStaffId: string;
  onSelectAppointment: (appointment: Appointment) => void;
  onDayClick: (date: string) => void;
}

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function AgendaWeekView({
  currentDate,
  selectedStaffId,
  onSelectAppointment,
  onDayClick,
}: AgendaWeekViewProps) {
  const { appointments, staff, business } = useApp();
  const todayStr = getTodayDateString();

  const weekDays = useMemo(() => {
    const [y, m, d] = currentDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const currentDay = dateObj.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(dateObj);
    monday.setDate(dateObj.getDate() + distanceToMonday);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      days.push({
        dateStr: `${year}-${month}-${day}`,
        dayNumber: d.getDate(),
        dayName: WEEKDAYS[i],
      });
    }
    return days;
  }, [currentDate]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-100 min-h-[500px]">
        {weekDays.map((day) => {
          const isToday = day.dateStr === todayStr;

          const dayAppointments = appointments
            .filter((a) => {
              if (a.date !== day.dateStr) return false;
              if (selectedStaffId !== 'todos' && a.staffId !== selectedStaffId) return false;
              return true;
            })
            .sort((a, b) => a.time.localeCompare(b.time));

          return (
            <div key={day.dateStr} className="flex flex-col bg-white">
              <div
                className={`p-3 text-center border-b border-slate-100 transition-colors ${
                  isToday ? 'bg-blue-50/80' : 'bg-slate-50/50'
                }`}
              >
                <span className="text-[11px] font-bold text-[#0F172A] uppercase tracking-wider block">
                  {day.dayName}
                </span>
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-black mt-0.5 ${
                    isToday ? 'bg-[#1E3A8A] text-white shadow-xs' : 'text-[#0F172A]'
                  }`}
                >
                  {day.dayNumber}
                </span>
                <span className="text-[10px] text-slate-600 font-bold block mt-0.5">
                  {dayAppointments.length} turnos
                </span>
              </div>

              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[600px] bg-slate-50/20">
                {dayAppointments.length === 0 ? (
                  <div
                    onClick={() => onDayClick(day.dateStr)}
                    className="h-28 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 cursor-pointer flex flex-col items-center justify-center text-slate-600 hover:text-blue-700 transition-all text-xs group p-2 text-center"
                  >
                    <Plus className="w-4 h-4 mb-1 group-hover:scale-110 transition-transform stroke-[2.5]" />
                    <span className="font-bold">Sin turnos</span>
                    <span className="text-[10px] text-slate-600 font-semibold group-hover:text-blue-700">Toca para agendar</span>
                  </div>
                ) : (
                  dayAppointments.map((apt) => {
                    const status = getStatusBadge(apt.status);
                    const staffMember = staff.find((s) => s.id === apt.staffId);
                    const cardColor = apt.color || staffMember?.color || '#2563eb';

                    return (
                      <div
                        key={apt.id}
                        onClick={() => onSelectAppointment(apt)}
                        className={`p-2.5 rounded-xl border border-slate-200/90 bg-white hover:border-blue-500 hover:shadow-md cursor-pointer transition-all relative overflow-hidden group ${
                          apt.status === 'cancelado' ? 'opacity-50 line-through' : ''
                        }`}
                      >
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1.5"
                          style={{ backgroundColor: cardColor }}
                        />

                        <div className="pl-1.5 space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                              {apt.time} hs
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold border ${status.bg}`}>
                              {status.label}
                            </span>
                          </div>

                          <div className="font-bold text-xs text-slate-900 group-hover:text-blue-600 truncate flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: cardColor }}
                            />
                            <span className="truncate">{apt.clientName}</span>
                          </div>

                          <div className="text-[11px] text-slate-700 font-medium truncate flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-blue-600" />
                            <span>{apt.serviceName}</span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[10px]">
                            <span className="text-slate-700 font-bold truncate">{apt.staffName}</span>
                            <span className="font-extrabold text-slate-900">
                              {formatCurrency(apt.price, business?.currency)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-1.5 border-t border-slate-100 bg-white">
                <button
                  type="button"
                  onClick={() => onDayClick(day.dateStr)}
                  className="w-full py-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Agendar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
